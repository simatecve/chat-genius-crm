import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calculator, DollarSign, TrendingDown, Loader2, RefreshCw, Plug } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DateRangeSelector } from '@/components/reports/DateRangeSelector';
import type { DateRange } from '@/services/reportsService';
import { endOfDay, format, startOfDay, startOfMonth, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface CostEstimatorTabProps {
  userId: string;
}

type RegionKey = 'northAmerica' | 'mexico' | 'latinAmerica' | 'europe';

const COSTS = {
  internal: 0.00445,
  whatsapp: {
    northAmerica: 0.0046,
    mexico: 0.0098,
    latinAmerica: 0.0130,
    europe: 0.0230
  }
};

const REGION_LABELS: Record<RegionKey, { title: string; subtitle: string }> = {
  northAmerica: { title: 'Norteamérica', subtitle: 'Estados Unidos, Canadá' },
  mexico: { title: 'México', subtitle: 'México' },
  latinAmerica: { title: 'Latinoamérica', subtitle: 'Argentina, Brasil, Colombia, etc.' },
  europe: { title: 'España/Europa', subtitle: 'España, Alemania, Francia, etc.' }
};

const createPresetRange = (preset: 'today' | '7days' | '30days' | 'thisMonth'): DateRange => {
  const now = new Date();
  if (preset === 'today') {
    return { startDate: startOfDay(now), endDate: endOfDay(now) };
  }
  if (preset === '7days') {
    return { startDate: startOfDay(subDays(now, 6)), endDate: endOfDay(now) };
  }
  if (preset === '30days') {
    return { startDate: startOfDay(subDays(now, 29)), endDate: endOfDay(now) };
  }
  return { startDate: startOfDay(startOfMonth(now)), endDate: endOfDay(now) };
};

const CostEstimatorTab: React.FC<CostEstimatorTabProps> = ({ userId }) => {
  const [messageCount, setMessageCount] = useState<number>(0);
  const [isLoadingReal, setIsLoadingReal] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>(() => createPresetRange('30days'));
  const { toast } = useToast();

  const whatsappApiRates = useMemo(() => ({
    northAmerica: COSTS.whatsapp.northAmerica * 0.60,
    mexico: COSTS.whatsapp.mexico * 0.60,
    latinAmerica: COSTS.whatsapp.latinAmerica * 0.60,
    europe: COSTS.whatsapp.europe * 0.60
  }), []);

  const loadRealMessageCount = async (showToast = false) => {
    setIsLoadingReal(true);
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', dateRange.startDate.toISOString())
        .lte('created_at', dateRange.endDate.toISOString());

      if (error) throw error;

      setMessageCount(count || 0);
      if (showToast) {
        toast({
          title: 'Datos actualizados',
          description: `Se encontraron ${(count || 0).toLocaleString()} mensajes en este rango`,
        });
      }
    } catch (error) {
      console.error('Error loading message count:', error);
      if (showToast) {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos reales',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoadingReal(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadRealMessageCount(false);
    }
  }, [userId, dateRange.startDate, dateRange.endDate]);

  const handleRangeChange = (range: DateRange) => {
    setDateRange({ startDate: startOfDay(range.startDate), endDate: endOfDay(range.endDate) });
  };

  const internalCost = messageCount * COSTS.internal;
  const whatsappCosts = {
    northAmerica: messageCount * COSTS.whatsapp.northAmerica,
    mexico: messageCount * COSTS.whatsapp.mexico,
    latinAmerica: messageCount * COSTS.whatsapp.latinAmerica,
    europe: messageCount * COSTS.whatsapp.europe
  };
  const whatsappApiCosts = {
    northAmerica: messageCount * whatsappApiRates.northAmerica,
    mexico: messageCount * whatsappApiRates.mexico,
    latinAmerica: messageCount * whatsappApiRates.latinAmerica,
    europe: messageCount * whatsappApiRates.europe
  };

  const calculateSavings = (cost: number) => cost - internalCost;
  const calculateSavingsPercentage = (cost: number) => cost > 0 ? (calculateSavings(cost) / cost) * 100 : 0;

  const formatCurrency = (value: number) => `$${value.toFixed(2)} USD`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const rangeLabel = `${format(dateRange.startDate, 'dd MMM yyyy', { locale: es })} al ${format(dateRange.endDate, 'dd MMM yyyy', { locale: es })}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Estimador de Costos de Mensajería
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3">
            <Label>Rango de consumo</Label>
            <DateRangeSelector
              dateRange={dateRange}
              onRangeChange={handleRangeChange}
              onPresetSelect={(preset) => setDateRange(createPresetRange(preset))}
            />
            <p className="text-sm text-muted-foreground">
              Consumo calculado del {rangeLabel}. Se encontraron {messageCount.toLocaleString()} mensajes en este rango.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="messageCount">Cantidad de mensajes</Label>
              <Input
                id="messageCount"
                type="number"
                min={0}
                value={messageCount}
                onChange={(e) => setMessageCount(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="Ingresa la cantidad de mensajes"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => loadRealMessageCount(true)}
              disabled={isLoadingReal}
              className="flex items-center gap-2"
            >
              {isLoadingReal ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualizar datos
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Nuestro Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{formatCurrency(internalCost)}</p>
            <p className="text-sm text-muted-foreground mt-1">Costo aproximado por {messageCount.toLocaleString()} mensajes</p>
          </CardContent>
        </Card>

        {(Object.keys(REGION_LABELS) as RegionKey[]).map((region) => (
          <Card key={`whatsapp-${region}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">WhatsApp - {REGION_LABELS[region].title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCurrency(whatsappCosts[region])}</p>
              <p className="text-sm text-muted-foreground">{REGION_LABELS[region].subtitle}</p>
            </CardContent>
          </Card>
        ))}

        {(Object.keys(REGION_LABELS) as RegionKey[]).map((region) => (
          <Card key={`api-${region}`} className="border-accent/50 bg-accent/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Plug className="h-5 w-5 text-accent-foreground" />
                WhatsApp API - {REGION_LABELS[region].title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCurrency(whatsappApiCosts[region])}</p>
              <p className="text-sm text-muted-foreground">40% menos que WhatsApp normal</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {messageCount > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <TrendingDown className="h-5 w-5" />
              Comparativa de Ahorro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(Object.keys(REGION_LABELS) as RegionKey[]).map((region) => (
                <div key={`saving-wa-${region}`} className="p-3 rounded-lg bg-background border">
                  <p className="text-sm text-muted-foreground">vs WhatsApp {REGION_LABELS[region].title}</p>
                  <p className="text-lg font-semibold text-primary">{formatPercentage(calculateSavingsPercentage(whatsappCosts[region]))} ahorro</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(calculateSavings(whatsappCosts[region]))}</p>
                </div>
              ))}
              {(Object.keys(REGION_LABELS) as RegionKey[]).map((region) => (
                <div key={`saving-api-${region}`} className="p-3 rounded-lg bg-background border border-accent/40">
                  <p className="text-sm text-muted-foreground">vs WhatsApp API {REGION_LABELS[region].title}</p>
                  <p className="text-lg font-semibold text-primary">{formatPercentage(calculateSavingsPercentage(whatsappApiCosts[region]))} ahorro</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(calculateSavings(whatsappApiCosts[region]))}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Los costos mostrados son aproximados y pueden variar según el volumen y tipo de mensajes.
      </p>
    </div>
  );
};

export default CostEstimatorTab;
