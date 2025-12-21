import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SessionStats {
  session_id: string;
  session_type: 'twilio' | 'whatsapp' | 'telegram' | 'webchat';
  total_conversations: number;
  received_messages: number;
  sent_messages: number;
  last_message_at: string | null;
}

export const useSessionStats = (userId: string | null) => {
  const [stats, setStats] = useState<Record<string, SessionStats>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        const statsMap: Record<string, SessionStats> = {};

        // Obtener estadísticas para Twilio
        const { data: twilioConversations } = await supabase
          .from('conversations')
          .select('id, twilio_connection_id, last_message_time')
          .eq('user_id', userId)
          .not('twilio_connection_id', 'is', null);

        if (twilioConversations) {
          // Agrupar conversaciones por twilio_connection_id
          const twilioGroups: Record<string, { convIds: string[], lastMessage: string | null }> = {};
          
          twilioConversations.forEach(conv => {
            const connId = conv.twilio_connection_id!;
            if (!twilioGroups[connId]) {
              twilioGroups[connId] = { convIds: [], lastMessage: null };
            }
            twilioGroups[connId].convIds.push(conv.id);
            if (!twilioGroups[connId].lastMessage || 
                (conv.last_message_time && conv.last_message_time > twilioGroups[connId].lastMessage!)) {
              twilioGroups[connId].lastMessage = conv.last_message_time;
            }
          });

          // Obtener conteo de mensajes para cada conexión Twilio
          for (const [connId, group] of Object.entries(twilioGroups)) {
            const { count: receivedCount } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .in('conversation_id', group.convIds)
              .eq('direction', 'incoming');

            const { count: sentCount } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .in('conversation_id', group.convIds)
              .eq('direction', 'outgoing');

            statsMap[connId] = {
              session_id: connId,
              session_type: 'twilio',
              total_conversations: group.convIds.length,
              received_messages: receivedCount || 0,
              sent_messages: sentCount || 0,
              last_message_at: group.lastMessage
            };
          }
        }

        // Obtener estadísticas para WhatsApp (conexiones sin twilio_connection_id y sin telegram_bot_id)
        const { data: whatsappConversations } = await supabase
          .from('conversations')
          .select('id, phone_number, whatsapp_number, last_message_time')
          .eq('user_id', userId)
          .is('twilio_connection_id', null)
          .is('telegram_bot_id', null)
          .or('channel_type.eq.whatsapp,channel_type.is.null');

        // Obtener todas las conexiones WhatsApp del usuario
        const { data: whatsappConnections } = await supabase
          .from('whatsapp_connections')
          .select('id, phone_number')
          .eq('user_id', userId);

        if (whatsappConnections && whatsappConversations) {
          for (const conn of whatsappConnections) {
            // Filtrar conversaciones que pertenecen a esta conexión (por whatsapp_number o phone_number)
            const connConvs = whatsappConversations.filter(c => 
              c.whatsapp_number === conn.phone_number || 
              (!c.whatsapp_number && conn.phone_number)
            );

            if (connConvs.length > 0) {
              const convIds = connConvs.map(c => c.id);
              
              const { count: receivedCount } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .in('conversation_id', convIds)
                .eq('direction', 'incoming');

              const { count: sentCount } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .in('conversation_id', convIds)
                .eq('direction', 'outgoing');

              const lastMessage = connConvs.reduce((latest, c) => {
                if (!c.last_message_time) return latest;
                if (!latest || c.last_message_time > latest) return c.last_message_time;
                return latest;
              }, null as string | null);

              statsMap[conn.id] = {
                session_id: conn.id,
                session_type: 'whatsapp',
                total_conversations: connConvs.length,
                received_messages: receivedCount || 0,
                sent_messages: sentCount || 0,
                last_message_at: lastMessage
              };
            } else {
              statsMap[conn.id] = {
                session_id: conn.id,
                session_type: 'whatsapp',
                total_conversations: 0,
                received_messages: 0,
                sent_messages: 0,
                last_message_at: null
              };
            }
          }
        }

        // Obtener estadísticas para Telegram Bots
        const { data: telegramConversations } = await supabase
          .from('conversations')
          .select('id, telegram_bot_id, last_message_time')
          .eq('user_id', userId)
          .not('telegram_bot_id', 'is', null);

        if (telegramConversations) {
          const telegramGroups: Record<string, { convIds: string[], lastMessage: string | null }> = {};
          
          telegramConversations.forEach(conv => {
            const botId = conv.telegram_bot_id!;
            if (!telegramGroups[botId]) {
              telegramGroups[botId] = { convIds: [], lastMessage: null };
            }
            telegramGroups[botId].convIds.push(conv.id);
            if (!telegramGroups[botId].lastMessage || 
                (conv.last_message_time && conv.last_message_time > telegramGroups[botId].lastMessage!)) {
              telegramGroups[botId].lastMessage = conv.last_message_time;
            }
          });

          for (const [botId, group] of Object.entries(telegramGroups)) {
            const { count: receivedCount } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .in('conversation_id', group.convIds)
              .eq('direction', 'incoming');

            const { count: sentCount } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .in('conversation_id', group.convIds)
              .eq('direction', 'outgoing');

            statsMap[botId] = {
              session_id: botId,
              session_type: 'telegram',
              total_conversations: group.convIds.length,
              received_messages: receivedCount || 0,
              sent_messages: sentCount || 0,
              last_message_at: group.lastMessage
            };
          }
        }

        // Asegurar que todos los bots de Telegram tengan stats (incluso si es 0)
        const { data: allTelegramBots } = await supabase
          .from('telegram_bots')
          .select('id')
          .eq('user_id', userId);

        if (allTelegramBots) {
          for (const bot of allTelegramBots) {
            if (!statsMap[bot.id]) {
              statsMap[bot.id] = {
                session_id: bot.id,
                session_type: 'telegram',
                total_conversations: 0,
                received_messages: 0,
                sent_messages: 0,
                last_message_at: null
              };
            }
          }
        }

        // Obtener estadísticas para Web Chatbots (desde landing_chat_conversations y landing_chat_messages)
        const { data: webChatbots } = await supabase
          .from('web_chatbots')
          .select('id')
          .eq('user_id', userId);

        if (webChatbots) {
          // Para webchat usamos landing_chat_conversations
          const { data: landingConversations } = await supabase
            .from('landing_chat_conversations')
            .select('id, updated_at')
            .eq('user_id', userId);

          if (landingConversations && landingConversations.length > 0) {
            const landingConvIds = landingConversations.map(c => c.id);
            
            const { count: receivedCount } = await supabase
              .from('landing_chat_messages')
              .select('*', { count: 'exact', head: true })
              .in('conversation_id', landingConvIds)
              .eq('direction', 'incoming');

            const { count: sentCount } = await supabase
              .from('landing_chat_messages')
              .select('*', { count: 'exact', head: true })
              .in('conversation_id', landingConvIds)
              .eq('direction', 'outgoing');

            const lastMessage = landingConversations.reduce((latest, c) => {
              if (!c.updated_at) return latest;
              if (!latest || c.updated_at > latest) return c.updated_at;
              return latest;
            }, null as string | null);

            // Distribuir stats entre todos los chatbots (simplificado)
            for (const chatbot of webChatbots) {
              statsMap[chatbot.id] = {
                session_id: chatbot.id,
                session_type: 'webchat',
                total_conversations: landingConversations.length,
                received_messages: receivedCount || 0,
                sent_messages: sentCount || 0,
                last_message_at: lastMessage
              };
            }
          } else {
            for (const chatbot of webChatbots) {
              statsMap[chatbot.id] = {
                session_id: chatbot.id,
                session_type: 'webchat',
                total_conversations: 0,
                received_messages: 0,
                sent_messages: 0,
                last_message_at: null
              };
            }
          }
        }

        setStats(statsMap);
      } catch (error) {
        console.error('Error fetching session stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  const getStatsBySessionId = (sessionId: string): SessionStats | null => {
    return stats[sessionId] || null;
  };

  return {
    stats,
    loading,
    getStatsBySessionId
  };
};
