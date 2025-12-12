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
    const { webchatId, sessionId, message } = await req.json();

    if (!webchatId || !sessionId || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get webchat config with AI agent (using explicit FK to avoid ambiguous relationship)
    const { data: webchat, error: webchatError } = await supabase
      .from('web_chatbots')
      .select('*, ai_agents!web_chatbots_ai_agent_id_fkey(*)')
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

    // Save incoming message
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      user_id: webchat.user_id,
      content: message,
      direction: 'inbound',
      message_type: 'text'
    });

    // Update conversation
    await supabase
      .from('conversations')
      .update({
        last_message: message,
        last_message_time: new Date().toISOString(),
        unread_count: conversation.unread_count + 1
      })
      .eq('id', conversation.id);

    // Process with AI if agent is assigned
    let reply = webchat.welcome_message || '¡Gracias por tu mensaje! Te responderemos pronto.';

    if (webchat.ai_agent_id && webchat.ai_agents) {
      const agent = webchat.ai_agents;
      
      // Get conversation history for context
      const { data: history } = await supabase
        .from('messages')
        .select('content, direction')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true })
        .limit(20);

      const messagesForAI = (history || []).map(m => ({
        role: m.direction === 'inbound' ? 'user' : 'assistant',
        content: m.content
      }));

      // Call Lovable AI
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (LOVABLE_API_KEY) {
        try {
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: agent.model || 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: agent.system_prompt },
                ...messagesForAI
              ],
              max_tokens: agent.max_tokens || 500,
              temperature: agent.temperature || 0.7
            })
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            reply = aiData.choices?.[0]?.message?.content || reply;
          } else {
            console.error('AI API error:', await aiResponse.text());
          }
        } catch (aiError) {
          console.error('AI request failed:', aiError);
        }
      }
    }

    // Save bot response
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      user_id: webchat.user_id,
      content: reply,
      direction: 'outbound',
      is_bot: true,
      message_type: 'text'
    });

    // Update conversation with bot reply
    await supabase
      .from('conversations')
      .update({
        last_message: reply,
        last_message_time: new Date().toISOString()
      })
      .eq('id', conversation.id);

    console.log(`Webchat message processed for session ${sessionId}`);

    return new Response(
      JSON.stringify({ reply }),
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
