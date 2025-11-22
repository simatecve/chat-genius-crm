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
      conversationId
    } = await req.json();

    console.log('Sending message via WAHA:', {
      sessionName,
      phoneNumber,
      messagePreview: message.substring(0, 50)
    });

    // Formatear número de teléfono para WAHA
    // Formato: número@c.us (sin el + y sin espacios)
    const formattedPhone = phoneNumber.replace(/[^0-9]/g, '');
    const chatId = `${formattedPhone}@c.us`;

    console.log('Formatted chatId:', chatId);

    // Enviar mensaje a WAHA
    const wahaUrl = `${WAHA_BASE_URL}/api/sendText`;
    const wahaPayload = {
      session: sessionName,
      chatId: chatId,
      text: message
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
    console.log('WAHA response status:', wahaResult.status);
    console.log('WAHA message ID:', wahaResult.id);

    // Guardar mensaje en la base de datos
    const messageData = {
      conversation_id: conversationId,
      user_id: userId,
      content: message,
      direction: 'outbound',
      status: wahaResult.status === 'PENDING' ? 'sent' : 'delivered',
      message_type: 'text',
      is_bot: false,
      created_at: new Date().toISOString(),
      metadata: {
        waha_id: wahaResult.id || null,
        waha_status: wahaResult.status || null,
        waha_timestamp: wahaResult.messageTimestamp || null,
        sent_via: 'api'
      }
    };

    const { data: savedMessage, error: dbError } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (dbError) {
      console.error('Error saving message to database:', dbError);
      // No lanzamos error aquí porque el mensaje ya se envió exitosamente
    } else {
      console.log('Message saved to database:', savedMessage.id);
      
      // Actualizar última fecha de mensaje en la conversación
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
        savedMessage: savedMessage
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
