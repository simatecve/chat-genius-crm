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
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { conversationId, userId, messageContent, phoneNumber, twilioConnectionId } = await req.json();

    console.log('Processing AI agent response for Twilio conversation:', conversationId);

    // 1. Verificar si hay un agente de IA activo para Twilio
    const { data: aiAgent, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .or('channel_type.eq.twilio,channel_type.eq.all')
      .eq('twilio_connection_id', twilioConnectionId)
      .single();

    if (agentError || !aiAgent) {
      console.log('No active AI agent found for this Twilio connection');
      return new Response(
        JSON.stringify({ success: true, message: 'No AI agent configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found active AI agent:', aiAgent.name);

    // 2. Verificar configuración global del bot
    const { data: botSettings } = await supabase
      .from('user_bot_settings')
      .select('bot_enabled')
      .eq('user_id', userId)
      .single();

    if (!botSettings?.bot_enabled) {
      console.log('Bot globally disabled for this user');
      return new Response(
        JSON.stringify({ success: true, message: 'Bot disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Verificar si el contacto tiene el bot bloqueado
    const { data: blockedContact } = await supabase
      .from('contacto_bloqueado_bot')
      .select('id')
      .eq('user_id', userId)
      .eq('numero', phoneNumber)
      .single();

    if (blockedContact) {
      console.log('Bot blocked for this contact');
      return new Response(
        JSON.stringify({ success: true, message: 'Bot blocked for contact' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Obtener historial de conversación (últimos 10 mensajes)
    const { data: messages } = await supabase
      .from('messages')
      .select('content, direction, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    const conversationHistory = (messages || [])
      .reverse()
      .map(msg => ({
        role: msg.direction === 'inbound' ? 'user' : 'assistant',
        content: msg.content
      }));

    // 5. Llamar a Lovable AI
    console.log('Calling Lovable AI...');
    
    const aiMessages = [
      { 
        role: 'system', 
        content: aiAgent.system_prompt 
      },
      ...conversationHistory,
      { 
        role: 'user', 
        content: messageContent 
      }
    ];

    const aiResponse = await fetch('https://api.lovable.app/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiAgent.model || 'gpt-4o-mini',
        messages: aiMessages,
        temperature: aiAgent.temperature || 0.7,
        max_tokens: aiAgent.max_tokens || 500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const aiResponseText = aiResult.choices?.[0]?.message?.content || 'Lo siento, no pude generar una respuesta.';

    console.log('AI response generated:', aiResponseText.substring(0, 100));

    // 6. Enviar respuesta via Twilio
    const { data: sendResult, error: sendError } = await supabase.functions.invoke('twilio-send-message', {
      body: {
        twilioConnectionId,
        phoneNumber,
        message: aiResponseText,
        userId,
        conversationId,
        isBot: true
      }
    });

    if (sendError) {
      console.error('Error sending AI response via Twilio:', sendError);
      throw sendError;
    }

    console.log('AI response sent successfully via Twilio');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'AI response sent',
        response: aiResponseText
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in twilio-ai-agent-response:', error);
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
