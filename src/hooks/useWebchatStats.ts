import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';

interface WebchatStats {
  totalConversations: number;
  casinoUsersCreated: number;
  paymentReceiptsSent: number;
  conversionRate: number;
  receiptRate: number;
}

interface CreatedUser {
  id: string;
  casino_username: string | null;
  contact_name: string | null;
  created_at: string | null;
  payment_receipt_sent: boolean | null;
  payment_receipt_detected_at: string | null;
}

interface DailyStats {
  date: string;
  conversations: number;
  users_created: number;
  receipts: number;
}

export const useWebchatStats = () => {
  const { effectiveUserId } = useEffectiveUserId();
  const [stats, setStats] = useState<WebchatStats>({
    totalConversations: 0,
    casinoUsersCreated: 0,
    paymentReceiptsSent: 0,
    conversionRate: 0,
    receiptRate: 0
  });
  const [createdUsers, setCreatedUsers] = useState<CreatedUser[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    if (!effectiveUserId) return;
    
    setLoading(true);
    try {
      // Fetch total webchat conversations
      const { count: totalConversations } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', effectiveUserId)
        .eq('channel_type', 'webchat');

      // Fetch casino users created
      const { count: casinoUsersCreated } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', effectiveUserId)
        .eq('channel_type', 'webchat')
        .eq('casino_user_created', true);

      // Fetch payment receipts sent
      const { count: paymentReceiptsSent } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', effectiveUserId)
        .eq('channel_type', 'webchat')
        .eq('payment_receipt_sent', true);

      // Fetch created users list
      const { data: usersData } = await supabase
        .from('conversations')
        .select('id, casino_username, contact_name, created_at, payment_receipt_sent, payment_receipt_detected_at')
        .eq('user_id', effectiveUserId)
        .eq('channel_type', 'webchat')
        .eq('casino_user_created', true)
        .order('created_at', { ascending: false })
        .limit(50);

      // Calculate rates
      const total = totalConversations || 0;
      const users = casinoUsersCreated || 0;
      const receipts = paymentReceiptsSent || 0;
      
      const conversionRate = total > 0 ? (users / total) * 100 : 0;
      const receiptRate = users > 0 ? (receipts / users) * 100 : 0;

      setStats({
        totalConversations: total,
        casinoUsersCreated: users,
        paymentReceiptsSent: receipts,
        conversionRate,
        receiptRate
      });

      setCreatedUsers(usersData || []);

      // Fetch daily stats for chart (last 14 days)
      const { data: allConversations } = await supabase
        .from('conversations')
        .select('created_at, casino_user_created, payment_receipt_sent')
        .eq('user_id', effectiveUserId)
        .eq('channel_type', 'webchat')
        .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      // Group by day
      const dailyMap = new Map<string, DailyStats>();
      
      // Initialize last 14 days
      for (let i = 13; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyMap.set(dateStr, { date: dateStr, conversations: 0, users_created: 0, receipts: 0 });
      }

      // Fill with actual data
      allConversations?.forEach(conv => {
        const dateStr = conv.created_at?.split('T')[0];
        if (dateStr && dailyMap.has(dateStr)) {
          const day = dailyMap.get(dateStr)!;
          day.conversations += 1;
          if (conv.casino_user_created) day.users_created += 1;
          if (conv.payment_receipt_sent) day.receipts += 1;
        }
      });

      setDailyStats(Array.from(dailyMap.values()));

    } catch (error) {
      console.error('Error fetching webchat stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [effectiveUserId]);

  return { stats, createdUsers, dailyStats, loading, refetch: fetchStats };
};
