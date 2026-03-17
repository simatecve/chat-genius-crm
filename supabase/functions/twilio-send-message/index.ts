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

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const requestBody = await req.json();
    
    // Accept both 'phoneNumber' and 'toNumber' for backwards compatibility
    const { 
      twilioConnectionId, 
      phoneNumber: phoneNumberField,
      toNumber,  // Legacy field name
      message, 
      userId,
      conversationId,
      isBot
    } = requestBody;
    
    // Use phoneNumber if provided, fallback to toNumber
    const phoneNumber = phoneNumberField || toNumber;
    
    // Validate required fields
    if (!twilioConnectionId) {
      console.error('Missing twilioConnectionId');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing twilioConnectionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!phoneNumber) {
      console.error('Missing phoneNumber/toNumber');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing phoneNumber' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!message) {
      console.error('Missing message');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sending message via Twilio:', {
      twilioConnectionId,
      phoneNumber,
      messagePreview: message.substring(0, 50)
    });

    // Obtener credenciales de la conexión Twilio
    const { data: connection, error: connError } = await supabase
      .from('twilio_connections')
      .select('account_sid, auth_token, phone_number')
      .eq('id', twilioConnectionId)
      .single();

    if (connError || !connection) {
      throw new Error('Twilio connection not found');
    }

    console.log('Using Twilio connection:', connection.phone_number);

    // Formatear números para Twilio WhatsApp
    const formattedFrom = `whatsapp:+${connection.phone_number}`;
    const formattedTo = phoneNumber.includes('whatsapp:') 
      ? phoneNumber 
      : `whatsapp:+${phoneNumber.replace(/[^0-9]/g, '')}`;

    console.log('Formatted numbers:', { from: formattedFrom, to: formattedTo });

    // Enviar mensaje via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${connection.account_sid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('From', formattedFrom);
    formData.append('To', formattedTo);
    formData.append('Body', message);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${connection.account_sid}:${connection.auth_token}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text();
      console.error('Twilio API error:', {
        status: twilioResponse.status,
        statusText: twilioResponse.statusText,
        body: errorText
      });
      throw new Error(`Twilio API error: ${twilioResponse.status} - ${errorText}`);
    }

    const twilioResult = await twilioResponse.json();
    console.log('Message sent via Twilio:', twilioResult);

    // Guardar mensaje en la base de datos
    const messageData = {
      conversation_id: conversationId,
      user_id: userId,
      content: message,
      direction: 'outbound',
      status: twilioResult.status || 'sent',
      message_type: 'text',
      is_bot: Boolean(isBot),
      created_at: new Date().toISOString(),
      metadata: {
        twilio_message_id: twilioResult.sid || null,
        twilio_status: twilioResult.status || null,
        twilio_price: twilioResult.price || null,
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
      return new Response(
        JSON.stringify({
          success: false,
          error: `Message sent via Twilio but failed to save in database: ${dbError.message}`,
          twilioResult: twilioResult
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    console.log('Message saved to database:', savedMessage.id);
    
    // Actualizar última fecha de mensaje en la conversación
    await supabase
      .from('conversations')
      .update({
        last_message: message,
        last_message_time: new Date().toISOString(),
      })
      .eq('id', conversationId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Message sent successfully',
        twilioResult: twilioResult,
        savedMessage: savedMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in twilio-send-message:', error);
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
