import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DailyAIUsage {
  date: string;
  total: number;
  whatsapp: number;
  telegram: number;
  twilio: number;
  webchat: number;
}

export interface AIUsageStatsData {
  totalResponses: number;
  estimatedCost: number;
  avgPerDay: number;
  costPerMessage: number;
  byChannel: {
    whatsapp: number;
    telegram: number;
    twilio: number;
    webchat: number;
  };
  dailyUsage: DailyAIUsage[];
}

const COST_PER_MESSAGE = 0.00017; // Based on Gemini 2.5 Flash pricing

export const useAIUsageStats = (userId: string | null, period: number = 30) => {
  const [stats, setStats] = useState<AIUsageStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - period);

        // Get AI messages (is_bot = true)
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('id, created_at, conversation_id')
          .eq('user_id', userId)
          .eq('is_bot', true)
          .gte('created_at', startDate.toISOString());

        if (messagesError) throw messagesError;

        // Get conversations to determine channel type
        const conversationIds = [...new Set(messages?.map(m => m.conversation_id) || [])];
        
        const { data: conversations, error: convError } = await supabase
          .from('conversations')
          .select('id, channel_type')
          .in('id', conversationIds.length > 0 ? conversationIds : ['']);

        if (convError) throw convError;

        // Create a map of conversation_id to channel_type
        const channelMap = new Map<string, string>();
        conversations?.forEach(c => {
          channelMap.set(c.id, c.channel_type || 'whatsapp');
        });

        // Process messages
        const dailyMap = new Map<string, DailyAIUsage>();
        const byChannel = { whatsapp: 0, telegram: 0, twilio: 0, webchat: 0 };

        messages?.forEach(msg => {
          const date = new Date(msg.created_at).toISOString().split('T')[0];
          const channel = channelMap.get(msg.conversation_id) || 'whatsapp';
          
          // Update channel counts
          if (channel in byChannel) {
            byChannel[channel as keyof typeof byChannel]++;
          }

          // Update daily usage
          if (!dailyMap.has(date)) {
            dailyMap.set(date, {
              date,
              total: 0,
              whatsapp: 0,
              telegram: 0,
              twilio: 0,
              webchat: 0,
            });
          }
          const daily = dailyMap.get(date)!;
          daily.total++;
          if (channel in daily) {
            (daily as any)[channel]++;
          }
        });

        // Convert map to array and sort by date
        const dailyUsage = Array.from(dailyMap.values()).sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Fill in missing dates with zeros
        const filledDailyUsage: DailyAIUsage[] = [];
        const currentDate = new Date(startDate);
        const today = new Date();
        
        while (currentDate <= today) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const existing = dailyUsage.find(d => d.date === dateStr);
          filledDailyUsage.push(existing || {
            date: dateStr,
            total: 0,
            whatsapp: 0,
            telegram: 0,
            twilio: 0,
            webchat: 0,
          });
          currentDate.setDate(currentDate.getDate() + 1);
        }

        const totalResponses = messages?.length || 0;
        const daysWithData = filledDailyUsage.filter(d => d.total > 0).length || 1;

        setStats({
          totalResponses,
          estimatedCost: totalResponses * COST_PER_MESSAGE,
          avgPerDay: Math.round(totalResponses / daysWithData),
          costPerMessage: COST_PER_MESSAGE,
          byChannel,
          dailyUsage: filledDailyUsage,
        });
      } catch (err: any) {
        console.error('Error fetching AI usage stats:', err);
        setError(err.message || 'Error al cargar estadísticas');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId, period]);

  return { stats, loading, error };
};
