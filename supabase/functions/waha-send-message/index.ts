import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Función para esperar un tiempo determinado
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Función para obtener delay aleatorio
function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WAHA_BASE_URL = Deno.env.get('WAHA_BASE_URL');
    const WAHA_API_KEY = Deno.env.get('WAHA_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!WAHA_BASE_URL || !WAHA_API_KEY) {
      throw new Error('WAHA configuration missing');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { 
      sessionName, 
      phoneNumber, 
      message, 
      userId,
      conversationId,
      isBot,
      // Nuevos parámetros de humanización
      humanizationDelay,
      enableTypingIndicator
    } = await req.json();

    console.log('Sending message via WAHA:', {
      sessionName,
      phoneNumber,
      messagePreview: message.substring(0, 50),
      humanizationDelay,
      enableTypingIndicator
    });

    // Formatear número de teléfono para WAHA
    const formattedPhone = phoneNumber.replace(/[^0-9]/g, '');
    
    let chatId: string;
    if (phoneNumber.includes('@lid') || phoneNumber.includes('@newsletter')) {
      chatId = phoneNumber;
    } else if (phoneNumber.includes('@c.us')) {
      chatId = phoneNumber;
    } else {
      chatId = `${formattedPhone}@c.us`;
    }

    console.log('Formatted chatId:', chatId);

    // ============= HUMANIZACIÓN: DELAY ANTES DE ENVIAR =============
    
    // Obtener configuración de humanización si no viene en el request
    let delayMs = humanizationDelay;
    let showTyping = enableTypingIndicator;
    
    if (isBot && (delayMs === undefined || showTyping === undefined)) {
      try {
        const { data: humanSettings } = await supabase
          .from('ia_humanization_settings')
          .select('*')
          .eq('id', 1)
          .single();
        
        if (humanSettings) {
          if (delayMs === undefined) {
            delayMs = getRandomDelay(
              humanSettings.min_response_delay_ms || 2000,
              humanSettings.max_response_delay_ms || 6000
            );
          }
          if (showTyping === undefined) {
            showTyping = humanSettings.enable_typing_indicator ?? true;
          }
        }
      } catch (e) {
        console.log('[waha-send-message] Could not fetch humanization settings, using defaults');
        delayMs = delayMs ?? getRandomDelay(2000, 5000);
        showTyping = showTyping ?? true;
      }
    }

    // Solo aplicar delay y typing para mensajes del bot
    if (isBot && delayMs && delayMs > 0) {
      console.log(`[waha-send-message] Applying humanization delay: ${delayMs}ms, typing: ${showTyping}`);
      
      // Mostrar indicador de "escribiendo..." si está habilitado
      if (showTyping) {
        try {
          const typingUrl = `${WAHA_BASE_URL}/api/startTyping`;
          await fetch(typingUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Api-Key': WAHA_API_KEY,
            },
            body: JSON.stringify({
              chatId: chatId,
              session: sessionName
            }),
          });
          console.log('[waha-send-message] Started typing indicator');
        } catch (typingError) {
          console.log('[waha-send-message] Could not start typing indicator:', typingError);
        }
      }
      
      // Esperar el delay
      await sleep(delayMs);
      
      // Detener indicador de escribiendo
      if (showTyping) {
        try {
          const stopTypingUrl = `${WAHA_BASE_URL}/api/stopTyping`;
          await fetch(stopTypingUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Api-Key': WAHA_API_KEY,
            },
            body: JSON.stringify({
              chatId: chatId,
              session: sessionName
            }),
          });
        } catch (typingError) {
          console.log('[waha-send-message] Could not stop typing indicator');
        }
      }
    }

    // Enviar mensaje a WAHA
    const wahaUrl = `${WAHA_BASE_URL}/api/sendText`;
    const wahaPayload = {
      chatId: chatId,
      text: message,
      session: sessionName,
      linkPreview: true,
      linkPreviewHighQuality: false,
      reply_to: null
    };

    console.log('WAHA request:', { url: wahaUrl, payload: wahaPayload });

    const wahaResponse = await fetch(wahaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': WAHA_API_KEY,
      },
      body: JSON.stringify(wahaPayload),
    });

    if (!wahaResponse.ok) {
      const errorText = await wahaResponse.text();
      console.error('WAHA API error:', {
        status: wahaResponse.status,
        statusText: wahaResponse.statusText,
        body: errorText
      });
      throw new Error(`WAHA API error: ${wahaResponse.status} - ${errorText}`);
    }

    const wahaResult = await wahaResponse.json();
    console.log('Message sent via WAHA:', wahaResult);

    // Guardar mensaje en la base de datos
    const messageData = {
      conversation_id: conversationId,
      user_id: userId,
      content: message,
      direction: 'outbound',
      status: wahaResult.status === 'PENDING' ? 'sent' : 'delivered',
      message_type: 'text',
      is_bot: Boolean(isBot),
      created_at: new Date().toISOString(),
      metadata: {
        waha_id: wahaResult.id || null,
        waha_status: wahaResult.status || null,
        waha_timestamp: wahaResult.messageTimestamp || null,
        sent_via: 'api',
        humanization_delay_applied: isBot ? delayMs : null
      }
    };

    const { data: savedMessage, error: dbError } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (dbError) {
      console.error('Error saving message to database:', dbError);
    } else {
      console.log('Message saved to database:', savedMessage.id);
      
      await supabase
        .from('conversations')
        .update({
          last_message: message,
          last_message_time: new Date().toISOString(),
        })
        .eq('id', conversationId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Message sent successfully',
        wahaResult: wahaResult,
        savedMessage: savedMessage,
        humanizationApplied: isBot ? { delayMs, showTyping } : null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in waha-send-message:', error);
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
