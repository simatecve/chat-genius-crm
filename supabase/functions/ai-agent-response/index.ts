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

    // 2. Verificar configuración global del bot para el usuario
    const { data: botSettings } = await supabase
      .from('user_bot_settings')
      .select('bot_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    if (botSettings && !botSettings.bot_enabled) {
      console.log('Bot globally disabled for user:', userId);
      return new Response(
        JSON.stringify({ 
          processed: false, 
          reason: 'Bot disabled' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // 3. Verificar si el contacto específico tiene el bot bloqueado
    const { data: conversation } = await supabase
      .from('conversations')
      .select('phone_number, channel_type, telegram_bot_id, twilio_connection_id')
      .eq('id', conversationId)
      .single();

    if (conversation) {
      const { data: blockedContact } = await supabase
        .from('contacto_bloqueado_bot')
        .select('id')
        .eq('user_id', userId)
        .eq('numero', conversation.phone_number)
        .maybeSingle();

      if (blockedContact) {
        console.log('Bot blocked for contact:', conversation.phone_number);
        return new Response(
          JSON.stringify({ 
            processed: false, 
            reason: 'Bot blocked for this contact' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
    }

    // 4. Obtener historial de mensajes de la conversación (últimos 10)
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

    // 5. Llamar a Lovable AI con el agente configurado
    const aiMessages = [
      {
        role: 'system',
        content: agent.system_prompt
      },
      ...conversationHistory
    ];

    console.log('Calling Lovable AI with model:', agent.model || 'google/gemini-2.5-flash');

    let aiResponseText: string | null = null;
    if (LOVABLE_API_KEY) {
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

      if (aiResponse.ok) {
        const aiResult = await aiResponse.json();
        aiResponseText = aiResult.choices?.[0]?.message?.content || null;
      } else {
        const errorText = await aiResponse.text();
        console.error('Lovable AI error:', errorText);
      }
    }

    if (!aiResponseText) {
      const lastUserMessage = conversationHistory.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
      aiResponseText = lastUserMessage ? `Gracias por tu mensaje: "${lastUserMessage}".
Nuestro equipo te responderá en breve.` : 'Gracias por tu mensaje. Nuestro equipo te responderá en breve.';
    }

    console.log('AI response prepared:', aiResponseText.substring(0, 100));

    // 6. Enviar respuesta automática según el canal
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const channelType = conversation.channel_type || 'whatsapp';

    if (channelType === 'telegram' && conversation.telegram_bot_id) {
      await supabase.functions.invoke('telegram-send-message', {
        body: {
          chatId: conversation.phone_number,
          message: aiResponseText,
          userId,
          conversationId,
          telegramBotId: conversation.telegram_bot_id,
          isBot: true
        }
      });
    } else if (channelType === 'twilio' && conversation.twilio_connection_id) {
      await supabase.functions.invoke('twilio-send-message', {
        body: {
          twilioConnectionId: conversation.twilio_connection_id,
          phoneNumber: conversation.phone_number,
          message: aiResponseText,
          userId,
          conversationId,
          isBot: true
        }
      });
    } else {
      await supabase.functions.invoke('waha-send-message', {
        body: {
          sessionName,
          phoneNumber: conversation.phone_number,
          message: aiResponseText,
          userId,
          conversationId,
          isBot: true
        }
      });
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
