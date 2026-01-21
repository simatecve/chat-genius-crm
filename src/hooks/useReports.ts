import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  ChannelType,
  SessionInfo,
  DateRange,
  getSessionsByChannelType,
  getSessionStats,
  getMessagesByDate,
  getHourlyStats,
  getAllSessionCounts
} from '@/services/reportsService';

export const useReports = () => {
  const { user } = useAuth();
  const [channelType, setChannelType] = useState<ChannelType>('twilio');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    return { startDate, endDate };
  });

  // Fetch all session counts for all channel types
  const {
    data: sessionCounts = { whatsapp: 0, twilio: 0, telegram: 0, webchat: 0 },
    isLoading: countsLoading
  } = useQuery({
    queryKey: ['report-session-counts', user?.id],
    queryFn: () => getAllSessionCounts(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5
  });

  // Fetch sessions for selected channel type
  const {
    data: sessions = [],
    isLoading: sessionsLoading,
    error: sessionsError
  } = useQuery({
    queryKey: ['report-sessions', user?.id, channelType],
    queryFn: () => getSessionsByChannelType(user?.id || '', channelType),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5
  });

  // Auto-select first session when sessions change
  const effectiveSessionId = useMemo(() => {
    if (selectedSessionId && sessions.some(s => s.id === selectedSessionId)) {
      return selectedSessionId;
    }
    return sessions[0]?.id || null;
  }, [selectedSessionId, sessions]);

  // Fetch stats for selected session
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError
  } = useQuery({
    queryKey: ['report-stats', user?.id, effectiveSessionId, channelType, dateRange.startDate.toISOString(), dateRange.endDate.toISOString()],
    queryFn: () => getSessionStats(user?.id || '', effectiveSessionId!, channelType, dateRange),
    enabled: !!user?.id && !!effectiveSessionId,
    staleTime: 1000 * 60 * 2
  });

  // Fetch daily message stats
  const {
    data: dailyStats = [],
    isLoading: dailyLoading
  } = useQuery({
    queryKey: ['report-daily', user?.id, effectiveSessionId, channelType, dateRange.startDate.toISOString(), dateRange.endDate.toISOString()],
    queryFn: () => getMessagesByDate(user?.id || '', effectiveSessionId!, channelType, dateRange),
    enabled: !!user?.id && !!effectiveSessionId,
    staleTime: 1000 * 60 * 2
  });

  // Fetch hourly stats
  const {
    data: hourlyStats = [],
    isLoading: hourlyLoading
  } = useQuery({
    queryKey: ['report-hourly', user?.id, effectiveSessionId, channelType, dateRange.startDate.toISOString(), dateRange.endDate.toISOString()],
    queryFn: () => getHourlyStats(user?.id || '', effectiveSessionId!, channelType, dateRange),
    enabled: !!user?.id && !!effectiveSessionId,
    staleTime: 1000 * 60 * 2
  });

  const selectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
  };

  const selectChannelType = (type: ChannelType) => {
    setChannelType(type);
    setSelectedSessionId(null); // Reset session when changing channel
  };

  const updateDateRange = (range: DateRange) => {
    setDateRange(range);
  };

  const setPresetRange = (preset: 'today' | '7days' | '30days' | 'thisMonth') => {
    const endDate = new Date();
    const startDate = new Date();

    switch (preset) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case '7days':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'thisMonth':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    setDateRange({ startDate, endDate });
  };

  return {
    // State
    channelType,
    selectedSessionId: effectiveSessionId,
    dateRange,
    sessions,
    stats,
    dailyStats,
    hourlyStats,
    sessionCounts,

    // Loading states
    isLoading: sessionsLoading || statsLoading || dailyLoading || hourlyLoading,
    sessionsLoading,
    statsLoading,
    dailyLoading,
    hourlyLoading,
    countsLoading,

    // Errors
    error: sessionsError || statsError,

    // Actions
    selectSession,
    selectChannelType,
    updateDateRange,
    setPresetRange
  };
};
