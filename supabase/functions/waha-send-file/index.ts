import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  sessionName: string;
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
      sessionName,
      phoneNumber,
      message,
      fileUrl,
      fileName,
      mimeType,
      userId,
      conversationId
    }: RequestBody = await req.json();

    console.log('[waha-send-file] Received request:', {
      sessionName,
      phoneNumber,
      fileName,
      mimeType,
      hasMessage: !!message
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine the correct WAHA endpoint based on MIME type
    let endpoint = '/api/sendFile';
    let messageType = 'document';

    if (mimeType.startsWith('image/')) {
      endpoint = '/api/sendImage';
      messageType = 'image';
    } else if (mimeType.startsWith('video/')) {
      endpoint = '/api/sendVideo';
      messageType = 'video';
    } else if (mimeType.startsWith('audio/')) {
      endpoint = '/api/sendVoice';
      messageType = 'audio';
    }

    console.log('[waha-send-file] Using endpoint:', endpoint, 'messageType:', messageType);

    // Format phone number for WhatsApp
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const formattedPhone = `${cleanPhone}@c.us`;

    // Get WAHA configuration
    const wahaBaseUrl = Deno.env.get('WAHA_BASE_URL');
    const wahaApiKey = Deno.env.get('WAHA_API_KEY');

    if (!wahaBaseUrl || !wahaApiKey) {
      throw new Error('WAHA configuration not found');
    }

    // Prepare payload for WAHA
    const wahaPayload = {
      session: sessionName,
      chatId: formattedPhone,
      file: {
        url: fileUrl,
        filename: fileName
      },
      caption: message || ''
    };

    console.log('[waha-send-file] Sending to WAHA:', { endpoint, session: sessionName });

    // Send file via WAHA
    const wahaResponse = await fetch(`${wahaBaseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': wahaApiKey
      },
      body: JSON.stringify(wahaPayload)
    });

    if (!wahaResponse.ok) {
      const errorText = await wahaResponse.text();
      console.error('[waha-send-file] WAHA error:', errorText);
      throw new Error(`WAHA error: ${errorText}`);
    }

    const wahaResult = await wahaResponse.json();
    console.log('[waha-send-file] WAHA response:', wahaResult);

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
        status: 'sent',
        is_bot: false,
        created_at: now,
        metadata: {
          waha_id: wahaResult.id || null,
          file_name: fileName,
          mime_type: mimeType,
          file_size: wahaResult.size || null
        }
      })
      .select()
      .single();

    if (messageError) {
      console.error('[waha-send-file] Error saving message:', messageError);
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

    console.log('[waha-send-file] Message saved successfully');

    return new Response(
      JSON.stringify({
        success: true,
        savedMessage,
        wahaResponse: wahaResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[waha-send-file] Error:', error);
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