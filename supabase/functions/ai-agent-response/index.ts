import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { conversationId, userId, messageContent, sessionName } = await req.json();

    console.log('AI Agent processing:', { conversationId, userId, messageContent });

    // 1. Verificar si hay un agente de IA activo para este usuario
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (agentError || !agent) {
      console.log('No active AI agent found for user:', userId);
      return new Response(
        JSON.stringify({ 
          processed: false, 
          reason: 'No active agent' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log('Active agent found:', agent.name);

    // 2. Obtener historial de mensajes de la conversación (últimos 10)
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('content, direction, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (messagesError) {
      console.error('Error fetching conversation history:', messagesError);
    }

    // Construir historial de conversación para el contexto
    const conversationHistory = messages
      ?.reverse()
      .map(msg => ({
        role: msg.direction === 'inbound' ? 'user' : 'assistant',
        content: msg.content
      })) || [];

    console.log('Conversation history length:', conversationHistory.length);

    // 3. Llamar a Lovable AI con el agente configurado
    const aiMessages = [
      {
        role: 'system',
        content: agent.system_prompt
      },
      ...conversationHistory
    ];

    console.log('Calling Lovable AI with model:', agent.model || 'google/gemini-2.5-flash');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: agent.model || 'google/gemini-2.5-flash',
        messages: aiMessages,
        temperature: agent.temperature || 0.7,
        max_tokens: agent.max_tokens || 500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Payment required. Please add credits to your Lovable AI workspace.');
      }
      
      throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
    }

    const aiResult = await aiResponse.json();
    const aiResponseText = aiResult.choices?.[0]?.message?.content;

    if (!aiResponseText) {
      throw new Error('No response from AI');
    }

    console.log('AI response received:', aiResponseText.substring(0, 100));

    // 4. Obtener datos de la conversación para enviar respuesta
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('phone_number')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      throw new Error('Conversation not found');
    }

    // 5. Enviar respuesta automática a través de WhatsApp
    const { data: sendResult, error: sendError } = await supabase.functions.invoke('waha-send-message', {
      body: {
        sessionName: sessionName,
        phoneNumber: conversation.phone_number,
        message: aiResponseText,
        userId: userId,
        conversationId: conversationId
      }
    });

    if (sendError) {
      console.error('Error sending message:', sendError);
      throw new Error('Failed to send AI response');
    }

    console.log('AI response sent successfully');

    return new Response(
      JSON.stringify({
        success: true,
        processed: true,
        agentName: agent.name,
        responseLength: aiResponseText.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in ai-agent-response:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
