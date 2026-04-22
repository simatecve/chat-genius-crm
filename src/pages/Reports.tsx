import React from 'react';
import { BarChart3 } from 'lucide-react';
import { useReports } from '@/hooks/useReports';
import { ChannelTypeSelector } from '@/components/reports/ChannelTypeSelector';
import { SessionSelector } from '@/components/reports/SessionSelector';
import { DateRangeSelector } from '@/components/reports/DateRangeSelector';
import { StatsCards } from '@/components/reports/StatsCards';
import { MessagesByDayChart } from '@/components/reports/MessagesByDayChart';
import { HourlyDistributionChart } from '@/components/reports/HourlyDistributionChart';
import { NewConversationsChart } from '@/components/reports/NewConversationsChart';
import { ChannelProfitabilityPanel } from '@/components/reports/ChannelProfitabilityPanel';
import { AgentPerformanceRanking } from '@/components/reports/AgentPerformanceRanking';
import { SystemHealthCenter } from '@/components/reports/SystemHealthCenter';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const Reports: React.FC = () => {
  const {
    channelType,
    selectedSessionId,
    isAllSessions,
    dateRange,
    sessions,
    stats,
    dailyStats,
    hourlyStats,
    newConversationsDaily,
    sessionCounts,
    profitabilityStats,
    agentPerformanceStats,
    systemHealthStats,
    sessionsLoading,
    statsLoading,
    dailyLoading,
    hourlyLoading,
    newConvsLoading,
    countsLoading,
    profitabilityLoading,
    agentPerformanceLoading,
    systemHealthLoading,
    selectSession,
    selectChannelType,
    updateDateRange,
    setPresetRange
  } = useReports();

  // Get label for current view
  const getViewLabel = () => {
    if (isAllSessions) {
      const channelLabels: Record<string, string> = {
        whatsapp: 'WhatsApp WAHA',
        twilio: 'Twilio',
        telegram: 'Telegram',
        webchat: 'WebChat'
      };
      return `Todas las sesiones de ${channelLabels[channelType]}`;
    }
    const session = sessions.find(s => s.id === selectedSessionId);
    return session?.name || 'Sesión seleccionada';
  };

  return (
    <div className="space-y-6">
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

      {/* Channel Type Selector with Counts */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Tipo de Canal
        </label>
        {countsLoading ? (
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-10 w-32" />
            ))}
          </div>
        ) : (
          <ChannelTypeSelector
            selectedChannel={channelType}
            onSelect={selectChannelType}
            sessionCounts={sessionCounts}
          />
        )}
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

      {/* Current View Indicator */}
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
        <span className="text-sm text-muted-foreground">Mostrando datos de:</span>
        <Badge variant={isAllSessions ? 'default' : 'secondary'} className="text-sm">
          {getViewLabel()}
        </Badge>
      </div>

      {/* Stats Cards - Always visible */}
      <StatsCards stats={stats} isLoading={statsLoading} />

      <ChannelProfitabilityPanel
        stats={profitabilityStats}
        isLoading={profitabilityLoading}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AgentPerformanceRanking
          agents={agentPerformanceStats}
          isLoading={agentPerformanceLoading}
        />
        <SystemHealthCenter
          stats={systemHealthStats}
          isLoading={systemHealthLoading}
        />
      </div>

      {/* Charts - Always visible */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MessagesByDayChart data={dailyStats} isLoading={dailyLoading} />
        <NewConversationsChart data={newConversationsDaily} isLoading={newConvsLoading} />
      </div>
      
      <div className="grid grid-cols-1">
        <HourlyDistributionChart data={hourlyStats} isLoading={hourlyLoading} />
      </div>
    </div>
  );
};

export default Reports;