import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService, DashboardStats, RecentLead, ActiveConversation, MessagesByHour, ConversationStats } from '@/services/dashboardService';
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
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const {
    data: recentLeads,
    isLoading: leadsLoading,
    error: leadsError
  } = useQuery({
    queryKey: ['recent-leads', user?.id],
    queryFn: () => user ? dashboardService.getRecentLeads(user.id) : null,
    enabled: !!user,
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });

  const {
    data: activeConversations,
    isLoading: conversationsLoading,
    error: conversationsError
  } = useQuery({
    queryKey: ['active-conversations', user?.id],
    queryFn: () => user ? dashboardService.getActiveConversations(user.id) : null,
    enabled: !!user,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time feel
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

  return {
    stats: stats || {
      totalLeads: 0,
      activeConversations: 0,
      totalContacts: 0,
      whatsappConnections: 0,
      totalCampaigns: 0,
      totalMessages: 0,
      conversionRate: 0
    },
    recentLeads: recentLeads || [],
    activeConversations: activeConversations || [],
    messagesByHour: messagesByHour || [],
    conversationsByHour: conversationsByHour || [],
    isLoading: statsLoading || leadsLoading || conversationsLoading || messagesLoading || conversationsByHourLoading,
    error: statsError || leadsError || conversationsError || messagesError || conversationsByHourError
  };
};