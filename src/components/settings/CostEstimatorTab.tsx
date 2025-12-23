import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calculator, DollarSign, TrendingDown, Loader2, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CostEstimatorTabProps {
  userId: string;
}

// Costos por mensaje (USD)
const COSTS = {
  internal: 0.00445,
  whatsapp: {
    northAmerica: 0.0046,
    mexico: 0.0098,
    latinAmerica: 0.0130,
    europe: 0.0230
  }
};

const CostEstimatorTab: React.FC<CostEstimatorTabProps> = ({ userId }) => {
  const [messageCount, setMessageCount] = useState<number>(0);
  const [isLoadingReal, setIsLoadingReal] = useState(false);
  const { toast } = useToast();

  const loadRealMessageCount = async () => {
    setIsLoadingReal(true);
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) throw error;

      setMessageCount(count || 0);
      toast({
        title: "Datos cargados",
        description: `Se encontraron ${count || 0} mensajes en tu cuenta`,
      });
    } catch (error) {
      console.error('Error loading message count:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos reales",
        variant: "destructive",
      });
    } finally {
      setIsLoadingReal(false);
    }
  };

  // Calcular costos
  const internalCost = messageCount * COSTS.internal;
  const whatsappCosts = {
    northAmerica: messageCount * COSTS.whatsapp.northAmerica,
    mexico: messageCount * COSTS.whatsapp.mexico,
    latinAmerica: messageCount * COSTS.whatsapp.latinAmerica,
    europe: messageCount * COSTS.whatsapp.europe
  };

  // Calcular ahorros
  const savings = {
    northAmerica: whatsappCosts.northAmerica - internalCost,
    mexico: whatsappCosts.mexico - internalCost,
    latinAmerica: whatsappCosts.latinAmerica - internalCost,
    europe: whatsappCosts.europe - internalCost
  };

  const savingsPercentage = {
    northAmerica: whatsappCosts.northAmerica > 0 ? ((savings.northAmerica / whatsappCosts.northAmerica) * 100) : 0,
    mexico: whatsappCosts.mexico > 0 ? ((savings.mexico / whatsappCosts.mexico) * 100) : 0,
    latinAmerica: whatsappCosts.latinAmerica > 0 ? ((savings.latinAmerica / whatsappCosts.latinAmerica) * 100) : 0,
    europe: whatsappCosts.europe > 0 ? ((savings.europe / whatsappCosts.europe) * 100) : 0
  };

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(2)} USD`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Estimador de Costos de Mensajería
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              onClick={loadRealMessageCount}
              disabled={isLoadingReal}
              className="flex items-center gap-2"
            >
              {isLoadingReal ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              Usar mis datos reales
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Costos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Nuestro Sistema */}
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Nuestro Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{formatCurrency(internalCost)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Costo aproximado por {messageCount.toLocaleString()} mensajes
            </p>
          </CardContent>
        </Card>

        {/* WhatsApp Norteamérica */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">WhatsApp - Norteamérica</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(whatsappCosts.northAmerica)}</p>
            <p className="text-sm text-muted-foreground">Estados Unidos, Canadá</p>
          </CardContent>
        </Card>

        {/* WhatsApp México */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">WhatsApp - México</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(whatsappCosts.mexico)}</p>
            <p className="text-sm text-muted-foreground">México</p>
          </CardContent>
        </Card>

        {/* WhatsApp Latinoamérica */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">WhatsApp - Latinoamérica</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(whatsappCosts.latinAmerica)}</p>
            <p className="text-sm text-muted-foreground">Argentina, Brasil, Colombia, etc.</p>
          </CardContent>
        </Card>

        {/* WhatsApp Europa */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">WhatsApp - España/Europa</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(whatsappCosts.europe)}</p>
            <p className="text-sm text-muted-foreground">España, Alemania, Francia, etc.</p>
          </CardContent>
        </Card>
      </div>

      {/* Comparativa de Ahorro */}
      {messageCount > 0 && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <TrendingDown className="h-5 w-5" />
              Comparativa de Ahorro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-background border">
                <p className="text-sm text-muted-foreground">vs Norteamérica</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatPercentage(savingsPercentage.northAmerica)} ahorro
                </p>
                <p className="text-sm text-muted-foreground">{formatCurrency(savings.northAmerica)}</p>
              </div>
              <div className="p-3 rounded-lg bg-background border">
                <p className="text-sm text-muted-foreground">vs México</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatPercentage(savingsPercentage.mexico)} ahorro
                </p>
                <p className="text-sm text-muted-foreground">{formatCurrency(savings.mexico)}</p>
              </div>
              <div className="p-3 rounded-lg bg-background border">
                <p className="text-sm text-muted-foreground">vs Latinoamérica</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatPercentage(savingsPercentage.latinAmerica)} ahorro
                </p>
                <p className="text-sm text-muted-foreground">{formatCurrency(savings.latinAmerica)}</p>
              </div>
              <div className="p-3 rounded-lg bg-background border">
                <p className="text-sm text-muted-foreground">vs España/Europa</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatPercentage(savingsPercentage.europe)} ahorro
                </p>
                <p className="text-sm text-muted-foreground">{formatCurrency(savings.europe)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Nota informativa */}
      <p className="text-xs text-muted-foreground text-center">
        Los costos mostrados son aproximados y pueden variar según el volumen y tipo de mensajes.
      </p>
    </div>
  );
};

export default CostEstimatorTab;
