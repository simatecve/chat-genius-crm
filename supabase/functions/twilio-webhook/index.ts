import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

// Declarar EdgeRuntime para TypeScript
declare const EdgeRuntime: { waitUntil: (promise: Promise<any>) => void };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WEBHOOK_URL = 'https://n8n2025.nocodeveloper.site/webhook/guardar_contacto';

// Función helper para enviar datos al webhook externo
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

// Normalizar número de teléfono removiendo prefijos de Twilio
function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  return phone
    .replace(/^whatsapp:/i, '')
    .replace(/^\+/, '')
    .trim();
}

// Obtener user_id desde el número de Twilio o connectionId
async function getUserIdFromTwilioNumber(supabase: any, toNumber: string, connectionIdFromUrl: string | null): Promise<{ userId: string | null; connectionId: string | null }> {
  // Primero intentar con connectionId de la URL (más preciso)
  if (connectionIdFromUrl) {
    console.log(`[twilio-webhook] Looking up connection by ID: ${connectionIdFromUrl}`);
    const { data, error } = await supabase
      .from('twilio_connections')
      .select('user_id, id')
      .eq('id', connectionIdFromUrl)
      .single();

    if (!error && data) {
      console.log(`[twilio-webhook] Found connection by ID: user_id=${data.user_id}`);
      return { userId: data.user_id, connectionId: data.id };
    }
    console.warn(`[twilio-webhook] Connection ID ${connectionIdFromUrl} not found, falling back to phone number`);
  }

  // Fallback: buscar por número de teléfono
  const normalized = normalizePhoneNumber(toNumber);
  console.log(`[twilio-webhook] Looking up connection by phone: ${normalized}`);
  
  const { data, error } = await supabase
    .from('twilio_connections')
    .select('user_id, id')
    .eq('phone_number', normalized)
    .single();

  if (error) {
    console.error('[twilio-webhook] Error getting user_id from Twilio number:', error);
    return { userId: null, connectionId: null };
  }

  console.log(`[twilio-webhook] Found connection by phone: user_id=${data?.user_id}, id=${data?.id}`);
  return { userId: data?.user_id || null, connectionId: data?.id || null };
}

