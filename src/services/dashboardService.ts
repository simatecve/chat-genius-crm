import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
  totalLeads: number;
  activeConversations: number;
  totalContacts: number;
  whatsappConnections: number;
  totalCampaigns: number;
  totalMessages: number;
  incomingMessages: number;
  outgoingMessages: number;
  conversionRate: number;
  yearlyNewProspects: number;
  yearlyRecurringClients: number;
  yearlyTotal: number;
  newConversationsToday: number;
  humanResponses: number;
  aiResponses: number;
  averageResponseMinutes: number;
  activeAgents: number;
  mostActiveFunnel: string;
}

export interface HeatmapData {
  day: number;
  hour: number;
  value: number;
}

export interface RecentLead {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  created_at: string;
  column_name: string;
}

export interface ActiveConversation {
  id: string;
  pushname: string | null;
  whatsapp_number: string;
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number;
}

export interface MessagesByHour {
  hour: string;
  incoming: number;
  outgoing: number;
  total: number;
}

export interface ConversationStats {
  hour: string;
  new: number;
  recurring: number;
  total: number;
}

export const dashboardService = {
  async getDashboardStats(userId: string): Promise<DashboardStats> {
    try {
      // Calcular fecha inicio del año
      const yearStart = new Date();
      yearStart.setMonth(0, 1);
      yearStart.setHours(0, 0, 0, 0);

      // Ejecutar consultas en paralelo - todas usan count/head para mínimo egress
      const [
        leadsResult,
        contactsResult,
        whatsappResult,
        campaignsResult,
        conversationsResult,
        incomingMessagesResult,
        outgoingMessagesResult,
        yearlyConversationsResult,
        conversionResult,
        todayConversationsResult,
        humanResponsesResult,
        aiResponsesResult,
        activeAgentsResult,
        funnelsResult
      ] = await Promise.all([
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('whatsapp_connections')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('mass_campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .in('direction', ['incoming', 'inbound']),
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .in('direction', ['outgoing', 'outbound']),
        // Solo contar conversaciones del año - usar created_at para separar nuevos vs recurrentes
        supabase
          .from('conversations')
          .select('id, created_at')
          .eq('user_id', userId)
          .gte('created_at', yearStart.toISOString()),
        // Usar RPC para tasa de conversión (server-side)
        supabase.rpc('get_conversion_rate', { p_user_id: userId }),
        supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        supabase.from('messages').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('direction', 'outbound').eq('is_bot', false),
        supabase.from('messages').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('direction', 'outbound').eq('is_bot', true),
        supabase.from('agent_presence').select('id', { count: 'exact', head: true }).eq('account_owner_id', userId).gte('last_seen_at', new Date(Date.now() - 90_000).toISOString()),
        supabase.from('leads').select('column_id, lead_columns(name)').eq('user_id', userId).limit(1000)
      ]);

      // Calcular tasa de conversión desde RPC
      const convData = conversionResult.data as any;
      const totalLeadsForConversion = convData?.[0]?.total_leads || convData?.total_leads || 0;
      const qualifiedCount = convData?.[0]?.qualified_leads || convData?.qualified_leads || 0;
      const totalLeads = leadsResult.count || 0;
      const conversionRate = totalLeadsForConversion > 0 ? (qualifiedCount / totalLeadsForConversion) * 100 : 0;

      // Calcular estadísticas anuales
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const yearlyConversations = yearlyConversationsResult.data || [];
      const yearlyNewProspects = yearlyConversations.filter(c => 
        new Date(c.created_at) > thirtyDaysAgo
      ).length;
      const yearlyRecurringClients = yearlyConversations.filter(c => 
        new Date(c.created_at) <= thirtyDaysAgo
      ).length;

      const incomingMessages = incomingMessagesResult.count || 0;
      const outgoingMessages = outgoingMessagesResult.count || 0;
      const funnelCounts = new Map<string, number>();
      (funnelsResult.data || []).forEach((lead: any) => {
        const name = lead.lead_columns?.name || 'Sin embudo';
        funnelCounts.set(name, (funnelCounts.get(name) || 0) + 1);
      });
      const mostActiveFunnel = Array.from(funnelCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Sin actividad';

      return {
        totalLeads,
        activeConversations: conversationsResult.count || 0,
        totalContacts: contactsResult.count || 0,
        whatsappConnections: whatsappResult.count || 0,
        totalCampaigns: campaignsResult.count || 0,
        totalMessages: incomingMessages + outgoingMessages,
        incomingMessages,
        outgoingMessages,
        conversionRate: Math.round(conversionRate * 10) / 10,
        yearlyNewProspects,
        yearlyRecurringClients,
        yearlyTotal: yearlyConversations.length,
        newConversationsToday: todayConversationsResult.count || 0,
        humanResponses: humanResponsesResult.count || 0,
        aiResponses: aiResponsesResult.count || 0,
        averageResponseMinutes: 0,
        activeAgents: activeAgentsResult.count || 0,
        mostActiveFunnel
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        totalLeads: 0,
        activeConversations: 0,
        totalContacts: 0,
        whatsappConnections: 0,
        totalCampaigns: 0,
        totalMessages: 0,
        incomingMessages: 0,
        outgoingMessages: 0,
        conversionRate: 0,
        yearlyNewProspects: 0,
        yearlyRecurringClients: 0,
        yearlyTotal: 0,
        newConversationsToday: 0,
        humanResponses: 0,
        aiResponses: 0,
        averageResponseMinutes: 0,
        activeAgents: 0,
        mostActiveFunnel: 'Sin actividad'
      };
    }
  },

  async getRecentLeads(userId: string, limit: number = 4): Promise<RecentLead[]> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id,
          name,
          company,
          phone,
          created_at,
          lead_columns!inner(name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data?.map(lead => ({
        id: lead.id,
        name: lead.name,
        company: lead.company,
        phone: lead.phone,
        created_at: lead.created_at,
        column_name: lead.lead_columns?.name || 'Sin estado'
      })) || [];
    } catch (error) {
      console.error('Error fetching recent leads:', error);
      return [];
    }
  },

  async getActiveConversations(userId: string, limit: number = 3): Promise<ActiveConversation[]> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, pushname, whatsapp_number, last_message, last_message_time, unread_count')
        .eq('user_id', userId)
        .order('last_message_time', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching active conversations:', error);
      return [];
    }
  },

  async getMessagesByHour(userId: string, period: 'today' | 'week' | 'month' | 'year' = 'today'): Promise<MessagesByHour[]> {
    try {
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Usar RPC server-side en lugar de descargar todos los mensajes
      const { data, error } = await supabase.rpc('get_messages_by_hour', {
        p_user_id: userId,
        p_start_date: startDate.toISOString()
      });

      if (error) throw error;

      // Construir las 24 horas con datos del RPC
      const hourlyData: { [key: string]: { incoming: number; outgoing: number } } = {};
      for (let i = 0; i < 24; i++) {
        hourlyData[`${String(i).padStart(2, '0')} hs`] = { incoming: 0, outgoing: 0 };
      }

      (data as any[] || []).forEach((row: any) => {
        const hourKey = `${String(row.hour).padStart(2, '0')} hs`;
        if (hourlyData[hourKey]) {
          hourlyData[hourKey].incoming = Number(row.incoming) || 0;
          hourlyData[hourKey].outgoing = Number(row.outgoing) || 0;
        }
      });

      return Object.entries(hourlyData).map(([hour, counts]) => ({
        hour,
        incoming: counts.incoming,
        outgoing: counts.outgoing,
        total: counts.incoming + counts.outgoing
      }));
    } catch (error) {
      console.error('Error fetching messages by hour:', error);
      return [];
    }
  },

  async getConversationsByHour(userId: string, period: 'today' | 'week' | 'month' | 'year' = 'today'): Promise<ConversationStats[]> {
    try {
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Usar RPC server-side
      const { data, error } = await supabase.rpc('get_conversations_by_hour', {
        p_user_id: userId,
        p_start_date: startDate.toISOString()
      });

      if (error) throw error;

      // Construir las 24 horas
      const hourlyData: { [key: string]: { new: number; recurring: number } } = {};
      for (let i = 0; i < 24; i++) {
        hourlyData[`${String(i).padStart(2, '0')} hs`] = { new: 0, recurring: 0 };
      }

      (data as any[] || []).forEach((row: any) => {
        const hourKey = `${String(row.hour).padStart(2, '0')} hs`;
        if (hourlyData[hourKey]) {
          hourlyData[hourKey].new = Number(row.new_count) || 0;
          hourlyData[hourKey].recurring = Number(row.recurring_count) || 0;
        }
      });

      return Object.entries(hourlyData).map(([hour, counts]) => ({
        hour,
        new: counts.new,
        recurring: counts.recurring,
        total: counts.new + counts.recurring
      }));
    } catch (error) {
      console.error('Error fetching conversations by hour:', error);
      return [];
    }
  },

  async getMessagesHeatmap(userId: string): Promise<HeatmapData[]> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Usar RPC server-side
      const { data, error } = await supabase.rpc('get_messages_heatmap', {
        p_user_id: userId,
        p_start_date: thirtyDaysAgo.toISOString()
      });

      if (error) throw error;

      // Construir matriz completa 7x24
      const heatmapData: { [key: string]: number } = {};
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          heatmapData[`${day}-${hour}`] = 0;
        }
      }

      (data as any[] || []).forEach((row: any) => {
        heatmapData[`${row.day_of_week}-${row.hour}`] = Number(row.msg_count) || 0;
      });

      const result: HeatmapData[] = [];
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          result.push({
            day,
            hour,
            value: heatmapData[`${day}-${hour}`]
          });
        }
      }

      return result;
    } catch (error) {
      console.error('Error fetching messages heatmap:', error);
      return [];
    }
  }
};
