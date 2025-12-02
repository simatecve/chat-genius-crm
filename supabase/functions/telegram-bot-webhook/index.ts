import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WEBHOOK_URL = 'https://n8n2025.nocodeveloper.site/webhook/guardar_contacto';

// Enviar datos al webhook externo
async function sendToExternalWebhook(data: any) {
  try {
    console.log('Sending to external webhook:', WEBHOOK_URL);
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      console.error('Webhook response not OK:', response.status);
    } else {
      console.log('Webhook sent successfully');
    }
  } catch (error) {
    console.error('Error sending to webhook:', error);
  }
}

// Obtener user_id desde el bot_id
async function getUserIdFromBot(supabase: any, botId: number): Promise<string | null> {
  const { data, error } = await supabase
    .from('telegram_bots')
    .select('user_id, id')
    .eq('bot_id', botId)
    .single();

  if (error) {
    console.error('Error getting user_id from bot:', error);
    return null;
  }

  return data?.user_id || null;
}

// Obtener telegram_bot_id desde el bot_id
async function getTelegramBotId(supabase: any, botId: number): Promise<string | null> {
  const { data, error } = await supabase
    .from('telegram_bots')
    .select('id')
    .eq('bot_id', botId)
    .single();

  if (error) {
    console.error('Error getting telegram_bot_id:', error);
    return null;
  }

  return data?.id || null;
}

// Obtener columna por defecto
async function getDefaultColumn(supabase: any, userId: string, telegramBotId: string): Promise<string | null> {
  // Primero intentar obtener la columna configurada en el bot de Telegram
  const { data: bot, error: botError } = await supabase
    .from('telegram_bots')
    .select('default_column_id')
    .eq('id', telegramBotId)
    .eq('user_id', userId)
    .single();

  if (!botError && bot?.default_column_id) {
    console.log('Using default column from bot:', bot.default_column_id);
    return bot.default_column_id;
  }

  // Si no, buscar la columna marcada como default
  let { data, error } = await supabase
    .from('lead_columns')
    .select('id')
    .eq('user_id', userId)
    .eq('is_default', true)
    .order('position', { ascending: true })
    .limit(1)
    .single();

  if (error || !data) {
    const result = await supabase
      .from('lead_columns')
      .select('id')
      .eq('user_id', userId)
      .order('position', { ascending: true })
      .limit(1)
      .single();

    data = result.data;
    error = result.error;
  }

  if (error) {
    console.error('Error getting default column:', error);
    return null;
  }

  return data?.id || null;
}

// Obtener siguiente posición en una columna
async function getNextPosition(supabase: any, columnId: string): Promise<number> {
  const { data, error } = await supabase
    .from('leads')
    .select('position')
    .eq('column_id', columnId)
    .order('position', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return 0;
  }

  return (data.position || 0) + 1;
}

