import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Zap, CreditCard } from 'lucide-react';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { Database } from '@/integrations/supabase/types';

type UserUsage = Database['public']['Tables']['user_usage']['Row'];

interface UsageLimitAlertProps {
  resourceType: keyof UserUsage;
  showDetails?: boolean;
  className?: string;
}

export const UsageLimitAlert: React.FC<UsageLimitAlertProps> = ({
  resourceType,
  showDetails = true,
  className = ""
}) => {
  const { checkLimit, hasActivePlan } = useUsageLimits();

  if (!hasActivePlan()) {
    return (
      <Alert className={`border-orange-200 bg-orange-50 ${className}`}>
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <strong>Sin plan activo:</strong> Necesitas un plan activo para usar esta funcionalidad.
          </div>
          <Button size="sm" variant="outline" asChild>
            <a href="/planes-pago">
              <CreditCard className="w-4 h-4 mr-2" />
              Ver Planes
            </a>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const limitCheck = checkLimit(resourceType, 0);

  if (limitCheck.percentage < 70) {
    return null; // No mostrar alerta si está por debajo del 70%
  }

  const getAlertStyle = () => {
    if (limitCheck.percentage >= 100) {
      return {
        className: "border-red-200 bg-red-50",
        iconColor: "text-red-600",
        progressColor: "bg-red-500"
      };
    } else if (limitCheck.percentage >= 90) {
      return {
        className: "border-orange-200 bg-orange-50",
        iconColor: "text-orange-600",
        progressColor: "bg-orange-500"
      };
    } else {
      return {
        className: "border-yellow-200 bg-yellow-50",
        iconColor: "text-yellow-600",
        progressColor: "bg-yellow-500"
      };
    }
  };

  const alertStyle = getAlertStyle();

  const getResourceName = () => {
    const resourceNames: Record<string, string> = {
      whatsapp_connections_used: 'Conexiones WhatsApp',
      contacts_used: 'Contactos',
      campaigns_this_month: 'Campañas este mes',
      bot_responses_this_month: 'Respuestas del bot',
      storage_used_mb: 'Almacenamiento',
      device_sessions_used: 'Sesiones de dispositivo',
      conversations_used: 'Conversaciones'
    };
    return resourceNames[resourceType] || 'Recurso';
  };

  const getMessage = () => {
    if (limitCheck.percentage >= 100) {
      return `Has alcanzado el límite de ${getResourceName().toLowerCase()}`;
    } else if (limitCheck.percentage >= 90) {
      return `Estás muy cerca del límite de ${getResourceName().toLowerCase()}`;
    } else {
      return `Te estás acercando al límite de ${getResourceName().toLowerCase()}`;
    }
  };

  return (
    <Alert className={`${alertStyle.className} ${className}`}>
      <AlertTriangle className={`h-4 w-4 ${alertStyle.iconColor}`} />
      <AlertDescription>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <strong>{getMessage()}</strong>
              {showDetails && (
                <div className="text-sm text-muted-foreground mt-1">
                  {limitCheck.usage} de {limitCheck.limit} utilizados ({limitCheck.percentage}%)
                </div>
              )}
            </div>
            {limitCheck.percentage >= 90 && (
              <Button size="sm" variant="outline" asChild>
                <a href="/planes-pago">
                  <Zap className="w-4 h-4 mr-2" />
                  Actualizar Plan
                </a>
              </Button>
            )}
          </div>
          
          {showDetails && (
            <Progress 
              value={Math.min(limitCheck.percentage, 100)} 
              className="h-2"
            />
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default UsageLimitAlert;