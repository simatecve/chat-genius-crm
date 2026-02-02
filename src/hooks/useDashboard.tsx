import { useQuery } from '@tanstack/react-query';
import { dashboardService, DashboardStats, RecentLead, ActiveConversation, MessagesByHour, ConversationStats, HeatmapData } from '@/services/dashboardService';
import { useAuth } from './useAuth';

export const useDashboard = (period: 'today' | 'week' | 'month' | 'year' = 'today') => {
  const { user } = useAuth();

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError
  } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: () => user ? dashboardService.getDashboardStats(user.id) : null,
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000,
  });

  const {
    data: recentLeads,
    isLoading: leadsLoading,
    error: leadsError
  } = useQuery({
    queryKey: ['recent-leads', user?.id],
    queryFn: () => user ? dashboardService.getRecentLeads(user.id) : null,
    enabled: !!user,
    refetchInterval: 2 * 60 * 1000,
  });

  const {
    data: activeConversations,
    isLoading: conversationsLoading,
    error: conversationsError
  } = useQuery({
    queryKey: ['active-conversations', user?.id],
    queryFn: () => user ? dashboardService.getActiveConversations(user.id) : null,
    enabled: !!user,
    staleTime: 60000, // 60 segundos - reducir egress
    refetchInterval: 60 * 1000, // 60 segundos
  });

  const {
    data: messagesByHour,
    isLoading: messagesLoading,
    error: messagesError
  } = useQuery({
    queryKey: ['messages-by-hour', user?.id, period],
    queryFn: () => user ? dashboardService.getMessagesByHour(user.id, period) : null,
    enabled: !!user,
    refetchInterval: 2 * 60 * 1000,
  });

  const {
    data: conversationsByHour,
    isLoading: conversationsByHourLoading,
    error: conversationsByHourError
  } = useQuery({
    queryKey: ['conversations-by-hour', user?.id, period],
    queryFn: () => user ? dashboardService.getConversationsByHour(user.id, period) : null,
    enabled: !!user,
    refetchInterval: 2 * 60 * 1000,
  });

  const {
    data: heatmapData,
    isLoading: heatmapLoading,
    error: heatmapError
  } = useQuery({
    queryKey: ['messages-heatmap', user?.id],
    queryFn: () => user ? dashboardService.getMessagesHeatmap(user.id) : null,
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000,
  });

  return {
    stats: stats || {
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
    },
    recentLeads: recentLeads || [],
    activeConversations: activeConversations || [],
    messagesByHour: messagesByHour || [],
    conversationsByHour: conversationsByHour || [],
    heatmapData: heatmapData || [],
    isLoading: statsLoading || leadsLoading || conversationsLoading || messagesLoading || conversationsByHourLoading || heatmapLoading,
    error: statsError || leadsError || conversationsError || messagesError || conversationsByHourError || heatmapError
  };
};