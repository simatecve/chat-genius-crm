import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
  totalLeads: number;
  activeConversations: number;
  totalContacts: number;
  whatsappConnections: number;
  totalCampaigns: number;
  totalMessages: number;
  conversionRate: number;
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
  last_message_at: string | null;
  unread_count: number;
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

      // Ejecutar consultas en paralelo
      const [
        leadsResult,
        contactsResult,
        whatsappResult,
        campaignsResult,
        conversationsResult,
        messagesResult
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
        
        // Conversaciones activas (basadas en instancias del usuario)
        instanceNames.length > 0 
          ? supabase
              .from('conversations')
              .select('id', { count: 'exact', head: true })
              .in('instance_name', instanceNames)
          : { count: 0 },
        
        // Mensajes enviados
        instanceNames.length > 0
          ? supabase
              .from('messages')
              .select('id', { count: 'exact', head: true })
              .in('instance_name', instanceNames)
              .eq('direction', 'outgoing')
          : { count: 0 }
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

      return {
        totalLeads,
        activeConversations: conversationsResult.count || 0,
        totalContacts: contactsResult.count || 0,
        whatsappConnections: whatsappResult.count || 0,
        totalCampaigns: campaignsResult.count || 0,
        totalMessages: messagesResult.count || 0,
        conversionRate: Math.round(conversionRate * 10) / 10 // Redondear a 1 decimal
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
        conversionRate: 0
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
        .select('id, pushname, whatsapp_number, last_message, last_message_at, unread_count')
        .in('instance_name', instanceNames)
        .order('last_message_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching active conversations:', error);
      return [];
    }
  }
};