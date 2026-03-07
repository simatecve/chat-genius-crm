import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

// Declarar EdgeRuntime para TypeScript
declare const EdgeRuntime: { waitUntil: (promise: Promise<any>) => void };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Función helper para enviar datos al webhook n8n configurable
async function sendToN8nWebhook(webhookUrl: string, data: any) {
  try {
    console.log('[waha-webhook] Sending to n8n webhook:', webhookUrl);
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      console.error('[waha-webhook] n8n webhook response not OK:', response.status);
    } else {
      console.log('[waha-webhook] n8n webhook sent successfully');
    }
  } catch (error) {
    console.error('[waha-webhook] Error sending to n8n webhook:', error);
  }
}

// Normalizar número de teléfono removiendo sufijos de WhatsApp
function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  return phone
    .replace(/@lid$/, '')
    .replace(/@c\.us$/, '')
    .replace(/@s\.whatsapp\.net$/, '')
    .replace(/:\d+$/, '') // Remove device suffix like :1, :6, etc.
    .trim();
}

// Detectar si un valor es un LID de Meta (no es un número de teléfono real)
function isMetaLid(value: string): boolean {
  if (!value) return false;
  
  // Verificar sufijo @lid primero (antes de normalizar)
  if (value.includes('@lid')) return true;
  
  // Limpiar para análisis
  const cleanValue = value.replace(/@.*$/, '');
  
  // Los LIDs de Meta típicamente tienen 14+ dígitos y son puramente numéricos
  // Los números de teléfono reales tienen 8-14 dígitos
  const isLongNumeric = cleanValue.length >= 14 && /^\d+$/.test(cleanValue);
  
  return isLongNumeric;
}

