import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webchatId, sessionId, message, attachmentUrl, attachmentType } = await req.json();

    if (!webchatId || !sessionId || (!message && !attachmentUrl)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get webchat config
    const { data: webchat, error: webchatError } = await supabase
      .from('web_chatbots')
      .select('*')
      .eq('id', webchatId)
      .eq('is_active', true)
      .single();

    if (webchatError || !webchat) {
      console.error('Webchat not found:', webchatError);
      return new Response(
        JSON.stringify({ error: 'Chatbot not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find or create conversation for this session
    let conversation = await getOrCreateConversation(supabase, webchat.user_id, sessionId, webchat.name);

    // Determine message type
    let messageType = 'text';
    if (attachmentUrl) {
      if (attachmentType?.startsWith('image/')) {
        messageType = 'image';
      } else if (attachmentType?.startsWith('video/')) {
        messageType = 'video';
      } else if (attachmentType?.startsWith('audio/')) {
        messageType = 'audio';
      } else {
        messageType = 'document';
      }
    }

    // Save incoming message
    const messageContent = message || (attachmentUrl ? `[Archivo adjunto: ${messageType}]` : '');
    
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      user_id: webchat.user_id,
      content: messageContent,
      direction: 'inbound',
      message_type: messageType,
      attachment_url: attachmentUrl || null
    });

    // Update conversation
    await supabase
      .from('conversations')
      .update({
        last_message: messageContent,
        last_message_time: new Date().toISOString(),
        unread_count: (conversation.unread_count || 0) + 1
      })
      .eq('id', conversation.id);

    console.log(`Webchat message saved for session ${sessionId}`);

    // Check if there's an AI agent assigned to this webchat (highest priority)
    const { data: aiAgent } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('web_chatbot_id', webchatId)
      .eq('is_active', true)
      .single();

    // Check webchat-specific AI settings (isolated from ia_default_settings)
    const { data: webchatAISettings } = await supabase
      .from('webchat_ai_settings')
      .select('*')
      .eq('user_id', webchat.user_id)
      .single();

    let botReply: string | null = null;

    // Process AI response: AI Agent takes priority, then webchat AI settings
    const shouldProcessAI = aiAgent || (webchatAISettings && webchatAISettings.is_enabled);
    
    if (shouldProcessAI) {
      try {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        
        if (LOVABLE_API_KEY) {
          // Get conversation history
          const { data: historyMessages } = await supabase
            .from('messages')
            .select('content, direction')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: true })
            .limit(20);

          const conversationHistory = (historyMessages || []).map(m => ({
            role: m.direction === 'inbound' ? 'user' : 'assistant',
            content: m.content
          }));

          // Build system prompt - AI Agent takes priority
          let systemPrompt = '';
          let model = 'google/gemini-2.5-flash';
          let maxTokens = 500;

          if (aiAgent) {
            systemPrompt = aiAgent.system_prompt;
            model = aiAgent.model || model;
            maxTokens = aiAgent.max_tokens || maxTokens;
            console.log(`Using AI Agent: ${aiAgent.name}`);
          } else if (webchatAISettings) {
            // Use webchat-specific settings with custom prompt
            systemPrompt = webchatAISettings.system_prompt || 'Eres un asistente virtual amigable.';
            model = webchatAISettings.model || model;
            maxTokens = webchatAISettings.max_tokens || maxTokens;
            
            // Append cashier and CBU info if available
            if (webchatAISettings.cashier_numbers) {
              systemPrompt += `\n\nNúmero de cajero para consultas: ${webchatAISettings.cashier_numbers}`;
            }
            if (webchatAISettings.cbu) {
              systemPrompt += `\nCBU para transferencias: ${webchatAISettings.cbu}`;
            }
            console.log('Using Webchat AI Settings');
          }

          console.log(`Calling AI with model: ${model}, prompt length: ${systemPrompt.length}`);

          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: model,
              messages: [
                { role: "system", content: systemPrompt },
                ...conversationHistory
              ],
              max_tokens: maxTokens,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            botReply = data.choices?.[0]?.message?.content;

            if (botReply) {
              // Save bot response
              await supabase.from('messages').insert({
                conversation_id: conversation.id,
                user_id: webchat.user_id,
                content: botReply,
                direction: 'outbound',
                message_type: 'text',
                is_bot: true
              });

              // Update conversation with bot reply
              await supabase
                .from('conversations')
                .update({
                  last_message: botReply,
                  last_message_time: new Date().toISOString()
                })
                .eq('id', conversation.id);

              console.log(`AI response saved for webchat session ${sessionId}`);
            }
          } else {
            const errorText = await response.text();
            console.error('AI Gateway error:', response.status, errorText);
          }
        } else {
          console.log('LOVABLE_API_KEY not configured');
        }
      } catch (aiError) {
        console.error('Error generating AI response:', aiError);
      }
    } else {
      console.log('No AI agent or webchat AI settings enabled for this webchat');
    }

    return new Response(
      JSON.stringify({ success: true, botReply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing webchat message:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getOrCreateConversation(supabase: any, userId: string, sessionId: string, chatbotName: string) {
  // Try to find existing conversation by session ID (stored in phone_number field)
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('phone_number', sessionId)
    .eq('channel_type', 'webchat')
    .single();

  if (existing) {
    return existing;
  }

  // Create new conversation
  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      phone_number: sessionId,
      channel_type: 'webchat',
      contact_name: `Visitante Web - ${chatbotName}`,
      status: 'active',
      unread_count: 0
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }

  return newConv;
}
