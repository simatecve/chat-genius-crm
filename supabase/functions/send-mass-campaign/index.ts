import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Función de delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper para obtener MIME type de nombre de archivo
function getMimeTypeFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'webm': 'audio/webm',
    'm4a': 'audio/mp4',
    'aac': 'audio/aac',
    // Imágenes
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    // Videos
    'mp4': 'video/mp4',
    'avi': 'video/avi',
    'mov': 'video/quicktime',
    // Documentos
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaign_id } = await req.json();

    if (!campaign_id) {
      throw new Error('campaign_id is required');
    }

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

    const channelType = campaign.channel_type || 'whatsapp';
    console.log(`Starting campaign ${campaign_id} on channel: ${channelType}`);

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

    // Obtener conexión según el canal
    let connectionData: any = null;
    let sessionName = '';
    let connectionNumber = '';

    if (channelType === 'whatsapp') {
      // Obtener conexión de WhatsApp
      const { data: waConn } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('id', campaign.whatsapp_connection_id)
        .single();
      
      if (!waConn) {
        // Fallback: buscar cualquier conexión activa
        const { data: activeConn } = await supabase
          .from('whatsapp_connections')
          .select('*')
          .eq('user_id', campaign.user_id)
          .or('status.eq.WORKING,status.eq.connected')
          .limit(1)
          .maybeSingle();
        connectionData = activeConn;
      } else {
        connectionData = waConn;
      }
      
      if (!connectionData) {
        throw new Error('No active WhatsApp connection found');
      }
      sessionName = connectionData.name || connectionData.phone_number || 'default';
      connectionNumber = connectionData.phone_number;

    } else if (channelType === 'telegram') {
      // Obtener bot de Telegram
      const { data: tgBot } = await supabase
        .from('telegram_bots')
        .select('*')
        .eq('id', campaign.telegram_bot_id)
        .single();
      
      if (!tgBot) {
        throw new Error('Telegram bot not found');
      }
      connectionData = tgBot;

    } else if (channelType === 'twilio') {
      // Obtener conexión de Twilio
      const { data: twConn } = await supabase
        .from('twilio_connections')
        .select('*')
        .eq('id', campaign.twilio_connection_id)
        .single();
      
      if (!twConn) {
        throw new Error('Twilio connection not found');
      }
      connectionData = twConn;
      connectionNumber = twConn.phone_number;
    }

    // Verificar límite diario de Twilio (200 msgs/día)
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
      
      console.log(`Twilio usage today: ${twilioSentToday}/200, remaining: ${twilioRemainingMessages}`);
      
      if (twilioRemainingMessages === 0) {
        // Actualizar campaña a error por límite
        await supabase
          .from('mass_campaigns')
          .update({ 
            status: 'error',
            total_count: 0,
            sent_count: 0
          })
          .eq('id', campaign_id);
        
        throw new Error('Límite diario de 200 mensajes alcanzado para esta conexión de Twilio');
      }
    }

    // Obtener contactos de la lista
    const { data: listMembers, error: membersError } = await supabase
      .from('contact_list_members')
      .select('contact_id, contacts(*)')
      .eq('contact_list_id', campaign.contact_list_id);

    if (membersError || !listMembers || listMembers.length === 0) {
      throw new Error('No contacts found in list');
    }

    let contacts = listMembers
      .map((m: any) => m.contacts)
      .filter((c: any) => c && c.phone_number);

    // Limitar contactos según límite de Twilio
    if (channelType === 'twilio') {
      const originalCount = contacts.length;
      contacts = contacts.slice(0, twilioRemainingMessages);
      if (originalCount > twilioRemainingMessages) {
        console.log(`Twilio limit: Reduced contacts from ${originalCount} to ${contacts.length}`);
      }
    }

    // Actualizar campaña a estado 'sending'
    await supabase
      .from('mass_campaigns')
      .update({ 
        status: 'sending',
        total_count: contacts.length,
        sent_count: 0
      })
      .eq('id', campaign_id);

    console.log(`Campaign ${campaign_id} with ${contacts.length} contacts, ${campaign.attachment_urls?.length || 0} attachments`);

    const minDelayMs = (campaign.min_delay || 3) * 1000;
    const maxDelayMs = (campaign.max_delay || 8) * 1000;
    let sentCount = 0;
    let failedCount = 0;

    // Procesar cada contacto
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      try {
        let messageToSend = campaign.message || '';

        // Personalizar mensaje con IA si está habilitado
        if (campaign.edit_with_ai && googleGeminiApiKey && messageToSend) {
          try {
            console.log(`Personalizing message for ${contact.name} with AI...`);
            const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleGeminiApiKey}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: [{
                  role: 'user',
                  parts: [{
                    text: `Eres un asistente que personaliza mensajes de WhatsApp. Tu tarea es reescribir el mensaje dado de forma ligeramente diferente pero manteniendo EXACTAMENTE el mismo significado, tono y longitud aproximada. Responde ÚNICAMENTE con el mensaje reescrito. NO incluyas explicaciones, opciones alternativas, ni texto adicional.

Reescribe este mensaje para ${contact.name || 'el destinatario'}:

${campaign.message}`
                  }]
                }],
                generationConfig: {
                  temperature: aiAgent?.temperature || 0.7,
                  maxOutputTokens: aiAgent?.max_tokens || 300
                }
              }),
            });

            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              const aiContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
              if (aiContent && aiContent.length < campaign.message.length * 3) {
                messageToSend = aiContent.trim();
                console.log(`AI personalized message: ${messageToSend.substring(0, 50)}...`);
              }
            }
          } catch (aiError) {
            console.error('AI personalization failed, using original message:', aiError);
          }
        }

        // Reemplazar placeholders básicos
        if (messageToSend) {
          messageToSend = messageToSend
            .replace(/\{nombre\}/gi, contact.name || '')
            .replace(/\[nombre\]/gi, contact.name || '')
            .replace(/\{telefono\}/gi, contact.phone_number || '')
            .replace(/\[telefono\]/gi, contact.phone_number || '');
        }

        // Formatear número
        const cleanNumber = contact.phone_number.replace(/\D/g, '');
        
        console.log(`Sending message ${i + 1}/${contacts.length} to ${cleanNumber} via ${channelType}`);

        let sendSuccess = false;
        let conversationId: string | null = null;

        // Buscar o crear conversación
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .eq('phone_number', cleanNumber)
          .eq('user_id', campaign.user_id)
          .maybeSingle();

        // Crear nombre completo del contacto
        const contactFullName = contact.name || 
          `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 
          cleanNumber;

        if (existingConv) {
          conversationId = existingConv.id;
          // Actualizar nombre si no tiene
          await supabase
            .from('conversations')
            .update({ contact_name: contactFullName, pushname: contactFullName })
            .eq('id', conversationId)
            .is('contact_name', null);
        } else {
          // Crear nueva conversación
          const newConvData: any = {
            phone_number: cleanNumber,
            contact_name: contactFullName,
            pushname: contactFullName,
            user_id: campaign.user_id,
            last_message: messageToSend || '📎 Archivo',
            last_message_time: new Date().toISOString(),
            channel_type: channelType,
          };
          
          if (channelType === 'whatsapp') {
            newConvData.whatsapp_number = connectionNumber;
          } else if (channelType === 'telegram') {
            newConvData.telegram_bot_id = campaign.telegram_bot_id;
          } else if (channelType === 'twilio') {
            newConvData.twilio_connection_id = campaign.twilio_connection_id;
          }
          
          const { data: newConv } = await supabase
            .from('conversations')
            .insert(newConvData)
            .select('id')
            .single();
          
          if (newConv) {
            conversationId = newConv.id;
          }
        }

        // ========== CREAR LEAD SI NO EXISTE ==========
        let leadId: string | null = null;
        
        // Buscar lead existente por teléfono
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id')
          .eq('phone', cleanNumber)
          .eq('user_id', campaign.user_id)
          .maybeSingle();

        if (existingLead) {
          leadId = existingLead.id;
          console.log(`Lead found: ${leadId}`);
        } else {
          // Obtener columna por defecto del usuario
          const { data: defaultColumn } = await supabase
            .from('lead_columns')
            .select('id')
            .eq('user_id', campaign.user_id)
            .eq('is_default', true)
            .maybeSingle();

          if (defaultColumn) {
            // Obtener posición máxima en la columna
            const { data: maxPosData } = await supabase
              .from('leads')
              .select('position')
              .eq('column_id', defaultColumn.id)
              .order('position', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            const newPosition = (maxPosData?.position || 0) + 1;

            // Crear nuevo lead
            const { data: newLead, error: leadError } = await supabase
              .from('leads')
              .insert({
                phone: cleanNumber,
                name: contactFullName,
                user_id: campaign.user_id,
                column_id: defaultColumn.id,
                position: newPosition,
                notes: `Lead creado desde campaña masiva: ${campaign.name}`
              })
              .select('id')
              .single();
            
            if (newLead && !leadError) {
              leadId = newLead.id;
              console.log(`Lead created: ${leadId}`);
            } else {
              console.error('Error creating lead:', leadError);
            }
          } else {
            console.log('No default column found, skipping lead creation');
          }
        }

        // Vincular lead a la conversación
        if (leadId && conversationId) {
          await supabase
            .from('conversations')
            .update({ lead_id: leadId })
            .eq('id', conversationId);
        }

        // ========== VERIFICAR/CREAR CONTACTO EN TABLA CONTACTS ==========
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('phone_number', contact.phone_number)
          .eq('user_id', campaign.user_id)
          .maybeSingle();

        if (!existingContact) {
          // Crear contacto si no existe (diferente del que viene de la lista)
          const { error: contactError } = await supabase
            .from('contacts')
            .insert({
              phone_number: contact.phone_number,
              name: contactFullName,
              first_name: contact.first_name || null,
              last_name: contact.last_name || null,
              email: contact.email || null,
              user_id: campaign.user_id,
              origin: 'mass_campaign',
              notes: `Contacto añadido desde campaña: ${campaign.name}`
            });
          
          if (!contactError) {
            console.log(`Contact created for ${cleanNumber}`);
          }
        }

        // ========== ENVÍO SEGÚN CANAL ==========
        
        if (channelType === 'whatsapp') {
          // WHATSAPP - WAHA
          const chatId = `${cleanNumber}@c.us`;
          
          // Si hay archivos adjuntos, enviarlos primero
          if (campaign.attachment_urls && campaign.attachment_urls.length > 0) {
            for (let j = 0; j < campaign.attachment_urls.length; j++) {
              const fileUrl = campaign.attachment_urls[j];
              const fileName = campaign.attachment_names?.[j] || 'archivo';
              const mimeType = campaign.attachment_mime_types?.[j] || getMimeTypeFromFileName(fileName);
              const caption = j === 0 ? messageToSend : ''; // Solo el primer archivo lleva caption
              
              console.log(`Sending file ${j + 1}/${campaign.attachment_urls.length}: ${fileName} (${mimeType})`);
              
              const { data: fileResult, error: fileError } = await supabase.functions.invoke('waha-send-file', {
                body: {
                  sessionName,
                  phoneNumber: cleanNumber,
                  fileUrl,
                  fileName,
                  mimeType,
                  message: caption,
                  userId: campaign.user_id,
                  conversationId,
                }
              });
              
              if (fileError) {
                console.error(`Error sending file ${fileName}:`, fileError);
              } else {
                console.log(`File sent: ${fileName}`);
                sendSuccess = true;
              }
              
              // Pequeño delay entre archivos
              if (j < campaign.attachment_urls.length - 1) {
                await delay(500);
              }
            }
          }
          
          // Si hay mensaje de texto y no se envió con caption, enviarlo separado
          if (messageToSend && (!campaign.attachment_urls || campaign.attachment_urls.length === 0)) {
            const wahaResponse = await fetch(`${wahaBaseUrl}/api/sendText`, {
              method: 'POST',
              headers: {
                'X-Api-Key': wahaApiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                chatId: chatId,
                text: messageToSend,
                session: sessionName,
                linkPreview: true,
              }),
            });

            const wahaResult = await wahaResponse.json();

            if (wahaResponse.ok) {
              sendSuccess = true;
              
              // Guardar mensaje
              if (conversationId) {
                await supabase.from('messages').insert({
                  conversation_id: conversationId,
                  user_id: campaign.user_id,
                  content: messageToSend,
                  direction: 'outbound',
                  status: 'sent',
                  message_type: 'text',
                  is_bot: false,
                  metadata: {
                    waha_id: wahaResult.id,
                    campaign_id: campaign_id,
                    campaign_name: campaign.name,
                    sent_via: 'mass_campaign',
                    personalized: campaign.edit_with_ai || false
                  }
                });
              }
            }
          } else if (campaign.attachment_urls && campaign.attachment_urls.length > 0) {
            // Los archivos ya se guardaron en waha-send-file
            sendSuccess = true;
          }

        } else if (channelType === 'telegram') {
          // TELEGRAM
          // Para Telegram necesitamos el chat_id del contacto
          // Buscar conversación existente para obtener el telegram chat_id
          const { data: tgConv } = await supabase
            .from('conversations')
            .select('phone_number')
            .eq('user_id', campaign.user_id)
            .eq('telegram_bot_id', campaign.telegram_bot_id)
            .ilike('phone_number', `%${cleanNumber.slice(-8)}%`)
            .maybeSingle();
          
          const telegramChatId = tgConv?.phone_number || cleanNumber;
          
          // Enviar archivos si hay
          if (campaign.attachment_urls && campaign.attachment_urls.length > 0) {
            for (let j = 0; j < campaign.attachment_urls.length; j++) {
              const fileUrl = campaign.attachment_urls[j];
              const fileName = campaign.attachment_names?.[j] || 'archivo';
              const mimeType = campaign.attachment_mime_types?.[j] || getMimeTypeFromFileName(fileName);
              const caption = j === 0 ? messageToSend : '';
              
              const { error: fileError } = await supabase.functions.invoke('telegram-send-file', {
                body: {
                  chatId: telegramChatId,
                  fileUrl,
                  caption,
                  mimeType,
                  userId: campaign.user_id,
                  conversationId,
                  telegramBotId: campaign.telegram_bot_id,
                }
              });
              
              if (!fileError) {
                sendSuccess = true;
              }
              
              if (j < campaign.attachment_urls.length - 1) {
                await delay(500);
              }
            }
          }
          
          // Enviar texto si no hay archivos o si los archivos no llevaron caption
          if (messageToSend && (!campaign.attachment_urls || campaign.attachment_urls.length === 0)) {
            const { error: msgError } = await supabase.functions.invoke('telegram-send-message', {
              body: {
                chatId: telegramChatId,
                message: messageToSend,
                userId: campaign.user_id,
                conversationId,
                telegramBotId: campaign.telegram_bot_id,
              }
            });
            
            if (!msgError) {
              sendSuccess = true;
            }
          } else if (campaign.attachment_urls && campaign.attachment_urls.length > 0) {
            sendSuccess = true;
          }

        } else if (channelType === 'twilio') {
          // TWILIO
          // Enviar archivos si hay
          if (campaign.attachment_urls && campaign.attachment_urls.length > 0) {
            for (let j = 0; j < campaign.attachment_urls.length; j++) {
              const fileUrl = campaign.attachment_urls[j];
              const fileName = campaign.attachment_names?.[j] || 'archivo';
              const mimeType = campaign.attachment_mime_types?.[j] || getMimeTypeFromFileName(fileName);
              const msgBody = j === 0 ? messageToSend : '';
              
              const { error: fileError } = await supabase.functions.invoke('twilio-send-file', {
                body: {
                  twilioConnectionId: campaign.twilio_connection_id,
                  phoneNumber: cleanNumber,
                  fileUrl,
                  fileName,
                  mimeType,
                  message: msgBody,
                  userId: campaign.user_id,
                  conversationId,
                }
              });
              
              if (!fileError) {
                sendSuccess = true;
              }
              
              if (j < campaign.attachment_urls.length - 1) {
                await delay(500);
              }
            }
          }
          
          // Enviar texto si no hay archivos
          if (messageToSend && (!campaign.attachment_urls || campaign.attachment_urls.length === 0)) {
            const { error: msgError } = await supabase.functions.invoke('twilio-send-message', {
              body: {
                twilioConnectionId: campaign.twilio_connection_id,
                phoneNumber: cleanNumber,
                message: messageToSend,
                userId: campaign.user_id,
                conversationId,
              }
            });
            
            if (!msgError) {
              sendSuccess = true;
            }
          } else if (campaign.attachment_urls && campaign.attachment_urls.length > 0) {
            sendSuccess = true;
          }
        }

        // Actualizar conversación
        if (conversationId) {
          await supabase
            .from('conversations')
            .update({
              last_message: messageToSend || '📎 Archivo',
              last_message_time: new Date().toISOString(),
            })
            .eq('id', conversationId);
        }

        // Registrar resultado
        if (sendSuccess) {
          console.log(`✅ Message sent to ${contact.name}`);
          
          await supabase.from('campaign_sends').insert({
            campaign_id: campaign_id,
            contact_id: contact.id,
            phone_number: contact.phone_number,
            contact_name: contact.name,
            message_sent: messageToSend || '📎 Archivo adjunto',
            was_personalized: campaign.edit_with_ai,
            status: 'sent',
            sent_at: new Date().toISOString(),
            user_id: campaign.user_id,
          });

          sentCount++;
          
          // Actualizar contador de Twilio
          if (channelType === 'twilio' && campaign.twilio_connection_id) {
            await supabase
              .from('twilio_daily_usage')
              .upsert({
                twilio_connection_id: campaign.twilio_connection_id,
                usage_date: today,
                messages_sent: twilioSentToday + sentCount,
                user_id: campaign.user_id
              }, { onConflict: 'twilio_connection_id,usage_date' });
          }
          
          await supabase
            .from('mass_campaigns')
            .update({ sent_count: sentCount })
            .eq('id', campaign_id);

        } else {
          console.error(`❌ Failed to send to ${contact.name}`);
          
          await supabase.from('campaign_sends').insert({
            campaign_id: campaign_id,
            contact_id: contact.id,
            phone_number: contact.phone_number,
            contact_name: contact.name,
            message_sent: messageToSend || '📎 Archivo adjunto',
            was_personalized: campaign.edit_with_ai,
            status: 'failed',
            error_message: 'Send failed',
            user_id: campaign.user_id,
          });
          
          failedCount++;
        }

        // Delay antes del siguiente mensaje (excepto el último)
        if (i < contacts.length - 1) {
          const randomDelay = Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;
          console.log(`Waiting ${randomDelay}ms before next message...`);
          await delay(randomDelay);
        }

      } catch (contactError) {
        console.error(`Error processing contact ${contact.name}:`, contactError);
        failedCount++;
      }
    }

    // Marcar campaña como completada
    await supabase
      .from('mass_campaigns')
      .update({ 
        status: 'completed',
        sent_count: sentCount,
      })
      .eq('id', campaign_id);

    console.log(`Campaign ${campaign_id} completed: ${sentCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent_count: sentCount,
        failed_count: failedCount,
        total_count: contacts.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-mass-campaign:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});