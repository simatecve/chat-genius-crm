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

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { 
      chatId, 
      fileUrl,
      caption,
      mimeType,
      userId,
      conversationId,
      telegramBotId,
      isBot
    } = await req.json();

    console.log('[telegram-send-file] Sending file:', {
      chatId,
      fileUrl,
      mimeType,
      telegramBotId
    });

    // Obtener bot token
    const { data: bot, error: botError } = await supabase
      .from('telegram_bots')
      .select('bot_token, bot_name')
      .eq('id', telegramBotId)
      .single();

    if (botError || !bot) {
      console.error('[telegram-send-file] Bot not found:', telegramBotId);
      throw new Error('Telegram bot not found');
    }

    // Determinar el método apropiado según el tipo de archivo
    let telegramMethod = 'sendDocument';
    let fileField = 'document';
    
    if (mimeType) {
      if (mimeType.startsWith('image/')) {
        telegramMethod = 'sendPhoto';
        fileField = 'photo';
      } else if (mimeType.startsWith('audio/')) {
        telegramMethod = 'sendAudio';
        fileField = 'audio';
      } else if (mimeType.startsWith('video/')) {
        telegramMethod = 'sendVideo';
        fileField = 'video';
      } else if (mimeType === 'audio/ogg' || mimeType === 'audio/mpeg') {
        telegramMethod = 'sendVoice';
        fileField = 'voice';
      }
    }

    // Enviar archivo via Telegram API
    const telegramUrl = `https://api.telegram.org/bot${bot.bot_token}/${telegramMethod}`;
    const telegramPayload = {
      chat_id: chatId,
      [fileField]: fileUrl,
      ...(caption && { caption })
    };

    console.log('[telegram-send-file] Calling Telegram API:', telegramMethod);

    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(telegramPayload),
    });

    if (!telegramResponse.ok) {
      const errorText = await telegramResponse.text();
      console.error('[telegram-send-file] Telegram API error:', {
        status: telegramResponse.status,
        statusText: telegramResponse.statusText,
        body: errorText
      });
      throw new Error(`Telegram API error: ${telegramResponse.status} - ${errorText}`);
    }

    const telegramResult = await telegramResponse.json();
    console.log('[telegram-send-file] File sent successfully');

    // Determinar message_type basado en mimeType
    let messageType = 'document';
    if (mimeType) {
      if (mimeType.startsWith('image/')) messageType = 'image';
      else if (mimeType.startsWith('audio/')) messageType = 'audio';
      else if (mimeType.startsWith('video/')) messageType = 'video';
    }

    // Guardar mensaje en la base de datos
    const messageData = {
      conversation_id: conversationId,
      user_id: userId,
      content: caption || 'Archivo adjunto',
      direction: 'outbound',
      status: 'sent',
      message_type: messageType,
      file_url: fileUrl,
      is_bot: Boolean(isBot),
      created_at: new Date().toISOString(),
      metadata: {
        telegram_message_id: telegramResult.result?.message_id || null,
        sent_via: 'api',
        mime_type: mimeType
      }
    };

    const { data: savedMessage, error: dbError } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (dbError) {
      console.error('[telegram-send-file] Error saving message to database:', dbError);
    } else {
      console.log('[telegram-send-file] Message saved to database:', savedMessage.id);
      
      // Actualizar conversación
      await supabase
        .from('conversations')
        .update({
          last_message: caption || 'Archivo adjunto',
          last_message_time: new Date().toISOString(),
        })
        .eq('id', conversationId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'File sent successfully',
        telegramResult: telegramResult,
        savedMessage: savedMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[telegram-send-file] Error:', error);
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
