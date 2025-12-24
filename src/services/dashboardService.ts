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
      // Obtener instancias de WhatsApp del usuario para filtrar conversaciones
      const { data: whatsappInstances } = await supabase
        .from('whatsapp_connections')
        .select('name')
        .eq('user_id', userId);

      const instanceNames = whatsappInstances?.map(instance => instance.name) || [];

      // Calcular fecha inicio del año
      const yearStart = new Date();
      yearStart.setMonth(0, 1);
      yearStart.setHours(0, 0, 0, 0);

      // Ejecutar consultas en paralelo
      const [
        leadsResult,
        contactsResult,
        whatsappResult,
        campaignsResult,
        conversationsResult,
        incomingMessagesResult,
        outgoingMessagesResult,
        yearlyConversationsResult
      ] = await Promise.all([
        // Total de leads
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        
        // Total de contactos
        supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        
        // Conexiones WhatsApp
        supabase
          .from('whatsapp_connections')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        
        // Campañas
        supabase
          .from('mass_campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        
        // Conversaciones activas del usuario
        supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        
        // Mensajes recibidos del usuario
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .in('direction', ['incoming', 'inbound']),
        
        // Mensajes enviados del usuario
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .in('direction', ['outgoing', 'outbound']),
        
        // Conversaciones del año para estadísticas anuales
        supabase
          .from('conversations')
          .select('id, created_at')
          .eq('user_id', userId)
          .gte('created_at', yearStart.toISOString())
      ]);

      // Calcular tasa de conversión (leads calificados vs total)
      const { data: qualifiedLeads } = await supabase
        .from('leads')
        .select('lead_columns!inner(name)')
        .eq('user_id', userId);

      const qualifiedCount = qualifiedLeads?.filter(lead => 
        lead.lead_columns && 
        (lead.lead_columns.name.toLowerCase().includes('calificado') || 
         lead.lead_columns.name.toLowerCase().includes('ganado') ||
         lead.lead_columns.name.toLowerCase().includes('cerrado'))
      ).length || 0;

      const totalLeads = leadsResult.count || 0;
      const conversionRate = totalLeads > 0 ? (qualifiedCount / totalLeads) * 100 : 0;

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
        yearlyTotal: yearlyConversations.length
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
        yearlyTotal: 0
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
      // Obtener instancias de WhatsApp del usuario
      const { data: whatsappInstances } = await supabase
        .from('whatsapp_connections')
        .select('name')
        .eq('user_id', userId);

      const instanceNames = whatsappInstances?.map(instance => instance.name) || [];

      if (instanceNames.length === 0) {
        return [];
      }

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

      const { data, error } = await supabase
        .from('messages')
        .select('created_at, direction')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      // Agrupar por hora
      const hourlyData: { [key: string]: { incoming: number; outgoing: number } } = {};
      
      for (let i = 0; i < 24; i++) {
        const hourKey = `${String(i).padStart(2, '0')} hs`;
        hourlyData[hourKey] = { incoming: 0, outgoing: 0 };
      }

      data?.forEach(message => {
        const hour = new Date(message.created_at).getHours();
        const hourKey = `${String(hour).padStart(2, '0')} hs`;
        
        if (message.direction === 'incoming' || message.direction === 'inbound') {
          hourlyData[hourKey].incoming++;
        } else if (message.direction === 'outgoing' || message.direction === 'outbound') {
          hourlyData[hourKey].outgoing++;
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

      const { data, error } = await supabase
        .from('conversations')
        .select('created_at, last_message_time')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      // Agrupar por hora
      const hourlyData: { [key: string]: { new: number; recurring: number } } = {};
      
      for (let i = 0; i < 24; i++) {
        const hourKey = `${String(i).padStart(2, '0')} hs`;
        hourlyData[hourKey] = { new: 0, recurring: 0 };
      }

      const oldConversationDate = new Date();
      oldConversationDate.setDate(oldConversationDate.getDate() - 30);

      data?.forEach(conversation => {
        const created = new Date(conversation.created_at);
        const hour = created.getHours();
        const hourKey = `${String(hour).padStart(2, '0')} hs`;
        
        // Considerar "nuevos" si se crearon hace menos de 30 días
        if (created > oldConversationDate) {
          hourlyData[hourKey].new++;
        } else {
          hourlyData[hourKey].recurring++;
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
      // Obtener mensajes de los últimos 30 días
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('messages')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (error) throw error;

      // Crear matriz de 7 días x 24 horas
      const heatmapData: { [key: string]: number } = {};
      
      // Inicializar con ceros
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          heatmapData[`${day}-${hour}`] = 0;
        }
      }

      // Contar mensajes por día y hora
      data?.forEach(message => {
        const date = new Date(message.created_at);
        const day = date.getDay(); // 0=Domingo, 1=Lunes...
        const hour = date.getHours();
        heatmapData[`${day}-${hour}`]++;
      });

      // Convertir a array
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