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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    console.log('[n8n-response] Received payload:', JSON.stringify(body));

    const { 
      conversation_id, 
      phone_number, 
      session_name,
      session_id,
      message, 
      is_bot = true,
      channel // 'whatsapp' | 'twilio'
    } = body;

    if (!message) {
      return new Response(JSON.stringify({ error: 'message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let conversation;
    let detectedChannel = channel;

    // Buscar conversación por ID o por phone_number + session
    if (conversation_id) {
      const { data, error } = await supabase
        .from('conversations')
        .select('*, twilio_connection_id, telegram_bot_id')
        .eq('id', conversation_id)
        .single();
      
      if (error) {
        console.error('[n8n-response] Error finding conversation by ID:', error);
        return new Response(JSON.stringify({ error: 'Conversation not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      conversation = data;
    } else if (phone_number && (session_name || session_id)) {
      // Buscar por teléfono y sesión
      let query = supabase
        .from('conversations')
        .select('*, twilio_connection_id, telegram_bot_id')
        .eq('phone_number', phone_number);
      
      if (session_id) {
        // Si tenemos session_id, buscar en whatsapp_number o twilio_connection_id
        query = query.or(`whatsapp_number.eq.${session_name},twilio_connection_id.eq.${session_id}`);
      } else if (session_name) {
        query = query.eq('whatsapp_number', session_name);
      }
      
      const { data, error } = await query.order('updated_at', { ascending: false }).limit(1).single();
      
      if (error) {
        console.error('[n8n-response] Error finding conversation:', error);
        return new Response(JSON.stringify({ error: 'Conversation not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      conversation = data;
    } else {
      return new Response(JSON.stringify({ error: 'conversation_id or (phone_number + session_name/session_id) required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[n8n-response] Found conversation:', conversation.id, 'channel:', conversation.channel_type);

    // Detectar canal si no se especificó
    if (!detectedChannel) {
      if (conversation.twilio_connection_id) {
        detectedChannel = 'twilio';
      } else if (conversation.channel_type === 'whatsapp') {
        detectedChannel = 'whatsapp';
      } else {
        detectedChannel = conversation.channel_type;
      }
    }

    console.log('[n8n-response] Detected channel:', detectedChannel);

    // Guardar mensaje en la base de datos
    const newMessage = {
      conversation_id: conversation.id,
      user_id: conversation.user_id,
      content: message,
      direction: 'outbound',
      status: 'pending',
      message_type: 'text',
      is_bot: is_bot,
      created_at: new Date().toISOString(),
      metadata: {
        source: 'n8n',
        channel: detectedChannel
      }
    };

    const { data: savedMessage, error: saveError } = await supabase
      .from('messages')
      .insert(newMessage)
      .select()
      .single();

    if (saveError) {
      console.error('[n8n-response] Error saving message:', saveError);
      return new Response(JSON.stringify({ error: 'Failed to save message' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[n8n-response] Message saved:', savedMessage.id);

    // Actualizar last_message de la conversación
    await supabase
      .from('conversations')
      .update({ 
        last_message: message.substring(0, 200),
        last_message_time: new Date().toISOString()
      })
      .eq('id', conversation.id);

    // Enviar mensaje al destinatario según el canal
    let sendResult;
    
    if (detectedChannel === 'twilio' && conversation.twilio_connection_id) {
      // Enviar vía Twilio
      console.log('[n8n-response] Sending via Twilio...');
      const { data, error } = await supabase.functions.invoke('twilio-send-message', {
        body: {
          connection_id: conversation.twilio_connection_id,
          to: conversation.phone_number,
          message: message
        }
      });
      
      if (error) {
        console.error('[n8n-response] Error sending via Twilio:', error);
        // Actualizar estado del mensaje a failed
        await supabase.from('messages').update({ status: 'failed' }).eq('id', savedMessage.id);
        return new Response(JSON.stringify({ error: 'Failed to send message via Twilio', details: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      sendResult = data;
      
    } else if (detectedChannel === 'whatsapp' && conversation.whatsapp_number) {
      // Enviar vía WAHA
      console.log('[n8n-response] Sending via WAHA...');
      const { data, error } = await supabase.functions.invoke('waha-send-message', {
        body: {
          session_name: conversation.whatsapp_number,
          phone_number: conversation.phone_number,
          message: message
        }
      });
      
      if (error) {
        console.error('[n8n-response] Error sending via WAHA:', error);
        // Actualizar estado del mensaje a failed
        await supabase.from('messages').update({ status: 'failed' }).eq('id', savedMessage.id);
        return new Response(JSON.stringify({ error: 'Failed to send message via WhatsApp', details: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      sendResult = data;
      
    } else {
      console.error('[n8n-response] Unsupported channel or missing connection:', detectedChannel);
      return new Response(JSON.stringify({ error: 'Unsupported channel or missing connection info' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Actualizar estado del mensaje a sent
    await supabase.from('messages').update({ status: 'sent' }).eq('id', savedMessage.id);

    console.log('[n8n-response] Message sent successfully');

    return new Response(JSON.stringify({
      success: true,
      message_id: savedMessage.id,
      conversation_id: conversation.id,
      channel: detectedChannel,
      send_result: sendResult
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[n8n-response] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: 'Internal server error', details: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
