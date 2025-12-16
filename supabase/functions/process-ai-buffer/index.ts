import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Check if AI is enabled for a specific session
async function isSessionAIEnabled(supabase: any, channelType: string, buffer: any): Promise<boolean> {
  let table: string;
  let sessionId: string | null = null;

  switch (channelType) {
    case 'telegram':
      table = 'telegram_bots';
      sessionId = buffer.telegram_bot_id;
      break;
    case 'twilio':
      table = 'twilio_connections';
      sessionId = buffer.twilio_connection_id;
      break;
    case 'webchat':
      // For webchat, we need to get the web_chatbot_id from the conversation
      const { data: conv } = await supabase
        .from('conversations')
        .select('phone_number')
        .eq('id', buffer.conversation_id)
        .single();
      
      if (conv) {
        // Find webchat by matching session
        const { data: webchat } = await supabase
          .from('web_chatbots')
          .select('id, ai_enabled')
          .eq('user_id', buffer.user_id)
          .single();
        
        return webchat?.ai_enabled ?? false;
      }
      return false;
    default:
      // WhatsApp - find by session name
      if (buffer.session_name) {
        const { data: whatsappConn } = await supabase
          .from('whatsapp_connections')
          .select('id, ai_enabled')
          .eq('user_id', buffer.user_id)
          .eq('name', buffer.session_name)
          .single();
        
        return whatsappConn?.ai_enabled ?? false;
      }
      return false;
  }

  if (!sessionId) {
    console.log(`[process-ai-buffer] No session ID found for ${channelType}`);
    return false;
  }

  const { data: session } = await supabase
    .from(table)
    .select('ai_enabled')
    .eq('id', sessionId)
    .single();

  return session?.ai_enabled ?? false;
}

