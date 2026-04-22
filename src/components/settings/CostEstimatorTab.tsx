import React, { useState, useEffect } from 'react';
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

const BASE_INTERNAL_COST = 0.00445;
const WHATSAPP_REFERENCE_COST = 0.0126;

const COSTS = {
  internal: BASE_INTERNAL_COST * 1.60,
  twilio: 0.064,
  whatsappAverage: WHATSAPP_REFERENCE_COST,
  whatsappApi: WHATSAPP_REFERENCE_COST * 0.60
};

const emptyChannelCounts = { twilio: 0, whatsappApi: 0 };

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
  const [messageCounts, setMessageCounts] = useState(emptyChannelCounts);
  const [isLoadingReal, setIsLoadingReal] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>(() => createPresetRange('30days'));
  const { toast } = useToast();

  const countMessagesForConversations = async (conversationIds: string[]) => {
    if (conversationIds.length === 0) return 0;

    let total = 0;
    for (let index = 0; index < conversationIds.length; index += 500) {
      const batch = conversationIds.slice(index, index + 500);
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('conversation_id', batch)
        .gte('created_at', dateRange.startDate.toISOString())
        .lte('created_at', dateRange.endDate.toISOString());

      if (error) throw error;
      total += count || 0;
    }

    return total;
  };

  const loadRealMessageCount = async (showToast = false) => {
    setIsLoadingReal(true);
    try {
      const [{ data: twilioConversations, error: twilioError }, { data: apiConnections, error: apiConnectionsError }] = await Promise.all([
        supabase
          .from('conversations')
          .select('id')
          .eq('user_id', userId)
          .or('channel_type.eq.twilio,twilio_connection_id.not.is.null'),
        supabase
          .from('whatsapp_connections')
          .select('phone_number, connection_subtype')
          .eq('user_id', userId)
          .eq('connection_subtype', 'api')
      ]);

      if (twilioError) throw twilioError;
      if (apiConnectionsError) throw apiConnectionsError;

      const apiPhoneNumbers = (apiConnections || []).map(connection => connection.phone_number).filter(Boolean);
      let apiConversationIds: string[] = [];

      if (apiPhoneNumbers.length > 0) {
        const { data: apiConversations, error: apiConversationsError } = await supabase
          .from('conversations')
          .select('id')
          .eq('user_id', userId)
          .eq('channel_type', 'whatsapp')
          .in('whatsapp_number', apiPhoneNumbers);

        if (apiConversationsError) throw apiConversationsError;
        apiConversationIds = (apiConversations || []).map(conversation => conversation.id);
      }

      const [twilioCount, whatsappApiCount] = await Promise.all([
        countMessagesForConversations((twilioConversations || []).map(conversation => conversation.id)),
        countMessagesForConversations(apiConversationIds)
      ]);

      setMessageCounts({ twilio: twilioCount, whatsappApi: whatsappApiCount });
      if (showToast) {
        toast({
          title: 'Datos actualizados',
          description: `Twilio: ${twilioCount.toLocaleString()} mensajes · WhatsApp API: ${whatsappApiCount.toLocaleString()} mensajes`,
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

  const totalMessageCount = messageCounts.twilio + messageCounts.whatsappApi;
  const internalCost = totalMessageCount * COSTS.internal;
  const twilioCost = messageCounts.twilio * COSTS.twilio;
  const whatsappApiCost = messageCounts.whatsappApi * COSTS.whatsappApi;

  const calculateSavings = (cost: number, count: number) => cost - (count * COSTS.internal);
  const calculateSavingsPercentage = (cost: number, count: number) => cost > 0 ? (calculateSavings(cost, count) / cost) * 100 : 0;

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
              Consumo calculado del {rangeLabel}. Twilio: {messageCounts.twilio.toLocaleString()} mensajes · WhatsApp API: {messageCounts.whatsappApi.toLocaleString()} mensajes.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <div className="space-y-2">
              <Label htmlFor="twilioMessageCount">Mensajes Twilio</Label>
              <Input
                id="twilioMessageCount"
                type="number"
                min={0}
                value={messageCounts.twilio}
                onChange={(e) => setMessageCounts(prev => ({ ...prev, twilio: Math.max(0, parseInt(e.target.value) || 0) }))}
                placeholder="Mensajes Twilio"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsappApiMessageCount">Mensajes WhatsApp API</Label>
              <Input
                id="whatsappApiMessageCount"
                type="number"
                min={0}
                value={messageCounts.whatsappApi}
                onChange={(e) => setMessageCounts(prev => ({ ...prev, whatsappApi: Math.max(0, parseInt(e.target.value) || 0) }))}
                placeholder="Mensajes WhatsApp API"
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
            <p className="text-sm text-muted-foreground mt-1">Costo aproximado por {totalMessageCount.toLocaleString()} mensajes reales</p>
            <p className="text-xs text-muted-foreground mt-2">Tarifa referencial: ${COSTS.internal.toFixed(4)} USD por mensaje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Twilio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(twilioCost)}</p>
            <p className="text-sm text-muted-foreground">Costo real estimado por {messageCounts.twilio.toLocaleString()} mensajes Twilio</p>
            <p className="text-xs text-muted-foreground mt-2">Promedio real actualizado: $0.064 USD por mensaje</p>
          </CardContent>
        </Card>

        <Card className="border-accent/50 bg-accent/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Plug className="h-5 w-5 text-accent-foreground" />
              WhatsApp API
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(whatsappApiCost)}</p>
            <p className="text-sm text-muted-foreground">40% menos que WhatsApp normal · {messageCounts.whatsappApi.toLocaleString()} mensajes</p>
            <p className="text-xs text-muted-foreground mt-2">Tarifa referencial: ${COSTS.whatsappApi.toFixed(4)} USD por mensaje</p>
          </CardContent>
        </Card>
      </div>

      {totalMessageCount > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <TrendingDown className="h-5 w-5" />
              Comparativa de Ahorro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-background border">
                <p className="text-sm text-muted-foreground">vs Twilio</p>
                <p className="text-lg font-semibold text-primary">{formatPercentage(calculateSavingsPercentage(twilioCost, messageCounts.twilio))} ahorro</p>
                <p className="text-sm text-muted-foreground">{formatCurrency(calculateSavings(twilioCost, messageCounts.twilio))}</p>
              </div>
              <div className="p-3 rounded-lg bg-background border border-accent/40">
                <p className="text-sm text-muted-foreground">vs WhatsApp API</p>
                <p className="text-lg font-semibold text-primary">{formatPercentage(calculateSavingsPercentage(whatsappApiCost, messageCounts.whatsappApi))} ahorro</p>
                <p className="text-sm text-muted-foreground">{formatCurrency(calculateSavings(whatsappApiCost, messageCounts.whatsappApi))}</p>
              </div>
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