// Buscar o crear conversación
async function getOrCreateConversation(
  supabase: any,
  userId: string,
  telegramBotId: string,
  chatId: string,
  userName: string | null,
  messageContent: string,
  messageTimestamp: number
) {
  // Buscar conversación existente por telegram_bot_id y phone_number (usando chatId)
  let { data: conversation, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('telegram_bot_id', telegramBotId)
    .eq('phone_number', chatId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error searching conversation:', error);
    return null;
  }

  if (!conversation) {
    // Crear nueva conversación
    const newConversation = {
      user_id: userId,
      telegram_bot_id: telegramBotId,
      phone_number: chatId,
      contact_name: userName,
      pushname: userName,
      last_message: messageContent,
      last_message_time: new Date(messageTimestamp * 1000).toISOString(),
      unread_count: 1,
      status: 'active',
      channel_type: 'telegram',
    };

    const { data: created, error: createError } = await supabase
      .from('conversations')
      .insert(newConversation)
      .select()
      .single();

    if (createError) {
      console.error('Error creating conversation:', createError);
      return null;
    }

    console.log('New Telegram conversation created:', created.id);
    return created;
  } else {
    // Actualizar conversación existente
    const updateData: any = {
      last_message: messageContent,
      last_message_time: new Date(messageTimestamp * 1000).toISOString(),
      contact_name: userName || conversation.contact_name,
      pushname: userName || conversation.pushname,
      unread_count: conversation.unread_count + 1,
    };
    
    const { data: updated, error: updateError } = await supabase
      .from('conversations')
      .update(updateData)
      .eq('id', conversation.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating conversation:', updateError);
    }

    return updated || conversation;
  }
}

// Guardar mensaje en la base de datos
async function saveMessage(
  supabase: any,
  conversationId: string,
  userId: string,
  messageData: any,
  mediaUrl: string | null = null,
  mediaType: string = 'text'
) {
  const message = {
    conversation_id: conversationId,
    user_id: userId,
    content: messageData.text || messageData.caption || '',
    direction: 'inbound',
    status: 'delivered',
    message_type: mediaType,
    is_bot: false,
    created_at: new Date(messageData.date * 1000).toISOString(),
    file_url: mediaUrl,
    attachment_url: mediaUrl,
    metadata: {
      telegram_message_id: messageData.message_id,
      telegram_chat_id: messageData.chat?.id,
      telegram_from_id: messageData.from?.id,
      telegram_from_username: messageData.from?.username,
    },
  };

  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single();

  if (error) {
    console.error('Error saving message:', error);
    return null;
  }

  console.log('Telegram message saved:', data.id);
  return data;
}

// Guardar o actualizar contacto en la tabla contacts
async function saveOrUpdateContact(
  supabase: any,
  userId: string,
  chatId: string,
  userName: string | null
) {
  // Buscar contacto existente
  let { data: contact, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', userId)
    .eq('phone_number', chatId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error searching contact:', error);
    return null;
  }

  if (!contact) {
    // Crear nuevo contacto
    const newContact = {
      user_id: userId,
      phone_number: chatId,
      name: userName || `Telegram ${chatId}`,
      first_name: userName,
      origin: 'telegram_bot',
    };

    const { data: created, error: createError } = await supabase
      .from('contacts')
      .insert(newContact)
      .select()
      .single();

    if (createError) {
      console.error('Error creating contact:', createError);
      return null;
    }

    console.log('New Telegram contact created:', created.id);
    return created;
  } else {
    // Actualizar nombre si cambió
    if (userName && userName !== contact.name) {
      await supabase
        .from('contacts')
        .update({ name: userName, first_name: userName })
        .eq('id', contact.id);
      console.log('Telegram contact updated:', contact.id);
    }
  }

  return contact;
}

// Buscar o crear lead
async function getOrCreateLead(
  supabase: any,
  userId: string,
  chatId: string,
  userName: string | null,
  telegramBotId: string
) {
  // Buscar lead existente por chatId (como phone)
  let { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .eq('phone', chatId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error searching lead:', error);
    return { lead: null, isNew: false };
  }

  if (!lead) {
    // Obtener columna por defecto
    const defaultColumnId = await getDefaultColumn(supabase, userId, telegramBotId);
    if (!defaultColumnId) {
      console.error('No default column found for user');
      return { lead: null, isNew: false };
    }

    // Obtener siguiente posición
    const position = await getNextPosition(supabase, defaultColumnId);

    // Crear nuevo lead
    const newLead = {
      user_id: userId,
      column_id: defaultColumnId,
      name: userName || `Telegram ${chatId}`,
      phone: chatId,
      position: position,
      notes: 'Lead creado automáticamente desde Telegram Bot',
      bot_active: true,
    };

    const { data: created, error: createError } = await supabase
      .from('leads')
      .insert(newLead)
      .select()
      .single();

    if (createError) {
      console.error('Error creating lead:', createError);
      return { lead: null, isNew: false };
    }

    console.log('New Telegram lead created:', created.id);
    return { lead: created, isNew: true };
  }

  console.log('Telegram lead already exists:', lead.id);
  return { lead, isNew: false };
}

// Vincular conversación con lead
async function linkConversationToLead(
  supabase: any,
  conversationId: string,
  leadId: string
) {
  const { error } = await supabase
    .from('conversations')
    .update({ lead_id: leadId })
    .eq('id', conversationId);

  if (error) {
    console.error('Error linking conversation to lead:', error);
    return false;
  }

  console.log('Telegram conversation linked to lead');
  return true;
}

// Procesar mensaje de Telegram
async function processTelegramMessage(supabase: any, update: any, botDbId: string) {
  try {
    console.log('Processing Telegram message...');
    
    const message = update.message;
    if (!message) {
      console.log('No message in update');
      return;
    }

    // Buscar el bot por su database ID
    const { data: bot, error: botError } = await supabase
      .from('telegram_bots')
      .select('*')
      .eq('id', botDbId)
      .single();
    
    if (botError || !bot) {
      console.error('Telegram bot not found:', botDbId);
      return;
    }

    const userId = bot.user_id;
    const telegramBotId = bot.id;
    
    const chatId = message.chat.id.toString();
    const userName = message.from?.first_name + (message.from?.last_name ? ` ${message.from.last_name}` : '') || null;
    const messageContent = message.text || message.caption || '[Media]';
    const timestamp = message.date;
    
    // Determinar tipo de mensaje
    let mediaType = 'text';
    let mediaUrl = null;
    
    if (message.photo) {
      mediaType = 'image';
    } else if (message.video) {
      mediaType = 'video';
    } else if (message.audio || message.voice) {
      mediaType = 'audio';
    } else if (message.document) {
      mediaType = 'file';
    }

    console.log(`Telegram message from: ${chatId} (${userName})`);
    console.log(`Content: ${messageContent.substring(0, 50)}...`);
    console.log(`Using bot: ${bot.bot_name}, User ID: ${userId}`);

    // Buscar o crear conversación
    const conversation = await getOrCreateConversation(
      supabase,
      userId,
      telegramBotId,
      chatId,
      userName,
      messageContent,
      timestamp
    );

    if (!conversation) {
      console.error('Failed to create/get conversation');
      return;
    }

    // Si es una nueva conversación, enviar al webhook
    const isNewConversation = !conversation.lead_id && conversation.unread_count === 1;
    if (isNewConversation) {
      console.log('New Telegram conversation detected, sending to webhook...');
      
      const webhookPayload = {
        type: 'conversation',
        source: 'telegram_incoming',
        timestamp: new Date().toISOString(),
        bot_name: bot.bot_name,
        
        telegram_raw_data: update,
        
        conversation: {
          id: conversation.id,
          phone_number: conversation.phone_number,
          contact_name: conversation.contact_name,
          pushname: conversation.pushname,
          user_id: conversation.user_id,
          status: conversation.status,
          lead_id: conversation.lead_id,
          last_message: conversation.last_message,
          last_message_time: conversation.last_message_time,
          unread_count: conversation.unread_count,
          channel_type: conversation.channel_type,
          telegram_bot_id: conversation.telegram_bot_id,
          created_at: conversation.created_at,
        },
        
        extracted_fields: {
          chat_id: chatId,
          username: userName,
          message_id: message.message_id,
        },
      };
      
      sendToExternalWebhook(webhookPayload).catch(err => 
        console.error('Failed to send to webhook:', err)
      );
    }

    // Enviar webhook para cada mensaje entrante
    const incomingMessagePayload = {
      type: 'incoming_message',
      source: 'telegram_incoming',
      timestamp: new Date().toISOString(),
      bot_name: bot.bot_name,
      is_new_contact: isNewConversation,
      
      telegram_raw_data: update,
      
      message: {
        id: message.message_id,
        content: messageContent,
        type: mediaType,
        direction: 'inbound',
        created_at: new Date(timestamp * 1000).toISOString(),
      },
      
      conversation: {
        id: conversation.id,
        phone_number: conversation.phone_number,
        contact_name: conversation.contact_name,
        user_id: conversation.user_id,
        channel_type: conversation.channel_type,
        telegram_bot_id: conversation.telegram_bot_id,
      },
      
      extracted_fields: {
        chat_id: chatId,
        username: userName,
        message_id: message.message_id,
      },
    };
    
    sendToExternalWebhook(incomingMessagePayload).catch(err =>
      console.error('Failed to send incoming message to webhook:', err)
    );

    // Guardar mensaje
    await saveMessage(supabase, conversation.id, userId, message, mediaUrl, mediaType);

    // Guardar o actualizar contacto
    await saveOrUpdateContact(supabase, userId, chatId, userName);

    // Crear lead
    const { lead, isNew: isNewLead } = await getOrCreateLead(supabase, userId, chatId, userName, telegramBotId);
    
    if (lead && !conversation.lead_id) {
      await linkConversationToLead(supabase, conversation.id, lead.id);
    }

    // Si es un nuevo lead, enviar al webhook
    if (isNewLead && lead) {
      console.log('New Telegram lead detected, sending to webhook...');
      
      const webhookPayload = {
        type: 'lead',
        source: 'telegram_incoming',
        timestamp: new Date().toISOString(),
        bot_name: bot.bot_name,
        
        telegram_raw_data: update,
        
        conversation: {
          id: conversation.id,
          phone_number: conversation.phone_number,
          contact_name: conversation.contact_name,
          user_id: conversation.user_id,
          lead_id: lead.id,
          channel_type: conversation.channel_type,
        },
        
        lead: {
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          user_id: lead.user_id,
          column_id: lead.column_id,
        },
      };
      
      sendToExternalWebhook(webhookPayload).catch(err =>
        console.error('Failed to send to webhook:', err)
      );
    }

    // Verificar si hay bot habilitado y agregar al buffer
    const { data: botSettings } = await supabase
      .from('user_bot_settings')
      .select('bot_enabled')
      .eq('user_id', userId)
      .single();

    if (botSettings?.bot_enabled !== false) {
      console.log('[telegram-bot-webhook] Bot enabled, adding to buffer...');
      
      // Buscar o crear buffer
      const { data: existingBuffer } = await supabase
        .from('ai_response_buffer')
        .select('*')
        .eq('conversation_id', conversation.id)
        .eq('processed', false)
        .single();

      if (existingBuffer) {
        const currentMessages = JSON.parse(existingBuffer.accumulated_messages);
        currentMessages.push(messageContent);
        
        await supabase
          .from('ai_response_buffer')
          .update({
            message_count: existingBuffer.message_count + 1,
            accumulated_messages: JSON.stringify(currentMessages),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingBuffer.id);

        if (existingBuffer.message_count + 1 >= 4) {
          console.log('[telegram-bot-webhook] Buffer reached 4 messages, processing...');
          await supabase.functions.invoke('process-ai-buffer', { body: {} });
        }
      } else {
        await supabase
          .from('ai_response_buffer')
          .insert({
            conversation_id: conversation.id,
            user_id: userId,
            message_count: 1,
            accumulated_messages: JSON.stringify([messageContent]),
            channel_type: 'telegram',
            telegram_bot_id: telegramBotId,
            phone_number: chatId,
            processed: false
          });
      }
    }
    
  } catch (error) {
    console.error('Error processing Telegram message:', error);
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const botDbId = url.searchParams.get('bot_db_id');
    
    if (!botDbId) {
      console.error('No bot_db_id parameter in webhook URL');
      return new Response(
        JSON.stringify({ error: 'Missing bot_db_id parameter' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const body = await req.json();
    console.log('Telegram webhook received for bot:', botDbId);
    console.log('Update:', JSON.stringify(body, null, 2));

    // Telegram envía updates con esta estructura
    if (body.message) {
      await processTelegramMessage(supabase, body, botDbId);
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in telegram-bot-webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