// Procesar un buffer de mensajes
async function processBuffer(supabase: any, buffer: any) {
  try {
    console.log(`[process-ai-buffer] Processing buffer ${buffer.id} with ${buffer.message_count} messages`);
    
    const channelType = buffer.channel_type;

    // Check if AI is enabled for this specific session
    const aiEnabled = await isSessionAIEnabled(supabase, channelType, buffer);
    
    if (!aiEnabled) {
      console.log(`[process-ai-buffer] AI not enabled for session, skipping buffer ${buffer.id}`);
      await supabase
        .from('ai_response_buffer')
        .update({ processed: true })
        .eq('id', buffer.id);
      return;
    }
    
    // accumulated_messages puede venir como string JSON o ya parseado
    let messages: any[];
    if (typeof buffer.accumulated_messages === 'string') {
      messages = JSON.parse(buffer.accumulated_messages);
    } else {
      messages = buffer.accumulated_messages;
    }
    console.log(`[process-ai-buffer] Messages after parse: ${JSON.stringify(messages)}`);
    
    const conversationId = buffer.conversation_id;
    const userId = buffer.user_id;

    // Obtener datos de la conversación
    const { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      console.error('[process-ai-buffer] Conversation not found');
      return;
    }

    // Verificar si el bot está habilitado globalmente
    const { data: botSettings } = await supabase
      .from('user_bot_settings')
      .select('bot_enabled')
      .eq('user_id', userId)
      .single();

    if (botSettings?.bot_enabled === false) {
      console.log('[process-ai-buffer] Bot disabled globally, skipping');
      await supabase
        .from('ai_response_buffer')
        .update({ processed: true })
        .eq('id', buffer.id);
      return;
    }

    // Verificar si el contacto bloqueó el bot
    const { data: blockedContact } = await supabase
      .from('contacto_bloqueado_bot')
      .select('id')
      .eq('user_id', userId)
      .eq('numero', conversation.phone_number)
      .single();

    if (blockedContact) {
      console.log('[process-ai-buffer] Contact blocked bot, skipping');
      await supabase
        .from('ai_response_buffer')
        .update({ processed: true })
        .eq('id', buffer.id);
      return;
    }

    // Parsear mensajes - soporta tanto formato antiguo (strings) como nuevo (objetos)
    let combinedMessage = '';
    let imageUrls: string[] = [];

    console.log(`[process-ai-buffer] Raw messages type: ${typeof messages}, isArray: ${Array.isArray(messages)}`);
    console.log(`[process-ai-buffer] Messages count: ${messages.length}`);
    if (messages.length > 0) {
      console.log(`[process-ai-buffer] First message type: ${typeof messages[0]}`);
      console.log(`[process-ai-buffer] First message: ${JSON.stringify(messages[0])}`);
    }

    if (messages.length > 0) {
      if (typeof messages[0] === 'string') {
        // Formato antiguo: array de strings
        console.log('[process-ai-buffer] Using OLD string format');
        combinedMessage = messages.join('\n\n');
      } else {
        // Formato nuevo: array de objetos { type, content, imageUrl }
        console.log('[process-ai-buffer] Using NEW object format');
        combinedMessage = messages.map((m: any) => m.content || '').join('\n\n');
        
        // Extraer imageUrls de mensajes tipo imagen
        for (const m of messages) {
          console.log(`[process-ai-buffer] Message: type=${m.type}, hasImageUrl=${!!m.imageUrl}, imageUrl=${m.imageUrl}`);
          if (m.type === 'image' && m.imageUrl) {
            imageUrls.push(m.imageUrl);
          }
        }
      }
    }

    console.log(`[process-ai-buffer] Combined message: ${combinedMessage.substring(0, 100)}...`);
    console.log(`[process-ai-buffer] Found ${imageUrls.length} images: ${JSON.stringify(imageUrls)}`);

    // Get unified AI settings for this user
    const { data: unifiedSettings } = await supabase
      .from('webchat_ai_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Intentar llamar a un agente específico primero
    let aiResponse = null;

    if (channelType === 'telegram') {
      const { data: aiResult } = await supabase.functions.invoke('ai-agent-response', {
        body: {
          conversationId,
          userId,
          messageContent: combinedMessage,
          channelType: 'telegram',
          telegramBotId: buffer.telegram_bot_id
        }
      });
      aiResponse = aiResult;
    } else if (channelType === 'twilio') {
      const { data: aiResult } = await supabase.functions.invoke('twilio-ai-agent-response', {
        body: {
          conversationId,
          userId,
          messageContent: combinedMessage,
          phoneNumber: conversation.phone_number,
          twilioConnectionId: buffer.twilio_connection_id
        }
      });
      aiResponse = aiResult;
    } else {
      // WhatsApp
      const { data: aiResult } = await supabase.functions.invoke('ai-agent-response', {
        body: {
          conversationId,
          userId,
          messageContent: combinedMessage,
          sessionName: buffer.session_name
        }
      });
      aiResponse = aiResult;
    }

    // Si no hay agente específico, usar configuración unificada de IA
    if (!aiResponse?.processed) {
      console.log('[process-ai-buffer] No active AI agent, using unified IA settings...');
      
      // Use unified settings (webchat_ai_settings) as the default AI
      if (unifiedSettings) {
        console.log('[process-ai-buffer] Invoking unified IA agent...');
        
        const { data: defaultResult } = await supabase.functions.invoke('ia-default-agent', {
          body: {
            userId,
            messageContent: combinedMessage,
            imageUrls, // Pasar URLs de imágenes al agente
            contactName: conversation.contact_name || conversation.pushname,
            phoneNumber: conversation.phone_number,
            conversationId,
            // Pass unified settings
            systemPrompt: unifiedSettings.system_prompt,
            cashierNumbers: unifiedSettings.cashier_numbers,
            cbu: unifiedSettings.cbu,
            model: unifiedSettings.model,
            maxTokens: unifiedSettings.max_tokens,
          }
        });

        // Si se detectó comprobante de pago, actualizar conversation y cancelar recordatorios
        if (defaultResult?.comprobanteDetectado) {
          console.log('[process-ai-buffer] Payment receipt detected, updating conversation and canceling reminders');
          
          // Actualizar conversation
          await supabase
            .from('conversations')
            .update({
              payment_receipt_sent: true,
              payment_receipt_detected_at: new Date().toISOString()
            })
            .eq('id', conversationId);
          
          // Cancelar recordatorios pendientes para este contacto
          await supabase
            .from('automated_message_logs')
            .update({ status: 'cancelled' })
            .eq('phone_number', conversation.phone_number)
            .eq('user_id', userId)
            .eq('status', 'pending')
            .eq('trigger_type', 'payment_reminder');
          
          console.log('[process-ai-buffer] Payment receipt flags updated and reminders cancelled');
        }

        // Determinar los mensajes a enviar (múltiples o único)
        const mensajesToSend = defaultResult?.mensajesMultiples && defaultResult.mensajesMultiples.length > 0
          ? defaultResult.mensajesMultiples
          : (defaultResult?.respuesta ? [defaultResult.respuesta] : []);

        if (mensajesToSend.length > 0) {
          // Enviar cada mensaje según el canal con pequeño delay entre ellos
          for (let i = 0; i < mensajesToSend.length; i++) {
            const mensaje = mensajesToSend[i];
            
            if (channelType === 'telegram') {
              // Obtener bot info
              const { data: bot } = await supabase
                .from('telegram_bots')
                .select('bot_token')
                .eq('id', buffer.telegram_bot_id)
                .single();

              if (bot) {
                await fetch(`https://api.telegram.org/bot${bot.bot_token}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: conversation.phone_number,
                    text: mensaje
                  })
                });
              }
            } else if (channelType === 'twilio') {
              await supabase.functions.invoke('twilio-send-message', {
                body: {
                  twilioConnectionId: buffer.twilio_connection_id,
                  toNumber: conversation.phone_number,
                  message: mensaje,
                  userId,
                  conversationId,
                  isBot: true
                }
              });
            } else {
              // WhatsApp
              await supabase.functions.invoke('waha-send-message', {
                body: {
                  sessionName: buffer.session_name,
                  phoneNumber: conversation.phone_number,
                  message: mensaje,
                  userId,
                  conversationId,
                  isBot: true
                }
              });
            }

            // Pequeño delay entre mensajes (1.5 segundos) para que se vean separados
            if (i < mensajesToSend.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1500));
            }
          }
        }

        // Si se programó recordatorio de pago (después de crear usuario)
        if (defaultResult?.schedulePaymentReminder && defaultResult?.casinoUsername) {
          console.log('[process-ai-buffer] Scheduling payment reminder for user:', defaultResult.casinoUsername);
          
          // Actualizar conversation con casino_user_created y casino_username
          await supabase
            .from('conversations')
            .update({
              casino_user_created: true,
              casino_username: defaultResult.casinoUsername
            })
            .eq('id', conversationId);
          
          // Calcular delay aleatorio entre 5 y 7 minutos
          const delayMinutes = Math.floor(Math.random() * 3) + 5; // 5, 6 o 7 minutos
          const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
          
          console.log(`[process-ai-buffer] Reminder scheduled for ${delayMinutes} minutes from now: ${scheduledFor}`);
          
          // Insertar recordatorio en automated_message_logs
          const reminderMessage = `Hola! 👋 Te recuerdo que para cargar tus fichas tenés que transferir al CBU que te pasé y enviarme el comprobante acá.\n\n💰 Si transferís hoy, participás del sorteo semanal de $200.000! 🎰`;
          
          await supabase
            .from('automated_message_logs')
            .insert({
              user_id: userId,
              phone_number: conversation.phone_number,
              message_content: reminderMessage,
              scheduled_for: scheduledFor,
              status: 'pending',
              trigger_type: 'payment_reminder',
              lead_id: conversation.lead_id || null
            });
          
          console.log('[process-ai-buffer] Payment reminder scheduled successfully');
        }
      } else {
        console.log('[process-ai-buffer] No unified AI settings found for user');
      }
    }

    // Marcar buffer como procesado
    await supabase
      .from('ai_response_buffer')
      .update({ 
        processed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', buffer.id);

    console.log(`[process-ai-buffer] Buffer ${buffer.id} processed successfully`);

  } catch (error) {
    console.error('[process-ai-buffer] Error processing buffer:', error);
    // Marcar como procesado para evitar bucles infinitos
    await supabase
      .from('ai_response_buffer')
      .update({ 
        processed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', buffer.id);
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

    console.log('[process-ai-buffer] Checking for pending buffers...');

    // Buscar buffers pendientes que cumplan las condiciones:
    // - 2 o más mensajes acumulados
    // - O primer mensaje con más de 10 segundos
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();

    const { data: pendingBuffers, error } = await supabase
      .from('ai_response_buffer')
      .select('*')
      .eq('processed', false)
      .or(`message_count.gte.2,first_message_at.lt.${tenSecondsAgo}`)
      .order('first_message_at', { ascending: true })
      .limit(10); // Procesar máximo 10 buffers por ejecución

    if (error) {
      console.error('[process-ai-buffer] Error fetching buffers:', error);
      return new Response(
        JSON.stringify({ error: 'Error fetching buffers' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[process-ai-buffer] Found ${pendingBuffers?.length || 0} buffers to process`);

    if (pendingBuffers && pendingBuffers.length > 0) {
      // Procesar cada buffer
      for (const buffer of pendingBuffers) {
        await processBuffer(supabase, buffer);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: pendingBuffers?.length || 0
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[process-ai-buffer] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