// Obtener columna por defecto del usuario o de la conexión
async function getDefaultColumn(supabase: any, userId: string, connectionId: string): Promise<string | null> {
  const { data: connection, error: connError } = await supabase
    .from('twilio_connections')
    .select('default_column_id')
    .eq('id', connectionId)
    .eq('user_id', userId)
    .single();

  if (!connError && connection?.default_column_id) {
    console.log('Using default column from connection:', connection.default_column_id);
    return connection.default_column_id;
  }

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
  twilioConnectionId: string,
  phoneNumber: string,
  pushName: string | null,
  messageContent: string,
  fromMe: boolean
) {
  let { data: conversation, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('phone_number', phoneNumber)
    .eq('channel_type', 'twilio')
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error searching conversation:', error);
    return null;
  }

  if (!conversation) {
    const newConversation = {
      user_id: userId,
      phone_number: phoneNumber,
      pushname: pushName,
      last_message: messageContent,
      last_message_time: new Date().toISOString(),
      unread_count: fromMe ? 0 : 1,
      status: 'active',
      channel_type: 'twilio',
      twilio_connection_id: twilioConnectionId,
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
    const updateData: any = {
      last_message: messageContent,
      last_message_time: new Date().toISOString(),
      pushname: pushName || conversation.pushname,
      twilio_connection_id: twilioConnectionId,
    };
    
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

// Guardar mensaje en la base de datos - AHORA SOPORTA MEDIA
async function saveMessage(
  supabase: any,
  conversationId: string,
  userId: string,
  messageContent: string,
  fromMe: boolean,
  twilioMessageId: string,
  mediaUrl: string | null = null,
  mediaType: string = 'text',
  mimeType: string | null = null
) {
  const message = {
    conversation_id: conversationId,
    user_id: userId,
    content: messageContent || '',
    direction: fromMe ? 'outbound' : 'inbound',
    status: 'delivered',
    message_type: mediaType,
    is_bot: false,
    file_url: mediaUrl,
    attachment_url: mediaUrl,
    created_at: new Date().toISOString(),
    metadata: {
      twilio_message_id: twilioMessageId,
      channel: 'twilio_whatsapp',
      mime_type: mimeType,
      has_media: !!mediaUrl
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

  console.log('Message saved:', data.id, 'mediaType:', mediaType, 'hasMedia:', !!mediaUrl);
  return data;
}

// Buscar o crear lead
async function getOrCreateLead(
  supabase: any,
  userId: string,
  phoneNumber: string,
  pushName: string | null,
  connectionId: string
) {
  let { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .eq('phone', phoneNumber)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error searching lead:', error);
    return { lead: null, isNew: false };
  }

  if (!lead) {
    const defaultColumnId = await getDefaultColumn(supabase, userId, connectionId);
    if (!defaultColumnId) {
      console.error('No default column found for user');
      return { lead: null, isNew: false };
    }

    const position = await getNextPosition(supabase, defaultColumnId);

    const newLead = {
      user_id: userId,
      column_id: defaultColumnId,
      name: pushName || phoneNumber,
      phone: phoneNumber,
      position: position,
      notes: 'Lead creado automáticamente desde Twilio WhatsApp',
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

    console.log('New lead created:', created.id);
    return { lead: created, isNew: true };
  }

  console.log('Lead already exists:', lead.id);
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

  console.log('Conversation linked to lead');
  return true;
}

// Guardar contacto automáticamente
async function getOrCreateContact(
  supabase: any,
  userId: string,
  phoneNumber: string,
  pushName: string | null
) {
  const { data: existing } = await supabase
    .from('contacts')
    .select('id')
    .eq('user_id', userId)
    .eq('phone_number', phoneNumber)
    .single();

  if (existing) {
    console.log('Contact already exists:', existing.id);
    return existing;
  }

  const { data: created, error } = await supabase
    .from('contacts')
    .insert({
      user_id: userId,
      phone_number: phoneNumber,
      name: pushName || phoneNumber,
      origin: 'twilio_whatsapp',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating contact:', error);
    return null;
  }

  console.log('New contact created:', created.id);
  return created;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Extraer connectionId de la URL si existe
    const url = new URL(req.url);
    const connectionIdFromUrl = url.searchParams.get('connectionId');
    console.log(`[twilio-webhook] Request URL: ${req.url}`);
    console.log(`[twilio-webhook] connectionId from URL: ${connectionIdFromUrl || 'not provided'}`);

    // Parsear datos de Twilio (application/x-www-form-urlencoded)
    const formData = await req.formData();
    const twilioData: any = {};
    for (const [key, value] of formData.entries()) {
      twilioData[key] = value;
    }

    console.log('[twilio-webhook] Received Twilio data:', JSON.stringify(twilioData));

    const fromNumber = twilioData.From || ''; // whatsapp:+1234567890
    const toNumber = twilioData.To || '';
    const messageBody = twilioData.Body || '';
    const twilioMessageId = twilioData.MessageSid || '';
    const profileName = twilioData.ProfileName || null;
    
    // PROCESAR MEDIA ATTACHMENTS
    const numMedia = parseInt(twilioData.NumMedia || '0', 10);
    let mediaUrl: string | null = null;
    let mediaType = 'text';
    let mimeType: string | null = null;
    
    if (numMedia > 0) {
      // Twilio envía MediaUrl0, MediaUrl1, etc.
      mediaUrl = twilioData.MediaUrl0 || null;
      mimeType = twilioData.MediaContentType0 || null;
      
      console.log(`[twilio-webhook] Media detected: numMedia=${numMedia}, url=${mediaUrl}, mimeType=${mimeType}`);
      
      // Determinar tipo de media
      if (mimeType) {
        if (mimeType.startsWith('image/')) {
          mediaType = 'image';
        } else if (mimeType.startsWith('video/')) {
          mediaType = 'video';
        } else if (mimeType.startsWith('audio/')) {
          mediaType = 'audio';
        } else {
          mediaType = 'document';
        }
      }
    }

    // Normalizar números
    const phoneNumber = normalizePhoneNumber(fromNumber);
    const twilioPhoneNumber = normalizePhoneNumber(toNumber);

    console.log(`Message from: ${phoneNumber}, to: ${twilioPhoneNumber}`);
    console.log(`Content: ${messageBody.substring(0, 50)}... | Media: ${mediaType} (${numMedia} files)`);

    // Obtener user_id y connection_id desde el número de Twilio o connectionId de URL
    const { userId, connectionId } = await getUserIdFromTwilioNumber(supabase, toNumber, connectionIdFromUrl);
    if (!userId || !connectionId) {
      console.error('Could not get user_id or connection_id from Twilio number');
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    console.log(`User ID: ${userId}, Connection ID: ${connectionId}`);

    // Determinar contenido del mensaje para mostrar
    const displayContent = messageBody || (mediaUrl ? `📎 [${mediaType}]` : '');

    // Buscar o crear conversación
    const conversation = await getOrCreateConversation(
      supabase,
      userId,
      connectionId,
      phoneNumber,
      profileName,
      displayContent,
      false // fromMe = false (mensaje entrante)
    );

    if (!conversation) {
      console.error('Failed to create/get conversation');
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    // Guardar mensaje CON MEDIA
    await saveMessage(supabase, conversation.id, userId, displayContent, false, twilioMessageId, mediaUrl, mediaType, mimeType);

    // Crear lead si es nuevo contacto
    const { lead, isNew: isNewLead } = await getOrCreateLead(supabase, userId, phoneNumber, profileName, connectionId);
    
    if (lead && !conversation.lead_id) {
      await linkConversationToLead(supabase, conversation.id, lead.id);
    }

    // Crear contacto
    await getOrCreateContact(supabase, userId, phoneNumber, profileName);

    // Enviar al webhook externo N8N
    const isNewConversation = !conversation.lead_id && conversation.unread_count === 1;
    if (isNewConversation) {
      const webhookPayload = {
        type: 'incoming_message',
        is_new_contact: isNewLead,
        source: 'twilio_whatsapp',
        timestamp: new Date().toISOString(),
        twilio_data: twilioData,
        message: {
          id: twilioMessageId,
          content: messageBody,
          type: 'text',
          direction: 'inbound',
        },
        conversation: conversation,
        lead: lead,
        extracted_fields: {
          phone_number_normalized: phoneNumber,
          phone_number_raw: fromNumber,
          profile_name: profileName,
        },
      };
      
      sendToExternalWebhook(webhookPayload).catch(err => 
        console.error('Failed to send to webhook:', err)
      );
    }

    // Agregar al buffer de respuestas IA - verificar ai_enabled de la conexión Twilio
    const { data: twilioConnectionSettings } = await supabase
      .from('twilio_connections')
      .select('ai_enabled')
      .eq('id', connectionId)
      .single();

    if (twilioConnectionSettings?.ai_enabled === true) {
      console.log('[twilio-webhook] Bot enabled, adding to buffer...');
      
      // Estructura del mensaje para el buffer (compatible con WAHA)
      const bufferMessage = {
        type: mediaType,
        content: displayContent,
        imageUrl: mediaType === 'image' ? mediaUrl : null
      };
      
      const { data: existingBuffer } = await supabase
        .from('ai_response_buffer')
        .select('*')
        .eq('conversation_id', conversation.id)
        .eq('processed', false)
        .single();

      if (existingBuffer) {
        const currentMessages = JSON.parse(existingBuffer.accumulated_messages);
        currentMessages.push(bufferMessage);
        
        await supabase
          .from('ai_response_buffer')
          .update({
            message_count: existingBuffer.message_count + 1,
            accumulated_messages: JSON.stringify(currentMessages),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingBuffer.id);

        // Si alcanzó 2 mensajes O ES UNA IMAGEN, procesar inmediatamente
        if (existingBuffer.message_count + 1 >= 2 || mediaType === 'image') {
          console.log('[twilio-webhook] Buffer reached 2 messages or has image, processing...');
          await supabase.functions.invoke('process-ai-buffer', { body: {} });
        }
      } else {
        await supabase
          .from('ai_response_buffer')
          .insert({
            conversation_id: conversation.id,
            user_id: userId,
            message_count: 1,
            accumulated_messages: JSON.stringify([bufferMessage]),
            channel_type: 'twilio',
            twilio_connection_id: connectionId,
            phone_number: phoneNumber,
            processed: false
          })
          .select()
          .single();

        // Si es una imagen, procesar INMEDIATAMENTE (puede ser comprobante de pago)
        if (mediaType === 'image') {
          console.log('[twilio-webhook] Image received, processing immediately...');
          await supabase.functions.invoke('process-ai-buffer', { body: {} });
        } else {
          console.log('[twilio-webhook] New buffer created, scheduling processing in 10 seconds...');

          EdgeRuntime.waitUntil((async () => {
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            const { data: currentBuffer } = await supabase
              .from('ai_response_buffer')
              .select('processed')
              .eq('conversation_id', conversation.id)
              .eq('processed', false)
              .maybeSingle();
            
            if (currentBuffer) {
              console.log('[twilio-webhook] 10 seconds passed, processing buffer...');
              await supabase.functions.invoke('process-ai-buffer', { body: {} });
            }
          })());
        }
      }
    }

    return new Response('OK', {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    });

  } catch (error) {
    console.error('Error in twilio-webhook:', error);
    return new Response('OK', { 
      status: 200, 
      headers: corsHeaders 
    });
  }
});
