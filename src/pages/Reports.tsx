import React from 'react';
import { BarChart3 } from 'lucide-react';
import { useReports } from '@/hooks/useReports';
import { ChannelTypeSelector } from '@/components/reports/ChannelTypeSelector';
import { SessionSelector } from '@/components/reports/SessionSelector';
import { DateRangeSelector } from '@/components/reports/DateRangeSelector';
import { StatsCards } from '@/components/reports/StatsCards';
import { MessagesByDayChart } from '@/components/reports/MessagesByDayChart';
import { HourlyDistributionChart } from '@/components/reports/HourlyDistributionChart';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const Reports: React.FC = () => {
  const {
    channelType,
    selectedSessionId,
    dateRange,
    sessions,
    stats,
    dailyStats,
    hourlyStats,
    sessionCounts,
    sessionsLoading,
    statsLoading,
    dailyLoading,
    hourlyLoading,
    countsLoading,
    selectSession,
    selectChannelType,
    updateDateRange,
    setPresetRange
  } = useReports();

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

      {/* Stats Cards - Show channel totals when no session selected */}
      {selectedSessionId ? (
        <StatsCards stats={stats} isLoading={statsLoading} />
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Selecciona una sesión para ver estadísticas detalladas
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      {selectedSessionId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MessagesByDayChart data={dailyStats} isLoading={dailyLoading} />
          <HourlyDistributionChart data={hourlyStats} isLoading={hourlyLoading} />
        </div>
      )}
    </div>
  );
};

export default Reports;
