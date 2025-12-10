import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  twilioConnectionId: string;
  phoneNumber: string;
  message?: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  userId: string;
  conversationId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      twilioConnectionId,
      phoneNumber,
      message,
      fileUrl,
      fileName,
      mimeType,
      userId,
      conversationId
    }: RequestBody = await req.json();

    console.log('[twilio-send-file] Received request:', {
      twilioConnectionId,
      phoneNumber,
      fileName,
      mimeType,
      hasMessage: !!message
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Twilio connection details
    const { data: connection, error: connectionError } = await supabase
      .from('twilio_connections')
      .select('account_sid, auth_token, phone_number')
      .eq('id', twilioConnectionId)
      .single();

    if (connectionError || !connection) {
      throw new Error('Twilio connection not found');
    }

    console.log('[twilio-send-file] Found Twilio connection');

    // Determine message type
    let messageType = 'document';
    if (mimeType.startsWith('image/')) {
      messageType = 'image';
    } else if (mimeType.startsWith('video/')) {
      messageType = 'video';
    } else if (mimeType.startsWith('audio/')) {
      messageType = 'audio';
    }

    // Format phone numbers for Twilio WhatsApp - MUST include + prefix
    const formattedFrom = `whatsapp:+${connection.phone_number.replace(/[^0-9]/g, '')}`;
    const cleanPhoneNumber = phoneNumber.replace(/[^0-9]/g, '');
    const formattedTo = `whatsapp:+${cleanPhoneNumber}`;
    
    console.log('[twilio-send-file] Formatted numbers:', { from: formattedFrom, to: formattedTo });

    // Prepare Twilio API request
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${connection.account_sid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('From', formattedFrom);
    formData.append('To', formattedTo);
    formData.append('MediaUrl', fileUrl);
    if (message) {
      formData.append('Body', message);
    }

    console.log('[twilio-send-file] Sending to Twilio API');

    // Send message via Twilio
    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${connection.account_sid}:${connection.auth_token}`),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text();
      console.error('[twilio-send-file] Twilio error:', errorText);
      throw new Error(`Twilio error: ${errorText}`);
    }

    const twilioResult = await twilioResponse.json();
    console.log('[twilio-send-file] Twilio response:', twilioResult);

    // Save message to database
    const now = new Date().toISOString();
    const { data: savedMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        content: message || `📎 ${fileName}`,
        direction: 'outbound',
        message_type: messageType,
        file_url: fileUrl,
        attachment_url: fileUrl,
        status: twilioResult.status || 'sent',
        is_bot: false,
        created_at: now,
        metadata: {
          twilio_sid: twilioResult.sid,
          file_name: fileName,
          mime_type: mimeType,
          twilio_status: twilioResult.status
        }
      })
      .select()
      .single();

    if (messageError) {
      console.error('[twilio-send-file] Error saving message:', messageError);
      throw messageError;
    }

    // Update conversation
    await supabase
      .from('conversations')
      .update({
        last_message: `📎 ${fileName}`,
        last_message_time: now,
        updated_at: now
      })
      .eq('id', conversationId);

    console.log('[twilio-send-file] Message saved successfully');

    return new Response(
      JSON.stringify({
        success: true,
        savedMessage,
        twilioResponse: twilioResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[twilio-send-file] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});