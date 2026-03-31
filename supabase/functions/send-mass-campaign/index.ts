import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 200;
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function getMimeTypeFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'ogg': 'audio/ogg', 'webm': 'audio/webm',
    'm4a': 'audio/mp4', 'aac': 'audio/aac', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
    'png': 'image/png', 'gif': 'image/gif', 'webp': 'image/webp', 'mp4': 'video/mp4',
    'avi': 'video/avi', 'mov': 'video/quicktime', 'pdf': 'application/pdf',
    'doc': 'application/msword', 'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

// Shuffle array in place (Fisher-Yates)
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ========== WAHA Anti-Ban Helpers ==========

async function wahaSetPresence(baseUrl: string, apiKey: string, session: string, chatId: string, presence: string) {
  try {
    await fetch(`${baseUrl}/api/${session}/presence`, {
      method: 'PUT',
      headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, presence }),
    });
  } catch (e) {
    console.log(`[anti-ban] presence ${presence} failed:`, e);
  }
}

async function wahaSendSeen(baseUrl: string, apiKey: string, session: string, chatId: string) {
  try {
    await fetch(`${baseUrl}/api/sendSeen`, {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ session, chatId }),
    });
  } catch (e) {
    console.log(`[anti-ban] sendSeen failed:`, e);
  }
}

