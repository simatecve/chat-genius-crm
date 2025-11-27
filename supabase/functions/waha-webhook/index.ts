import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalizar número de teléfono removiendo sufijos de WhatsApp
function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  return phone
    .replace(/@lid$/, '')
    .replace(/@c\.us$/, '')
    .replace(/@s\.whatsapp\.net$/, '')
    .trim();
}

// Obtener user_id desde el nombre de la sesión
async function getUserIdFromSession(supabase: any, sessionName: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('whatsapp_connections')
    .select('user_id')
    .eq('name', sessionName)
    .single();

  if (error) {
    console.error('Error getting user_id from session:', error);
    return null;
  }

  return data?.user_id || null;
}

// Obtener columna por defecto del usuario o de la conexión
async function getDefaultColumn(supabase: any, userId: string, sessionName: string): Promise<string | null> {
  // Primero intentar obtener la columna configurada en la conexión de WhatsApp
  const { data: connection, error: connError } = await supabase
    .from('whatsapp_connections')
    .select('default_column_id')
    .eq('name', sessionName)
    .eq('user_id', userId)
    .single();

  if (!connError && connection?.default_column_id) {
    console.log('Using default column from connection:', connection.default_column_id);
    return connection.default_column_id;
  }

  // Si no hay columna en la conexión, buscar la columna marcada como default
  let { data, error } = await supabase
    .from('lead_columns')
    .select('id')
    .eq('user_id', userId)
    .eq('is_default', true)
    .order('position', { ascending: true })
    .limit(1)
    .single();

  if (error || !data) {
    // Si no hay columna default, obtener la primera columna del usuario
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
  phoneNumber: string,
  pushName: string | null,
  messageContent: string,
  messageTimestamp: number,
  fromMe: boolean
) {
  // Buscar conversación existente
  let { data: conversation, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('phone_number', phoneNumber)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error searching conversation:', error);
    return null;
  }

  if (!conversation) {
    // Crear nueva conversación
    const newConversation = {
      user_id: userId,
      phone_number: phoneNumber,
      pushname: pushName,
      last_message: messageContent,
      last_message_time: new Date(messageTimestamp * 1000).toISOString(),
      unread_count: 1,
      status: 'active',
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

    console.log('New conversation created:', created.id);
    return created;
  } else {
    // Actualizar conversación existente
    const updateData: any = {
      last_message: messageContent,
      last_message_time: new Date(messageTimestamp * 1000).toISOString(),
      pushname: pushName || conversation.pushname,
    };
    
    // Solo incrementar unread_count si es mensaje entrante
    if (!fromMe) {
      updateData.unread_count = conversation.unread_count + 1;
    }
    
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
    content: messageData.body || '',
    direction: messageData.fromMe ? 'outbound' : 'inbound',
    status: 'delivered',
    message_type: mediaType,
    is_bot: false,
    created_at: new Date(messageData.timestamp * 1000).toISOString(),
    file_url: mediaUrl,
    attachment_url: mediaUrl,
    metadata: {
      waha_id: messageData.id,
      ack: messageData.ack,
      ackName: messageData.ackName,
      hasMedia: messageData.hasMedia || false,
      mimetype: messageData.media?.mimetype || null
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

  console.log('Message saved:', data.id);
  return data;
}

// Buscar o crear lead
async function getOrCreateLead(
  supabase: any,
  userId: string,
  phoneNumber: string,
  pushName: string | null,
  sessionName: string
) {
  // Buscar lead existente por teléfono
  let { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .eq('phone', phoneNumber)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error searching lead:', error);
    return null;
  }

  if (!lead) {
    // Obtener columna por defecto (primero de la conexión, luego del usuario)
    const defaultColumnId = await getDefaultColumn(supabase, userId, sessionName);
    if (!defaultColumnId) {
      console.error('No default column found for user');
      return null;
    }

    // Obtener siguiente posición
    const position = await getNextPosition(supabase, defaultColumnId);

    // Crear nuevo lead
    const newLead = {
      user_id: userId,
      column_id: defaultColumnId,
      name: pushName || phoneNumber,
      phone: phoneNumber,
      position: position,
      notes: 'Lead creado automáticamente desde WhatsApp',
      bot_active: true,
    };

    const { data: created, error: createError } = await supabase
      .from('leads')
      .insert(newLead)
      .select()
      .single();

    if (createError) {
      console.error('Error creating lead:', createError);
      return null;
    }

    console.log('New lead created:', created.id);
    return created;
  }

  console.log('Lead already exists:', lead.id);
  return lead;
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

  console.log('Conversation linked to lead');
  return true;
}

// Procesar evento de mensaje
async function processMessageEvent(supabase: any, payload: any, session: string) {
  try {
    console.log('Processing message event...');

    // Extraer datos del mensaje
    const messageData = payload;
    const wahaMessageId = messageData.id;
    
    // Verificar si el mensaje ya fue procesado (deduplicación)
    const { data: existingMessage } = await supabase
      .from('messages')
      .select('id')
      .eq('metadata->>waha_id', wahaMessageId)
      .limit(1)
      .maybeSingle();
    
    if (existingMessage) {
      console.log(`Message ${wahaMessageId} already processed, skipping...`);
      return;
    }

    // Usar remoteJidAlt si está disponible (contiene el número correcto), sino usar from
    const rawPhoneNumber = messageData._data?.key?.remoteJidAlt || messageData.from;
    const phoneNumber = normalizePhoneNumber(rawPhoneNumber);
    const pushName = messageData._data?.pushName || null;
    
    console.log(`Using phone number from remoteJidAlt: ${rawPhoneNumber} -> normalized: ${phoneNumber}`);
    let messageContent = messageData.body || '';
    const timestamp = messageData.timestamp;
    const fromMe = messageData.fromMe;
    const hasMedia = messageData.hasMedia;
    let mediaUrl = null;
    let mediaType = 'text';

    // Manejar mensajes con archivos multimedia
    if (hasMedia && messageData.media) {
      mediaUrl = messageData.media.url;
      const mimetype = messageData.media.mimetype || '';
      
      if (mimetype.startsWith('image/')) {
        mediaType = 'image';
        messageContent = messageContent || '[Imagen]';
      } else if (mimetype.startsWith('video/')) {
        mediaType = 'video';
        messageContent = messageContent || '[Video]';
      } else if (mimetype.startsWith('audio/')) {
        mediaType = 'audio';
        messageContent = messageContent || '[Audio]';
      } else {
        mediaType = 'file';
        messageContent = messageContent || '[Archivo]';
      }
      
      console.log(`Media message detected: ${mediaType} at ${mediaUrl}`);
    }

    // Ignorar mensajes de sistema sin contenido ni media
    if (!messageContent && !hasMedia) {
      console.log('Ignoring system message without content or media');
      return;
    }

    console.log(`Message from: ${phoneNumber} (${pushName}), fromMe: ${fromMe}`);
    console.log(`Content: ${messageContent.substring(0, 50)}...`);

    // Obtener user_id de la sesión
    const userId = await getUserIdFromSession(supabase, session);
    if (!userId) {
      console.error('Could not get user_id from session');
      return;
    }

    console.log(`User ID: ${userId}`);

  // Buscar o crear conversación
    const conversation = await getOrCreateConversation(
      supabase,
      userId,
      phoneNumber,
      pushName,
      messageContent,
      timestamp,
      fromMe
    );

    if (!conversation) {
      console.error('Failed to create/get conversation');
      return;
    }

    // Guardar mensaje
    await saveMessage(supabase, conversation.id, userId, messageData, mediaUrl, mediaType);

    // Solo crear lead para mensajes entrantes (!fromMe)
    if (!fromMe) {
      const lead = await getOrCreateLead(supabase, userId, phoneNumber, pushName, session);
      
      if (lead && !conversation.lead_id) {
        // Vincular conversación con lead si aún no está vinculada
        await linkConversationToLead(supabase, conversation.id, lead.id);
      }

      // Llamar al agente de IA si hay uno activo y el bot está habilitado
      console.log('Checking bot settings and active AI agent...');
      try {
        // Verificar si el bot está habilitado para el usuario
        const { data: botSettings, error: settingsError } = await supabase
          .from('user_bot_settings')
          .select('bot_enabled')
          .eq('user_id', userId)
          .maybeSingle();

        if (settingsError) {
          console.error('Error fetching bot settings:', settingsError);
        }

        const isBotEnabled = botSettings?.bot_enabled !== false; // Default a true si no existe

        if (!isBotEnabled) {
          console.log('Bot is disabled for this user, skipping AI response');
          return;
        }

        console.log('Bot is enabled, calling AI agent...');
        const { data: aiResult, error: aiError } = await supabase.functions.invoke('ai-agent-response', {
          body: {
            conversationId: conversation.id,
            userId: userId,
            messageContent: messageContent,
            sessionName: session
          }
        });

        if (aiError) {
          console.error('Error calling AI agent:', aiError);
        } else {
          console.log('AI agent response:', aiResult);
        }
      } catch (aiError) {
        console.error('Exception calling AI agent:', aiError);
      }
    } else {
      // Si es mensaje saliente y ya hay un lead vinculado, mantenerlo
      console.log('Outgoing message from user, lead handling skipped');
    }

    console.log('Message processing completed successfully');
  } catch (error) {
    console.error('Error processing message event:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const payload = await req.json();
    console.log('WAHA webhook received:', JSON.stringify(payload, null, 2));

    const { event, session, payload: eventPayload } = payload;

    // Procesar evento de cambio de estado de sesión
    if (event === 'session.status') {
      const sessionName = session;
      const status = eventPayload?.status;

      if (!sessionName || !status) {
        console.warn('Invalid session.status event:', payload);
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Session ${sessionName} changed to status: ${status}`);

      // Actualizar estado en la base de datos
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .update({
          status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('name', sessionName);

      if (error) {
        console.error('Error updating session status:', error);
      } else {
        console.log('Session status updated in database');
      }
    }

    // Procesar mensajes recibidos - capturar todos los eventos de tipo message
    if (event === 'message' || event === 'message.any') {
      console.log('Message event detected:', event);
      await processMessageEvent(supabase, eventPayload, session);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in waha-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        received: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