// Obtener datos de sesión incluyendo n8n_webhook_url
async function getSessionData(supabase: any, sessionName: string): Promise<{ 
  userId: string | null; 
  sessionPhoneNumber: string | null; 
  workspaceId: string | null; 
  defaultColumnId: string | null;
  n8nWebhookUrl: string | null;
  connectionId: string | null;
}> {
  console.log('Getting session data for:', sessionName);
  
  // Primero intentar coincidencia exacta
  let { data, error } = await supabase
    .from('whatsapp_connections')
    .select('id, user_id, phone_number, workspace_id, default_column_id, name, n8n_webhook_url')
    .eq('name', sessionName)
    .maybeSingle();

  // Si no hay coincidencia exacta, buscar sesiones que comiencen con el nombre
  if (!data) {
    console.log('No exact match for session, trying LIKE search for:', sessionName);
    const { data: likeData, error: likeError } = await supabase
      .from('whatsapp_connections')
      .select('id, user_id, phone_number, workspace_id, default_column_id, name, n8n_webhook_url')
      .ilike('name', `${sessionName}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (!likeError && likeData) {
      console.log('Found session by LIKE search:', likeData.name);
      data = likeData;
      error = null;
    } else if (likeError) {
      console.error('Error in LIKE search:', likeError);
    }
  } else {
    console.log('Found session by exact match:', data.name);
  }

  if (error) {
    console.error('Error getting session data:', error);
    return { userId: null, sessionPhoneNumber: null, workspaceId: null, defaultColumnId: null, n8nWebhookUrl: null, connectionId: null };
  }

  if (!data) {
    console.error('No session found for:', sessionName);
    return { userId: null, sessionPhoneNumber: null, workspaceId: null, defaultColumnId: null, n8nWebhookUrl: null, connectionId: null };
  }

  console.log('Session data retrieved - user_id:', data.user_id, 'workspace_id:', data.workspace_id, 'n8n_webhook:', data.n8n_webhook_url ? 'configured' : 'not set');
  return {
    userId: data.user_id || null,
    sessionPhoneNumber: data.phone_number || null,
    workspaceId: data.workspace_id || null,
    defaultColumnId: data.default_column_id || null,
    n8nWebhookUrl: data.n8n_webhook_url || null,
    connectionId: data.id || null
  };
}

// Obtener columna por defecto del usuario o de la conexión
async function getDefaultColumn(supabase: any, userId: string, sessionName: string): Promise<string | null> {
  // Primero intentar obtener la columna configurada en la conexión de WhatsApp (coincidencia exacta)
  let { data: connection, error: connError } = await supabase
    .from('whatsapp_connections')
    .select('default_column_id, name')
    .eq('name', sessionName)
    .eq('user_id', userId)
    .maybeSingle();

  // Si no hay coincidencia exacta, buscar con LIKE
  if (!connection) {
    const { data: likeConn, error: likeConnError } = await supabase
      .from('whatsapp_connections')
      .select('default_column_id, name')
      .eq('user_id', userId)
      .ilike('name', `${sessionName}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (!likeConnError && likeConn) {
      console.log('Found connection by LIKE for default column:', likeConn.name);
      connection = likeConn;
      connError = null;
    }
  }

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

// Buscar o crear conversación - AHORA FILTRA POR whatsapp_number con fallback legacy
async function getOrCreateConversation(
  supabase: any,
  userId: string,
  phoneNumber: string,
  pushName: string | null,
  messageContent: string,
  messageTimestamp: number,
  fromMe: boolean,
  sessionPhoneNumber: string | null
) {
  // Buscar conversación existente - INCLUIR whatsapp_number en la búsqueda
  let query = supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('phone_number', phoneNumber);
  
  // Si tenemos el número de sesión, filtrar también por él
  if (sessionPhoneNumber) {
    query = query.eq('whatsapp_number', sessionPhoneNumber);
  }

  let { data: conversation, error } = await query.single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error searching conversation:', error);
    return null;
  }

  // FALLBACK: Si no encontramos con whatsapp_number, buscar conversación legacy (sin whatsapp_number)
  if (!conversation && sessionPhoneNumber) {
    console.log('No conversation found with whatsapp_number, trying legacy search...');
    
    const { data: legacyConversation, error: legacyError } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('phone_number', phoneNumber)
      .is('whatsapp_number', null)
      .eq('channel_type', 'whatsapp')
      .single();
    
    if (!legacyError && legacyConversation) {
      console.log('Found legacy conversation without whatsapp_number:', legacyConversation.id);
      
      // Actualizar la conversación legacy con el whatsapp_number correcto
      const { data: updated, error: updateError } = await supabase
        .from('conversations')
        .update({ 
          whatsapp_number: sessionPhoneNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', legacyConversation.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating legacy conversation with whatsapp_number:', updateError);
        return legacyConversation;
      }
      
      console.log('Legacy conversation updated with whatsapp_number:', sessionPhoneNumber);
      conversation = updated || legacyConversation;
    }
  }

  if (!conversation) {
    // Crear nueva conversación CON whatsapp_number - usando UPSERT para evitar race conditions
    const newConversation = {
      user_id: userId,
      phone_number: phoneNumber,
      whatsapp_number: sessionPhoneNumber,
      pushname: pushName,
      last_message: messageContent,
      last_message_time: new Date(messageTimestamp * 1000).toISOString(),
      unread_count: 1,
      status: 'active',
      channel_type: 'whatsapp',
    };

    // Usar INSERT con manejo de error 23505 (unique_violation) para índices parciales
    const { data: created, error: createError } = await supabase
      .from('conversations')
      .insert(newConversation)
      .select()
      .single();

    if (createError) {
      // Error 23505 = unique_violation - la conversación ya existe
      if (createError.code === '23505') {
        console.log('Unique constraint violation - conversation exists, fetching...');
        const { data: existing } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', userId)
          .eq('phone_number', phoneNumber)
          .eq('whatsapp_number', sessionPhoneNumber)
          .eq('channel_type', 'whatsapp')
          .single();
        
        if (existing) {
          console.log('Found existing conversation after constraint violation:', existing.id);
          return existing;
        }
      }
      
      console.error('Error creating conversation:', createError);
      return null;
    }

    console.log('New conversation created:', created.id, 'with whatsapp_number:', sessionPhoneNumber);
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
    // Si el mensaje ya existe (índice único waha_id), ignorar silenciosamente
    if (error.code === '23505') {
      console.log('Message already exists (duplicate waha_id), skipping...');
      return null;
    }
    console.error('Error saving message:', error);
    return null;
  }

  console.log('Message saved:', data.id);
  return data;
}

// Buscar o crear lead - AISLADO POR CONVERSACIÓN (igual que Twilio)
// Cada conversación de sesión WhatsApp diferente tendrá su propio lead
async function getOrCreateLead(
  supabase: any,
  userId: string,
  phoneNumber: string,
  pushName: string | null,
  workspaceId: string | null,
  defaultColumnId: string | null,
  conversationId: string,
  whatsappSessionName: string
) {
  // PASO 1: Verificar si la conversación YA tiene un lead vinculado
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('lead_id')
    .eq('id', conversationId)
    .single();

  if (convError) {
    console.error('Error checking conversation lead:', convError);
  }

  if (conversation?.lead_id) {
    // Ya tiene lead, retornarlo
    const { data: existingLead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', conversation.lead_id)
      .single();
    
    if (!leadError && existingLead) {
      console.log(`Conversation ${conversationId} already has lead: ${existingLead.id}`);
      return { lead: existingLead, isNew: false };
    }
  }

  // PASO 2: NO tiene lead - SIEMPRE crear uno nuevo para esta conversación/sesión específica
  console.log(`Creating NEW lead for conversation ${conversationId} (session: ${whatsappSessionName})`);

  // Determinar columna a usar
  let columnIdToUse = defaultColumnId;
  
  if (!columnIdToUse) {
    // Buscar la columna default del workspace o del usuario
    if (workspaceId) {
      const { data: defaultCol } = await supabase
        .from('lead_columns')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('is_default', true)
        .maybeSingle();
      
      columnIdToUse = defaultCol?.id;
      
      // Si no hay default, usar la primera columna del workspace
      if (!columnIdToUse) {
        const { data: firstCol } = await supabase
          .from('lead_columns')
          .select('id')
          .eq('workspace_id', workspaceId)
          .order('position', { ascending: true })
          .limit(1)
          .maybeSingle();
        
        columnIdToUse = firstCol?.id;
      }
    }
    
    // Si aún no tenemos columna, buscar cualquier columna del usuario
    if (!columnIdToUse) {
      const { data: anyCol } = await supabase
        .from('lead_columns')
        .select('id')
        .eq('user_id', userId)
        .eq('is_default', true)
        .maybeSingle();
      
      columnIdToUse = anyCol?.id;
      
      if (!columnIdToUse) {
        const { data: firstUserCol } = await supabase
          .from('lead_columns')
          .select('id')
          .eq('user_id', userId)
          .order('position', { ascending: true })
          .limit(1)
          .maybeSingle();
        
        columnIdToUse = firstUserCol?.id;
      }
    }
  }

  if (!columnIdToUse) {
    console.error('No column found to create lead');
    return { lead: null, isNew: false };
  }

  // Obtener siguiente posición
  const position = await getNextPosition(supabase, columnIdToUse);

  // Crear nuevo lead con nota identificando la sesión
  const newLead = {
    user_id: userId,
    column_id: columnIdToUse,
    name: pushName || phoneNumber,
    phone: phoneNumber,
    position: position,
    notes: `Lead desde WhatsApp: ${whatsappSessionName}`,
    bot_active: true,
    last_inbound_message_time: new Date().toISOString(),
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

  console.log('New lead created:', created.id, 'in column:', columnIdToUse, 'for session:', whatsappSessionName);
  return { lead: created, isNew: true };
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

// Buscar o crear contacto
async function getOrCreateContact(
  supabase: any,
  userId: string,
  phoneNumber: string,
  pushName: string | null
) {
  // Buscar contacto existente
  const { data: existingContact, error: searchError } = await supabase
    .from('contacts')
    .select('id, name')
    .eq('user_id', userId)
    .eq('phone_number', phoneNumber)
    .maybeSingle();

  if (searchError && searchError.code !== 'PGRST116') {
    console.error('Error searching contact:', searchError);
    return null;
  }

  if (existingContact) {
    // Si existe y tenemos pushName diferente, actualizar
    if (pushName && existingContact.name !== pushName && existingContact.name === phoneNumber) {
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ 
          name: pushName, 
          first_name: pushName,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingContact.id);
      
      if (updateError) {
        console.error('Error updating contact name:', updateError);
      } else {
        console.log('Contact name updated to:', pushName);
      }
    }
    console.log('Contact already exists:', existingContact.id);
    return existingContact;
  }

  // Crear nuevo contacto
  const { data: newContact, error: createError } = await supabase
    .from('contacts')
    .insert({
      user_id: userId,
      phone_number: phoneNumber,
      name: pushName || phoneNumber,
      first_name: pushName || null,
      origin: 'whatsapp',
    })
    .select()
    .single();

  if (createError) {
    console.error('Error creating contact:', createError);
    return null;
  }

  console.log('New contact created:', newContact.id);
  return newContact;
}

// Procesar evento de mensaje
async function processMessageEvent(supabase: any, payload: any, session: string, rawPayload?: any) {
  try {
    // Ignorar evento message.any para evitar duplicados (solo procesamos 'message')
    const eventType = rawPayload?.event || 'unknown';
    if (eventType === 'message.any') {
      console.log('Ignoring message.any event to prevent duplicate processing');
      return;
    }
    
    console.log('Processing message event...');

    // Extraer datos del mensaje
    const messageData = payload;
    const wahaMessageId = messageData.id;
    const fromMe = messageData.fromMe;
    
    // LOG para debug - mostrar todos los campos relevantes del payload
    console.log('[DEBUG] Message fields:', {
      fromMe,
      from: messageData.from,
      to: messageData.to,
      remoteJid: messageData._data?.key?.remoteJid,
      remoteJidAlt: messageData._data?.key?.remoteJidAlt,
      session,
      pushName: messageData._data?.pushName
    });
    
    // Verificar si el mensaje ya fue procesado (deduplicación) usando función RPC
    if (wahaMessageId) {
      const { data: exists, error: rpcError } = await supabase
        .rpc('check_message_exists_by_waha_id', { p_waha_id: wahaMessageId });
      
      if (rpcError) {
        console.error('Error checking message existence:', rpcError);
      }
      
      if (exists) {
        console.log(`Message ${wahaMessageId} already processed, skipping...`);
        return;
      }
    }

    // CORRECCIÓN: Determinar el número del destinatario/remitente correcto
    // Para mensajes salientes (fromMe=true), el destinatario está en "to" o remoteJid
    // Para mensajes entrantes (fromMe=false), el remitente está en "from"
    
    // Extraer JIDs y participant
    const remoteJid = messageData._data?.key?.remoteJid;
    const remoteJidAlt = messageData._data?.key?.remoteJidAlt;
    const participant = messageData._data?.key?.participant || 
                       messageData.participant ||
                       messageData._data?.participant ||
                       null;
    const participantNumber = participant ? normalizePhoneNumber(participant) : null;
    
    // Extract SenderAlt and RecipientAlt from _data.Info (WAHA GOWS LID resolution)
    const senderAlt = messageData._data?.Info?.SenderAlt || messageData._data?.Info?.Sender || null;
    const recipientAlt = messageData._data?.Info?.RecipientAlt || null;
    console.log(`[DEBUG] Alt JIDs: senderAlt=${senderAlt}, recipientAlt=${recipientAlt}`);
    
    console.log(`[DEBUG] JID extraction: remoteJid=${remoteJid}, remoteJidAlt=${remoteJidAlt}, participant=${participant}`);
    
    let rawPhoneNumber: string;
    
    // PASO 1: Ignorar mensajes de grupos (@g.us) ANTES de cualquier procesamiento
    if (remoteJid && remoteJid.includes('@g.us')) {
      console.log(`Ignoring group message: ${remoteJid}`);
      return;
    }
    
    // PASO 2: Ignorar estados de WhatsApp (status@broadcast) INMEDIATAMENTE
    if (remoteJid === 'status@broadcast') {
      console.log('Ignoring WhatsApp status broadcast');
      return;
    }
    
    // PASO 3: Determinar el número correcto basado en el tipo de mensaje
    if (fromMe) {
      // Mensaje saliente: necesitamos el destinatario
      if (remoteJid && isMetaLid(remoteJid)) {
        // remoteJid es un LID, buscar número real
        if (remoteJidAlt && !isMetaLid(remoteJidAlt)) {
          rawPhoneNumber = remoteJidAlt;
          console.log(`[LID Fix] Using remoteJidAlt for outbound: ${remoteJidAlt}`);
        } else if (participantNumber && !isMetaLid(participantNumber)) {
          rawPhoneNumber = participant;
          console.log(`[LID Fix] Using participant for outbound: ${participant}`);
        } else if (recipientAlt && !isMetaLid(recipientAlt)) {
          rawPhoneNumber = recipientAlt;
          console.log(`[LID Fix] Using RecipientAlt for outbound: ${recipientAlt}`);
        } else {
          console.log(`[LID Detection] Cannot extract real phone for outbound LID: ${remoteJid}`);
          return;
        }
      } else {
        rawPhoneNumber = remoteJid || remoteJidAlt || recipientAlt || messageData.to || messageData.from;
      }
    } else {
      // Mensaje entrante: necesitamos el remitente
      if (remoteJid && isMetaLid(remoteJid)) {
        // remoteJid es un LID, buscar número real
        if (remoteJidAlt && !isMetaLid(remoteJidAlt)) {
          rawPhoneNumber = remoteJidAlt;
          console.log(`[LID Fix] Using remoteJidAlt for inbound: ${remoteJidAlt}`);
        } else if (participantNumber && !isMetaLid(participantNumber)) {
          rawPhoneNumber = participant;
          console.log(`[LID Fix] Using participant for inbound: ${participant}`);
        } else if (senderAlt && !isMetaLid(senderAlt)) {
          rawPhoneNumber = senderAlt;
          console.log(`[LID Fix] Using SenderAlt for inbound: ${senderAlt}`);
        } else {
          console.log(`[LID Detection] Cannot extract real phone for inbound LID: ${remoteJid}`);
          return;
        }
      } else {
        rawPhoneNumber = remoteJid || remoteJidAlt || senderAlt || messageData.from;
      }
    }
    
    console.log(`[DEBUG] Initial rawPhoneNumber: ${rawPhoneNumber}`);
    
    // PASO 4: Validar que no sea status@broadcast después de asignar
    if (!rawPhoneNumber || rawPhoneNumber.includes('status@broadcast')) {
      console.log(`Ignoring status message: ${rawPhoneNumber}`);
      return;
    }
    
    // PASO 5: Validar que no sea un LID ANTES de normalizar - con last resort fallback
    if (isMetaLid(rawPhoneNumber)) {
      const lastResort = fromMe 
        ? (recipientAlt || messageData.to)
        : (senderAlt || messageData._data?.Info?.Sender);
      
      if (lastResort && !isMetaLid(lastResort)) {
        rawPhoneNumber = lastResort;
        console.log(`[LID Fix] Last resort resolution: ${rawPhoneNumber}`);
      } else {
        console.log(`[LID Detection Early] Rejecting LID, no alternatives found: ${rawPhoneNumber}`);
        return;
      }
    }
    
    const phoneNumber = normalizePhoneNumber(rawPhoneNumber);
    const pushName = messageData._data?.pushName || null;
    
    // PASO 6: Validación final después de normalizar
    if (isMetaLid(phoneNumber)) {
      console.log(`[LID Detection] Normalized value is still LID, ignoring: ${phoneNumber}`);
      return;
    }
    
    console.log(`Phone number: ${rawPhoneNumber} -> normalized: ${phoneNumber}`);
    let messageContent = messageData.body || '';
    const timestamp = messageData.timestamp;
    const hasMedia = messageData.hasMedia;
    let mediaUrl = null;
    let mediaType = 'text';

    // Manejar mensajes con archivos multimedia
    if (hasMedia && messageData.media) {
      const wahaMediaUrl = messageData.media.url;
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
      
      console.log(`Media message detected: ${mediaType} at ${wahaMediaUrl}`);

      // Intentar descargar y subir a Supabase Storage para acceso público
      try {
        const WAHA_BASE_URL = Deno.env.get('WAHA_BASE_URL');
        const WAHA_API_KEY = Deno.env.get('WAHA_API_KEY');
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
        
        if (WAHA_BASE_URL && WAHA_API_KEY && wahaMediaUrl) {
          // Construir URL completa si es relativa
          const fullMediaUrl = wahaMediaUrl.startsWith('http') 
            ? wahaMediaUrl 
            : `${WAHA_BASE_URL}${wahaMediaUrl}`;
          
          console.log(`[Media Upload] Downloading from WAHA: ${fullMediaUrl}`);
          
          const mediaResponse = await fetch(fullMediaUrl, {
            headers: { 'Authorization': `Bearer ${WAHA_API_KEY}` }
          });
          
          if (mediaResponse.ok) {
            const mediaBlob = await mediaResponse.arrayBuffer();
            const extension = mimetype.split('/')[1]?.split(';')[0] || 'bin';
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
            const storagePath = `${session}/${phoneNumber}/${fileName}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('chat-attachments')
              .upload(storagePath, mediaBlob, {
                contentType: mimetype,
                upsert: false
              });
            
            if (!uploadError && uploadData) {
              // Obtener URL pública
              const { data: publicUrlData } = supabase.storage
                .from('chat-attachments')
                .getPublicUrl(storagePath);
              
              mediaUrl = publicUrlData?.publicUrl || wahaMediaUrl;
              console.log(`[Media Upload] Successfully uploaded to Storage: ${mediaUrl}`);
            } else {
              console.error('[Media Upload] Upload failed:', uploadError);
              mediaUrl = wahaMediaUrl; // Fallback a URL de WAHA
            }
          } else {
            console.error('[Media Upload] Download failed:', mediaResponse.status);
            mediaUrl = wahaMediaUrl; // Fallback a URL de WAHA
          }
        } else {
          mediaUrl = wahaMediaUrl; // Fallback si no hay config
        }
      } catch (uploadErr) {
        console.error('[Media Upload] Error:', uploadErr);
        mediaUrl = messageData.media.url; // Fallback a URL de WAHA
      }
    }

    // Ignorar mensajes de sistema sin contenido ni media
    if (!messageContent && !hasMedia) {
      console.log('Ignoring system message without content or media');
      return;
    }

    console.log(`Message from: ${phoneNumber} (${pushName}), fromMe: ${fromMe}`);
    console.log(`Content: ${messageContent.substring(0, 50)}...`);

    // Obtener datos de la sesión (user_id, phone_number de la sesión, workspace_id)
    const sessionData = await getSessionData(supabase, session);
    const { userId, sessionPhoneNumber, workspaceId, defaultColumnId } = sessionData;
    
    if (!userId) {
      console.error('Could not get user_id from session');
      return;
    }

    console.log(`User ID: ${userId}, Session Phone: ${sessionPhoneNumber}, Workspace: ${workspaceId}`);

    // Buscar o crear conversación - AHORA CON whatsapp_number
    const conversation = await getOrCreateConversation(
      supabase,
      userId,
      phoneNumber,
      pushName,
      messageContent,
      timestamp,
      fromMe,
      sessionPhoneNumber
    );

    if (!conversation) {
      console.error('Failed to create/get conversation');
      return;
    }

    // Si es una nueva conversación (creada en esta llamada), enviar al webhook
    const isNewConversation = !conversation.lead_id && conversation.unread_count === 1;
    if (isNewConversation && !fromMe) {
      console.log('New conversation detected, sending to webhook...');
      
      // Preparar datos completos para el webhook
      const webhookPayload = {
        type: 'conversation',
        source: 'whatsapp_incoming',
        timestamp: new Date().toISOString(),
        session_name: session,
        
        waha_raw_data: rawPayload || messageData,
        
        conversation: {
          id: conversation.id,
          phone_number: conversation.phone_number,
          pushname: conversation.pushname,
          user_id: conversation.user_id,
          status: conversation.status,
          lead_id: conversation.lead_id,
          last_message: conversation.last_message,
          last_message_time: conversation.last_message_time,
          unread_count: conversation.unread_count,
          channel_type: conversation.channel_type,
          whatsapp_number: conversation.whatsapp_number,
          created_at: conversation.created_at,
        },
        
        extracted_fields: {
          phone_number_normalized: phoneNumber,
          phone_number_raw: messageData.from,
          remote_jid_alt: messageData._data?.key?.remoteJidAlt,
          pushname: pushName,
          is_lid: messageData.from?.includes('@lid'),
          message_id: wahaMessageId,
        },
      };
      
      // Enviar al webhook n8n si está configurado
      // TODO: Obtener n8nWebhookUrl del contexto y enviar aquí
      console.log('[waha-webhook] Webhook payload ready, n8n integration pending context');
    }

    // Guardar mensaje
    await saveMessage(supabase, conversation.id, userId, messageData, mediaUrl, mediaType);

    // Solo crear lead y contacto para mensajes entrantes (!fromMe)
    if (!fromMe) {
      // Crear o actualizar contacto
      await getOrCreateContact(supabase, userId, phoneNumber, pushName);
      
      const { lead, isNew: isNewLead } = await getOrCreateLead(supabase, userId, phoneNumber, pushName, workspaceId, defaultColumnId, conversation.id, session);
      
      if (lead && !conversation.lead_id) {
        // Vincular conversación con lead si aún no está vinculada
        await linkConversationToLead(supabase, conversation.id, lead.id);
      }

      // Si es un nuevo lead, enviar al webhook
      if (isNewLead && lead) {
        console.log('New lead detected, sending to webhook...');
        
        const webhookPayload = {
          type: 'lead',
          source: 'whatsapp_incoming',
          timestamp: new Date().toISOString(),
          session_name: session,
          
          waha_raw_data: rawPayload || messageData,
          
          conversation: {
            id: conversation.id,
            phone_number: conversation.phone_number,
            pushname: conversation.pushname,
            user_id: conversation.user_id,
            status: conversation.status,
            lead_id: lead.id,
            last_message: conversation.last_message,
            last_message_time: conversation.last_message_time,
            unread_count: conversation.unread_count,
            channel_type: conversation.channel_type,
            whatsapp_number: conversation.whatsapp_number,
            created_at: conversation.created_at,
          },
          
          lead: {
            id: lead.id,
            name: lead.name,
            phone: lead.phone,
            column_id: lead.column_id,
            position: lead.position,
            user_id: lead.user_id,
            bot_active: lead.bot_active,
            notes: lead.notes,
            created_at: lead.created_at,
          },
          
          extracted_fields: {
            phone_number_normalized: phoneNumber,
            phone_number_raw: messageData.from,
            remote_jid_alt: messageData._data?.key?.remoteJidAlt,
            pushname: pushName,
            is_lid: messageData.from?.includes('@lid'),
            message_id: wahaMessageId,
          },
        };
        
        // Enviar al webhook n8n si está configurado
        // TODO: Obtener n8nWebhookUrl del contexto y enviar aquí
        console.log('[waha-webhook] Lead webhook payload ready, n8n integration pending context');
      }

      // Llamar al agente de IA si está habilitado en la conexión WhatsApp
      console.log('Checking WhatsApp connection AI settings...');
      try {
        // Verificar si la IA está habilitada para esta conexión WhatsApp específica
        const { data: whatsappConnection, error: connError } = await supabase
          .from('whatsapp_connections')
          .select('ai_enabled')
          .eq('name', session)
          .maybeSingle();

        if (connError) {
          console.error('Error fetching WhatsApp connection settings:', connError);
        }

        const isAIEnabled = whatsappConnection?.ai_enabled === true;

        if (!isAIEnabled) {
          console.log('AI is disabled for this WhatsApp connection, skipping AI response');
          return;
        }

        console.log('Bot is enabled, adding message to buffer...');
        
        // Buscar o crear buffer para esta conversación
        const { data: existingBuffer } = await supabase
          .from('ai_response_buffer')
          .select('*')
          .eq('conversation_id', conversation.id)
          .eq('processed', false)
          .single();

        if (existingBuffer) {
          // Actualizar buffer existente - estructura con type, content, imageUrl
          // INCLUIR imageUrl para imágenes Y documentos/PDFs
          const currentMessages = JSON.parse(existingBuffer.accumulated_messages);
          currentMessages.push({
            type: mediaType,
            content: messageContent,
            imageUrl: (mediaType === 'image' || mediaType === 'file' || mediaType === 'document') ? mediaUrl : null
          });
          
          await supabase
            .from('ai_response_buffer')
            .update({
              message_count: existingBuffer.message_count + 1,
              accumulated_messages: JSON.stringify(currentMessages),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingBuffer.id);

          console.log(`Buffer updated: ${existingBuffer.message_count + 1} messages, mediaType: ${mediaType}`);

          // Si alcanzó 2 mensajes O ES UNA IMAGEN/DOCUMENTO, procesar inmediatamente
          if (existingBuffer.message_count + 1 >= 2 || mediaType === 'image' || mediaType === 'file' || mediaType === 'document') {
            console.log('Buffer reached 2 messages or has image/document, processing immediately...');
            await supabase.functions.invoke('process-ai-buffer', { body: {} });
          }
        } else {
          // Crear nuevo buffer - estructura con type, content, imageUrl
          // INCLUIR imageUrl para imágenes Y documentos/PDFs
          const { data: newBuffer } = await supabase
            .from('ai_response_buffer')
            .insert({
              conversation_id: conversation.id,
              user_id: userId,
              message_count: 1,
              accumulated_messages: JSON.stringify([{
                type: mediaType,
                content: messageContent,
                imageUrl: (mediaType === 'image' || mediaType === 'file' || mediaType === 'document') ? mediaUrl : null
              }]),
              channel_type: 'whatsapp',
              session_name: session,
              phone_number: conversation.phone_number,
              processed: false
            })
            .select()
            .single();

          // Si es una imagen o documento/PDF, procesar INMEDIATAMENTE (puede ser comprobante de pago)
          if (mediaType === 'image' || mediaType === 'file' || mediaType === 'document') {
            console.log('Image/document received, processing immediately for potential payment receipt...');
            await supabase.functions.invoke('process-ai-buffer', { body: {} });
          } else {
            console.log('New buffer created, scheduling processing in 10 seconds...');

            // Programar procesamiento después de 10 segundos usando EdgeRuntime.waitUntil
            EdgeRuntime.waitUntil((async () => {
              // Esperar 10 segundos
              await new Promise(resolve => setTimeout(resolve, 10000));
              
              // Verificar si el buffer aún no fue procesado
              const { data: currentBuffer } = await supabase
                .from('ai_response_buffer')
                .select('processed')
                .eq('conversation_id', conversation.id)
                .eq('processed', false)
                .maybeSingle();
              
              if (currentBuffer) {
                console.log('10 seconds passed, processing buffer...');
                await supabase.functions.invoke('process-ai-buffer', { body: {} });
              }
            })());
          }
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

    // Ignorar eventos de estado de sesión - solo el botón "Verificar" actualiza estados
    // Esto evita que estados transitorios (STARTING, SCAN_QR_CODE) marquen sesiones como desconectadas
    if (event === 'session.status') {
      console.log(`Ignoring session.status event for ${session}: ${eventPayload?.status} (states only updated via Verify button)`);
      return new Response(JSON.stringify({ received: true, ignored: 'session.status' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Procesar mensajes recibidos - capturar todos los eventos de tipo message
    if (event === 'message' || event === 'message.any') {
      console.log('Message event detected:', event);
      await processMessageEvent(supabase, eventPayload, session, payload);
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
