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
      message, 
      userId,
      conversationId,
      telegramBotId,
      isBot
    } = await req.json();

    console.log('[telegram-send-message] Sending message:', {
      chatId,
      messagePreview: message.substring(0, 50),
      telegramBotId
    });

    // Obtener bot token
    const { data: bot, error: botError } = await supabase
      .from('telegram_bots')
      .select('bot_token, bot_name')
      .eq('id', telegramBotId)
      .single();

    if (botError || !bot) {
      console.error('[telegram-send-message] Bot not found:', telegramBotId);
      throw new Error('Telegram bot not found');
    }

    // Enviar mensaje via Telegram API
    const telegramUrl = `https://api.telegram.org/bot${bot.bot_token}/sendMessage`;
    const telegramPayload = {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    };

    console.log('[telegram-send-message] Calling Telegram API:', telegramUrl);

    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(telegramPayload),
    });

    if (!telegramResponse.ok) {
      const errorText = await telegramResponse.text();
      console.error('[telegram-send-message] Telegram API error:', {
        status: telegramResponse.status,
        statusText: telegramResponse.statusText,
        body: errorText
      });
      throw new Error(`Telegram API error: ${telegramResponse.status} - ${errorText}`);
    }

    const telegramResult = await telegramResponse.json();
    console.log('[telegram-send-message] Message sent successfully');

    // Guardar mensaje en la base de datos
    const messageData = {
      conversation_id: conversationId,
      user_id: userId,
      content: message,
      direction: 'outbound',
      status: 'sent',
      message_type: 'text',
      is_bot: Boolean(isBot),
      created_at: new Date().toISOString(),
      metadata: {
        telegram_message_id: telegramResult.result?.message_id || null,
        sent_via: 'api'
      }
    };

    const { data: savedMessage, error: dbError } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (dbError) {
      console.error('[telegram-send-message] Error saving message to database:', dbError);
    } else {
      console.log('[telegram-send-message] Message saved to database:', savedMessage.id);
      
      // Actualizar conversación
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
        telegramResult: telegramResult,
        savedMessage: savedMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[telegram-send-message] Error:', error);
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
