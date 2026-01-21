import React from 'react';
import { BarChart3 } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { useReports } from '@/hooks/useReports';
import { ChannelTypeSelector } from '@/components/reports/ChannelTypeSelector';
import { SessionSelector } from '@/components/reports/SessionSelector';
import { DateRangeSelector } from '@/components/reports/DateRangeSelector';
import { StatsCards } from '@/components/reports/StatsCards';
import { MessagesByDayChart } from '@/components/reports/MessagesByDayChart';
import { HourlyDistributionChart } from '@/components/reports/HourlyDistributionChart';
import { ChannelType } from '@/services/reportsService';

const Reports: React.FC = () => {
  const {
    channelType,
    selectedSessionId,
    dateRange,
    sessions,
    stats,
    dailyStats,
    hourlyStats,
    sessionsLoading,
    statsLoading,
    dailyLoading,
    hourlyLoading,
    selectSession,
    selectChannelType,
    updateDateRange,
    setPresetRange
  } = useReports();

  // Calculate session counts per channel type
  const sessionCounts: Record<ChannelType, number> = {
    whatsapp: 0,
    twilio: sessions.length,
    telegram: 0,
    webchat: 0
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Reportes</h1>
              <p className="text-muted-foreground text-sm">
                Estadísticas detalladas por canal y sesión
              </p>
            </div>
          </div>
          <DateRangeSelector
            dateRange={dateRange}
            onRangeChange={updateDateRange}
            onPresetSelect={setPresetRange}
          />
        </div>

        {/* Channel Type Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Tipo de Canal
          </label>
          <ChannelTypeSelector
            selectedChannel={channelType}
            onSelect={selectChannelType}
            sessionCounts={sessionCounts}
          />
        </div>

        {/* Session Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Sesión
          </label>
          <SessionSelector
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            onSelect={selectSession}
            isLoading={sessionsLoading}
          />
        </div>

        {/* Stats Cards */}
        <StatsCards stats={stats} isLoading={statsLoading} />

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MessagesByDayChart data={dailyStats} isLoading={dailyLoading} />
          <HourlyDistributionChart data={hourlyStats} isLoading={hourlyLoading} />
        </div>
      </div>
    </AppLayout>
  );
};

export default Reports;