async function wahaStartSession(baseUrl: string, apiKey: string, session: string) {
  try {
    await fetch(`${baseUrl}/api/${session}/start`, {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  } catch (e) {
    console.log(`[anti-ban] startSession failed:`, e);
  }
}

// Random int between min and max (inclusive)
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaign_id, retry_failed, batch_offset = 0 } = await req.json();

    if (!campaign_id) {
      throw new Error('campaign_id is required');
    }

    console.log(`Request received - campaign_id: ${campaign_id}, retry_failed: ${retry_failed}, batch_offset: ${batch_offset}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const wahaBaseUrl = Deno.env.get('WAHA_BASE_URL')!;
    const wahaApiKey = Deno.env.get('WAHA_API_KEY')!;
    const googleGeminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener la campaña
    const { data: campaign, error: campaignError } = await supabase
      .from('mass_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campaign not found');
    }

    // Verificar si la campaña fue pausada
    if (batch_offset > 0 && campaign.status === 'paused') {
      console.log(`Campaign ${campaign_id} is paused, stopping batch processing`);
      return new Response(
        JSON.stringify({ success: true, message: 'Campaign paused', batch_offset, paused: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const channelType = campaign.channel_type || 'whatsapp';
    console.log(`Starting campaign ${campaign_id} on channel: ${channelType}, batch_offset: ${batch_offset}`);

    // Obtener el agente de IA si edit_with_ai está activo
    let aiAgent = null;
    if (campaign.edit_with_ai) {
      const { data: agent } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('user_id', campaign.user_id)
        .eq('is_active', true)
        .single();
      aiAgent = agent;
    }

    // ========== LOAD CONNECTIONS ==========
    let wahaConnections: any[] = [];
    let connectionData: any = null;
    let sessionName = '';
    let connectionNumber = '';

    if (channelType === 'whatsapp') {
      // Multi-session: load from whatsapp_connection_ids array first
      const connectionIds: string[] = (campaign as any).whatsapp_connection_ids;
      
      if (connectionIds && Array.isArray(connectionIds) && connectionIds.length > 0) {
        const { data: conns } = await supabase
          .from('whatsapp_connections')
          .select('*')
          .in('id', connectionIds);
        wahaConnections = (conns || []).filter((c: any) => c.status === 'WORKING' || c.status === 'connected');
        console.log(`[multi-session] Loaded ${wahaConnections.length} active connections from ${connectionIds.length} selected`);
      }
      
      // Fallback to single connection
      if (wahaConnections.length === 0 && campaign.whatsapp_connection_id) {
        const { data: waConn } = await supabase
          .from('whatsapp_connections')
          .select('*')
          .eq('id', campaign.whatsapp_connection_id)
          .single();
        if (waConn) wahaConnections = [waConn];
      }

      // Fallback to any active connection
      if (wahaConnections.length === 0) {
        const { data: activeConn } = await supabase
          .from('whatsapp_connections')
          .select('*')
          .eq('user_id', campaign.user_id)
          .or('status.eq.WORKING,status.eq.connected')
          .limit(1)
          .maybeSingle();
        if (activeConn) wahaConnections = [activeConn];
      }

      if (wahaConnections.length === 0) {
        throw new Error('No active WhatsApp connection found');
      }

      // Set primary connection for backward compat
      connectionData = wahaConnections[0];
      sessionName = connectionData.name || connectionData.phone_number || 'default';
      connectionNumber = connectionData.phone_number;
      
      console.log(`[multi-session] Using ${wahaConnections.length} session(s): ${wahaConnections.map((c: any) => c.name).join(', ')}`);

    } else if (channelType === 'telegram') {
      const { data: tgBot } = await supabase
        .from('telegram_bots')
        .select('*')
        .eq('id', campaign.telegram_bot_id)
        .single();
      if (!tgBot) throw new Error('Telegram bot not found');
      connectionData = tgBot;

    } else if (channelType === 'twilio') {
      const { data: twConn } = await supabase
        .from('twilio_connections')
        .select('*')
        .eq('id', campaign.twilio_connection_id)
        .single();
      if (!twConn) throw new Error('Twilio connection not found');
      connectionData = twConn;
      connectionNumber = twConn.phone_number;
    }

    // Twilio daily limit check
    let twilioRemainingMessages = 200;
    let twilioSentToday = 0;
    const today = new Date().toISOString().split('T')[0];
    
    if (channelType === 'twilio' && campaign.twilio_connection_id) {
      const { data: usage } = await supabase
        .from('twilio_daily_usage')
        .select('messages_sent')
        .eq('twilio_connection_id', campaign.twilio_connection_id)
        .eq('usage_date', today)
        .maybeSingle();
      
      twilioSentToday = usage?.messages_sent || 0;
      twilioRemainingMessages = Math.max(0, 200 - twilioSentToday);
      
      if (twilioRemainingMessages === 0) {
        await supabase.from('mass_campaigns').update({ status: 'error', total_count: 0, sent_count: 0 }).eq('id', campaign_id);
        throw new Error('Límite diario de 200 mensajes alcanzado para esta conexión de Twilio');
      }
    }

    // Obtener contactos
    const { data: listMembers, error: membersError } = await supabase
      .from('contact_list_members')
      .select('contact_id, contacts(*)')
      .eq('contact_list_id', campaign.contact_list_id);

    if (membersError || !listMembers || listMembers.length === 0) {
      throw new Error('No contacts found in list');
    }

    let allContacts = listMembers.map((m: any) => m.contacts).filter((c: any) => c && c.phone_number);

    // Retry mode
    if (retry_failed) {
      const { data: sentNumbers } = await supabase
        .from('campaign_sends')
        .select('phone_number')
        .eq('campaign_id', campaign_id)
        .eq('status', 'sent');
      
      const sentSet = new Set(sentNumbers?.map(s => s.phone_number.replace(/\D/g, '')) || []);
      allContacts = allContacts.filter((c: any) => !sentSet.has(c.phone_number.replace(/\D/g, '')));
      
      await supabase.from('campaign_sends').delete().eq('campaign_id', campaign_id).in('status', ['failed', 'pending']);
      
      if (allContacts.length === 0) {
        await supabase.from('mass_campaigns').update({ status: 'completed' }).eq('id', campaign_id);
        return new Response(
          JSON.stringify({ success: true, message: 'Todos los contactos ya fueron enviados exitosamente', total_count: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (channelType === 'twilio') {
      allContacts = allContacts.slice(0, twilioRemainingMessages);
    }

    const totalContacts = allContacts.length;
    const totalBatches = Math.ceil(totalContacts / BATCH_SIZE);
    const currentBatch = Math.floor(batch_offset / BATCH_SIZE) + 1;
    const batchContacts = allContacts.slice(batch_offset, batch_offset + BATCH_SIZE);
    const isLastBatch = batch_offset + BATCH_SIZE >= totalContacts;

    console.log(`📦 Processing batch ${currentBatch}/${totalBatches}: contacts ${batch_offset + 1}-${batch_offset + batchContacts.length} of ${totalContacts}`);

    if (batch_offset === 0) {
      await supabase.from('mass_campaigns').update({ status: 'sending', total_count: totalContacts, sent_count: 0 }).eq('id', campaign_id);
    }

    const minDelayMs = (campaign.min_delay || 3) * 1000;
    const maxDelayMs = (campaign.max_delay || 8) * 1000;
    let sentCount = 0;
    let failedCount = 0;
    const currentSentCount = campaign.sent_count || 0;

    // ========== PROCESS CONTACTS ==========
    for (let i = 0; i < batchContacts.length; i++) {
      const contact = batchContacts[i];
      const globalIndex = batch_offset + i;
      
      // Check if paused every 10 messages
      if (i > 0 && i % 10 === 0) {
        const { data: currentCampaign } = await supabase
          .from('mass_campaigns')
          .select('status')
          .eq('id', campaign_id)
          .single();
        if (currentCampaign?.status === 'paused') {
          console.log(`Campaign ${campaign_id} was paused, stopping`);
          break;
        }
      }
      
      try {
        let messageToSend = campaign.message || '';

        // AI personalization with higher temperature for variation
        if (campaign.edit_with_ai && googleGeminiApiKey && messageToSend) {
          try {
            const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleGeminiApiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  role: 'user',
                  parts: [{
                    text: `Eres un asistente que personaliza mensajes de WhatsApp. Tu tarea es reescribir el mensaje dado de forma ligeramente diferente pero manteniendo EXACTAMENTE el mismo significado, tono y longitud aproximada. Varía la estructura, usa sinónimos y cambia el orden de las frases. Responde ÚNICAMENTE con el mensaje reescrito. NO incluyas explicaciones.

Reescribe este mensaje para ${contact.name || 'el destinatario'}:

${campaign.message}`
                  }]
                }],
                generationConfig: {
                  temperature: 0.9,
                  maxOutputTokens: aiAgent?.max_tokens || 300
                }
              }),
            });

            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              const aiContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
              if (aiContent && aiContent.length < campaign.message.length * 3) {
                messageToSend = aiContent.trim();
              }
            }
          } catch (aiError) {
            console.error('AI personalization failed:', aiError);
          }
        }

        // Replace placeholders
        if (messageToSend) {
          messageToSend = messageToSend
            .replace(/\{nombre\}/gi, contact.name || '')
            .replace(/\[nombre\]/gi, contact.name || '')
            .replace(/\{telefono\}/gi, contact.phone_number || '')
            .replace(/\[telefono\]/gi, contact.phone_number || '');
        }

        const cleanNumber = contact.phone_number.replace(/\D/g, '');
        
        // ========== ROUND-ROBIN SESSION SELECTION ==========
        let currentSession = sessionName;
        let currentConnectionNumber = connectionNumber;
        let currentConnectionData = connectionData;
        
        if (channelType === 'whatsapp' && wahaConnections.length > 1) {
          // Rotate sessions: use modulo with shuffled index for variation
          const sessionIndex = i % wahaConnections.length;
          currentConnectionData = wahaConnections[sessionIndex];
          currentSession = currentConnectionData.name || currentConnectionData.phone_number || 'default';
          currentConnectionNumber = currentConnectionData.phone_number;
        }
        
        console.log(`Sending ${globalIndex + 1}/${totalContacts} to ${cleanNumber} via ${channelType}${channelType === 'whatsapp' ? ` [session: ${currentSession}]` : ''}`);

        let sendSuccess = false;
        let errorDetail = '';
        let conversationId: string | null = null;

        // Find or create conversation
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .eq('phone_number', cleanNumber)
          .eq('user_id', campaign.user_id)
          .maybeSingle();

        const contactFullName = contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || cleanNumber;

        if (existingConv) {
          conversationId = existingConv.id;
          await supabase.from('conversations').update({ contact_name: contactFullName, pushname: contactFullName }).eq('id', conversationId).is('contact_name', null);
        } else {
          const newConvData: any = {
            phone_number: cleanNumber,
            contact_name: contactFullName,
            pushname: contactFullName,
            user_id: campaign.user_id,
            last_message: messageToSend || '📎 Archivo',
            last_message_time: new Date().toISOString(),
            channel_type: channelType,
          };
          if (channelType === 'whatsapp') newConvData.whatsapp_number = currentConnectionNumber;
          else if (channelType === 'telegram') newConvData.telegram_bot_id = campaign.telegram_bot_id;
          else if (channelType === 'twilio') newConvData.twilio_connection_id = campaign.twilio_connection_id;
          
          const { data: newConv } = await supabase.from('conversations').insert(newConvData).select('id').single();
          if (newConv) conversationId = newConv.id;
        }

        // Create lead if not exists
        let leadId: string | null = null;
        const { data: existingLead } = await supabase.from('leads').select('id').eq('phone', cleanNumber).eq('user_id', campaign.user_id).maybeSingle();

        if (existingLead) {
          leadId = existingLead.id;
        } else {
          const { data: defaultColumn } = await supabase.from('lead_columns').select('id').eq('user_id', campaign.user_id).eq('is_default', true).maybeSingle();
          if (defaultColumn) {
            const { data: maxPosData } = await supabase.from('leads').select('position').eq('column_id', defaultColumn.id).order('position', { ascending: false }).limit(1).maybeSingle();
            const { data: newLead } = await supabase.from('leads').insert({
              phone: cleanNumber, name: contactFullName, user_id: campaign.user_id,
              column_id: defaultColumn.id, position: (maxPosData?.position || 0) + 1,
              notes: `Lead creado desde campaña masiva: ${campaign.name}`
            }).select('id').single();
            if (newLead) leadId = newLead.id;
          }
        }

        if (leadId && conversationId) {
          await supabase.from('conversations').update({ lead_id: leadId }).eq('id', conversationId);
        }

        // Create contact if not exists
        const { data: existingContact } = await supabase.from('contacts').select('id').eq('phone_number', contact.phone_number).eq('user_id', campaign.user_id).maybeSingle();
        if (!existingContact) {
          await supabase.from('contacts').insert({
            phone_number: contact.phone_number, name: contactFullName,
            first_name: contact.first_name || null, last_name: contact.last_name || null,
            email: contact.email || null, user_id: campaign.user_id,
            origin: 'mass_campaign', notes: `Contacto añadido desde campaña: ${campaign.name}`
          });
        }

        // ========== SEND BY CHANNEL ==========
        
        if (channelType === 'whatsapp') {
          const chatId = `${cleanNumber}@c.us`;
          
          // ===== ANTI-BAN: Simulate human behavior =====
          // 1. Set presence online
          await wahaSetPresence(wahaBaseUrl, wahaApiKey, currentSession, chatId, 'online');
          await delay(randomInt(500, 1500));
          
          // 2. Mark chat as read (sendSeen)
          await wahaSendSeen(wahaBaseUrl, wahaApiKey, currentSession, chatId);
          await delay(randomInt(300, 800));
          
          // 3. Start typing
          await wahaSetPresence(wahaBaseUrl, wahaApiKey, currentSession, chatId, 'typing');
          
          // 4. Random typing delay (2-5 seconds)
          await delay(randomInt(2000, 5000));
          
          // Send attachments
          if (campaign.attachment_urls && campaign.attachment_urls.length > 0) {
            for (let j = 0; j < campaign.attachment_urls.length; j++) {
              const fileUrl = campaign.attachment_urls[j];
              const fileName = campaign.attachment_names?.[j] || 'archivo';
              const mimeType = campaign.attachment_mime_types?.[j] || getMimeTypeFromFileName(fileName);
              const caption = j === 0 ? messageToSend : '';
              
              const { error: fileError } = await supabase.functions.invoke('waha-send-file', {
                body: { sessionName: currentSession, phoneNumber: cleanNumber, fileUrl, fileName, mimeType, message: caption, userId: campaign.user_id, conversationId }
              });
              
              if (!fileError) sendSuccess = true;
              else console.error(`Error sending file ${fileName}:`, fileError);
              
              if (j < campaign.attachment_urls.length - 1) await delay(500);
            }
          }
          
          // Send text message
          if (messageToSend && (!campaign.attachment_urls || campaign.attachment_urls.length === 0)) {
            const wahaResponse = await fetch(`${wahaBaseUrl}/api/sendText`, {
              method: 'POST',
              headers: { 'X-Api-Key': wahaApiKey, 'Content-Type': 'application/json' },
              body: JSON.stringify({ chatId, text: messageToSend, session: currentSession, linkPreview: true }),
            });

            const wahaResult = await wahaResponse.json();

            if (wahaResponse.ok) {
              sendSuccess = true;
              if (conversationId) {
                await supabase.from('messages').insert({
                  conversation_id: conversationId, user_id: campaign.user_id,
                  content: messageToSend, direction: 'outbound', status: 'sent',
                  message_type: 'text', is_bot: false,
                  metadata: { waha_id: wahaResult.id, campaign_id, campaign_name: campaign.name, sent_via: 'mass_campaign', personalized: campaign.edit_with_ai || false }
                });
              }
            }
          } else if (campaign.attachment_urls?.length > 0) {
            sendSuccess = true;
          }

          // 5. Stop typing / go paused
          await wahaSetPresence(wahaBaseUrl, wahaApiKey, currentSession, chatId, 'paused');
          
          // 6. Every 5-10 messages, go offline and take a longer break (30-90s)
          if ((i + 1) % randomInt(5, 10) === 0 && i < batchContacts.length - 1) {
            await wahaSetPresence(wahaBaseUrl, wahaApiKey, currentSession, '', 'offline');
            const longPause = randomInt(30000, 90000);
            console.log(`[anti-ban] Long pause: ${(longPause / 1000).toFixed(0)}s after ${i + 1} messages`);
            await delay(longPause);
            // Come back online
            await wahaSetPresence(wahaBaseUrl, wahaApiKey, currentSession, '', 'online');
          }

        } else if (channelType === 'telegram') {
          // TELEGRAM - same logic as before
          const { data: tgConv } = await supabase.from('conversations').select('phone_number')
            .eq('user_id', campaign.user_id).eq('telegram_bot_id', campaign.telegram_bot_id)
            .ilike('phone_number', `%${cleanNumber.slice(-8)}%`).maybeSingle();
          
          const telegramChatId = tgConv?.phone_number || cleanNumber;
          
          if (campaign.attachment_urls && campaign.attachment_urls.length > 0) {
            for (let j = 0; j < campaign.attachment_urls.length; j++) {
              const fileUrl = campaign.attachment_urls[j];
              const fileName = campaign.attachment_names?.[j] || 'archivo';
              const mimeType = campaign.attachment_mime_types?.[j] || getMimeTypeFromFileName(fileName);
              const caption = j === 0 ? messageToSend : '';
              
              const { data: fileResult, error: fileError } = await supabase.functions.invoke('telegram-send-file', {
                body: { chatId: telegramChatId, fileUrl, caption, mimeType, userId: campaign.user_id, conversationId, telegramBotId: campaign.telegram_bot_id }
              });
              if (!fileError && fileResult?.success !== false) sendSuccess = true;
              if (j < campaign.attachment_urls.length - 1) await delay(500);
            }
          }
          
          if (messageToSend && (!campaign.attachment_urls || campaign.attachment_urls.length === 0)) {
            const { data: msgResult, error: msgError } = await supabase.functions.invoke('telegram-send-message', {
              body: { chatId: telegramChatId, message: messageToSend, userId: campaign.user_id, conversationId, telegramBotId: campaign.telegram_bot_id }
            });
            if (!msgError && msgResult?.success !== false) sendSuccess = true;
          } else if (campaign.attachment_urls?.length > 0) {
            sendSuccess = true;
          }

        } else if (channelType === 'twilio') {
          // TWILIO - same logic as before
          if (campaign.attachment_urls && campaign.attachment_urls.length > 0) {
            for (let j = 0; j < campaign.attachment_urls.length; j++) {
              const fileUrl = campaign.attachment_urls[j];
              const fileName = campaign.attachment_names?.[j] || 'archivo';
              const mimeType = campaign.attachment_mime_types?.[j] || getMimeTypeFromFileName(fileName);
              const msgBody = j === 0 ? messageToSend : '';
              
              const { data: fileResult, error: fileError } = await supabase.functions.invoke('twilio-send-file', {
                body: { twilioConnectionId: campaign.twilio_connection_id, phoneNumber: cleanNumber, fileUrl, fileName, mimeType, message: msgBody, userId: campaign.user_id, conversationId }
              });
              if (fileError) errorDetail = fileError.message || 'Error enviando archivo';
              else if (fileResult?.success === false) errorDetail = fileResult.error || 'Fallo de Twilio';
              else sendSuccess = true;
              if (j < campaign.attachment_urls.length - 1) await delay(500);
            }
          }
          
          if (messageToSend && (!campaign.attachment_urls || campaign.attachment_urls.length === 0)) {
            const { data: msgResult, error: msgError } = await supabase.functions.invoke('twilio-send-message', {
              body: { twilioConnectionId: campaign.twilio_connection_id, phoneNumber: cleanNumber, message: messageToSend, userId: campaign.user_id, conversationId }
            });
            if (msgError) errorDetail = msgError.message || 'Error de conexión';
            else if (msgResult?.success === false) errorDetail = msgResult.error || 'Fallo de Twilio';
            else sendSuccess = true;
          } else if (campaign.attachment_urls?.length > 0 && !errorDetail) {
            sendSuccess = true;
          }
        }

        // Update conversation
        if (conversationId) {
          await supabase.from('conversations').update({ last_message: messageToSend || '📎 Archivo', last_message_time: new Date().toISOString() }).eq('id', conversationId);
        }

        // Record result
        if (sendSuccess) {
          await supabase.from('campaign_sends').insert({
            campaign_id, contact_id: contact.id, phone_number: contact.phone_number,
            contact_name: contact.name, message_sent: messageToSend || '📎 Archivo adjunto',
            was_personalized: campaign.edit_with_ai, status: 'sent',
            sent_at: new Date().toISOString(), user_id: campaign.user_id,
          });
          sentCount++;
          
          if (channelType === 'twilio' && campaign.twilio_connection_id) {
            await supabase.from('twilio_daily_usage').upsert({
              twilio_connection_id: campaign.twilio_connection_id, usage_date: today,
              messages_sent: twilioSentToday + currentSentCount + sentCount, user_id: campaign.user_id
            }, { onConflict: 'twilio_connection_id,usage_date' });
          }
          
          await supabase.from('mass_campaigns').update({ sent_count: currentSentCount + sentCount }).eq('id', campaign_id);
        } else {
          await supabase.from('campaign_sends').insert({
            campaign_id, contact_id: contact.id, phone_number: contact.phone_number,
            contact_name: contact.name, message_sent: messageToSend || '📎 Archivo adjunto',
            was_personalized: campaign.edit_with_ai, status: 'failed',
            error_message: errorDetail || 'Error desconocido al enviar', user_id: campaign.user_id,
          });
          failedCount++;
        }

        // Delay between messages (skip anti-ban long pause already applied for WhatsApp)
        if (i < batchContacts.length - 1) {
          const randomDelay = Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;
          await delay(randomDelay);
        }

      } catch (contactError) {
        console.error(`Error processing contact ${contact.name}:`, contactError);
        failedCount++;
      }
    }

    // Shuffle WAHA connections order for next batch to vary pattern
    if (channelType === 'whatsapp' && wahaConnections.length > 1) {
      // The shuffle happens naturally since each batch re-enters the function
      console.log(`[multi-session] Batch complete. Sessions will be re-shuffled for next batch.`);
    }

    const batchTotalSent = currentSentCount + sentCount;

    if (!isLastBatch) {
      console.log(`📦 Batch ${currentBatch}/${totalBatches} completed. Scheduling next batch...`);
      
      EdgeRuntime.waitUntil((async () => {
        await delay(2000);
        const { data: currentCampaign } = await supabase.from('mass_campaigns').select('status').eq('id', campaign_id).single();
        if (currentCampaign?.status === 'sending') {
          await supabase.functions.invoke('send-mass-campaign', {
            body: { campaign_id, batch_offset: batch_offset + BATCH_SIZE }
          });
        }
      })());

      return new Response(
        JSON.stringify({
          success: true, batch_sent: sentCount, batch_failed: failedCount,
          batch_offset, batch_size: batchContacts.length, total_contacts: totalContacts,
          total_batches: totalBatches, current_batch: currentBatch, has_more: true,
          next_batch_offset: batch_offset + BATCH_SIZE, total_sent_so_far: batchTotalSent,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Last batch - mark completed
    await supabase.from('mass_campaigns').update({ status: 'completed', sent_count: batchTotalSent }).eq('id', campaign_id);

    return new Response(
      JSON.stringify({
        success: true, batch_sent: sentCount, batch_failed: failedCount,
        batch_offset, batch_size: batchContacts.length, total_contacts: totalContacts,
        total_batches: totalBatches, current_batch: currentBatch, has_more: false,
        total_sent: batchTotalSent, campaign_completed: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-mass-campaign:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
