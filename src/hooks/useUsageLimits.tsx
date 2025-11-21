import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type SubscriptionPlan = Database['public']['Tables']['subscription_plans']['Row'];
type UserUsage = Database['public']['Tables']['user_usage']['Row'];
type UserSubscription = Database['public']['Tables']['user_subscriptions']['Row'];

interface UsageLimits {
  plan: SubscriptionPlan | null;
  usage: UserUsage | null;
  subscription: UserSubscription | null;
  loading: boolean;
  error: string | null;
}

interface LimitCheck {
  allowed: boolean;
  usage: number;
  limit: number;
  percentage: number;
  message?: string;
}

export const useUsageLimits = () => {
  const [limitsData, setLimitsData] = useState<UsageLimits>({
    plan: null,
    usage: null,
    subscription: null,
    loading: true,
    error: null
  });
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchUsageLimits();
    }
  }, [user]);

  const fetchUsageLimits = async () => {
    if (!user) return;

    try {
      setLimitsData(prev => ({ ...prev, loading: true, error: null }));

      // Obtener suscripción activa del usuario
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (subError) throw subError;

      // Obtener uso actual del mes
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
      const { data: usage, error: usageError } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', user.id)
        .eq('usage_month', currentMonth)
        .maybeSingle();

      if (usageError && usageError.code !== 'PGRST116') {
        throw usageError;
      }

      setLimitsData({
        plan: subscription?.subscription_plans || null,
        usage: usage || null,
        subscription: subscription || null,
        loading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Error fetching usage limits:', error);
      setLimitsData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al cargar límites de uso'
      }));
    }
  };

  const checkLimit = (resourceType: keyof UserUsage, requestedAmount: number = 1): LimitCheck => {
    if (!limitsData.plan || !limitsData.usage) {
      return {
        allowed: false,
        usage: 0,
        limit: 0,
        percentage: 0,
        message: 'No se pudo verificar el límite'
      };
    }

    const { plan, usage } = limitsData;
    let currentUsage = 0;
    let limit = 0;
    let resourceName = '';

    switch (resourceType) {
      case 'whatsapp_connections_used':
        currentUsage = usage.whatsapp_connections_used;
        limit = plan.max_whatsapp_connections;
        resourceName = 'conexiones WhatsApp';
        break;
      case 'contacts_used':
        currentUsage = usage.contacts_used;
        limit = plan.max_contacts;
        resourceName = 'contactos';
        break;
      case 'campaigns_this_month':
        currentUsage = usage.campaigns_this_month;
        limit = plan.max_monthly_campaigns;
        resourceName = 'campañas este mes';
        break;
      case 'bot_responses_this_month':
        currentUsage = usage.bot_responses_this_month;
        limit = plan.max_bot_responses;
        resourceName = 'respuestas del bot este mes';
        break;
      case 'storage_used_mb':
        currentUsage = usage.storage_used_mb;
        limit = plan.max_storage_mb;
        resourceName = 'almacenamiento (MB)';
        break;
      case 'device_sessions_used':
        currentUsage = usage.device_sessions_used;
        limit = plan.max_device_sessions || 1;
        resourceName = 'sesiones de dispositivo';
        break;
      case 'conversations_used':
        currentUsage = usage.conversations_used;
        limit = plan.max_conversations || 100;
        resourceName = 'conversaciones';
        break;
      default:
        return {
          allowed: false,
          usage: 0,
          limit: 0,
          percentage: 0,
          message: 'Recurso no reconocido'
        };
    }

    const wouldExceed = (currentUsage + requestedAmount) > limit;
    const percentage = Math.round((currentUsage / limit) * 100);

    return {
      allowed: !wouldExceed,
      usage: currentUsage,
      limit,
      percentage,
      message: wouldExceed 
        ? `Has alcanzado el límite de ${resourceName} (${currentUsage}/${limit}). Actualiza tu plan para continuar.`
        : percentage >= 80 
          ? `Te estás acercando al límite de ${resourceName} (${currentUsage}/${limit} - ${percentage}%).`
          : undefined
    };
  };

  const checkUsageLimit = async (resourceType: string, requestedAmount: number = 1): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .rpc('check_usage_limit', {
          p_user_id: user.id,
          p_resource_type: resourceType,
          p_requested_amount: requestedAmount
        });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error checking usage limit:', error);
      return false;
    }
  };

  const incrementUsage = async (resourceType: string, amount: number = 1): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .rpc('increment_usage', {
          p_user_id: user.id,
          p_resource_type: resourceType,
          p_amount: amount
        });

      if (error) throw error;
      
      // Refrescar datos después de incrementar
      await fetchUsageLimits();
      return data;
    } catch (error: any) {
      console.error('Error incrementing usage:', error);
      return false;
    }
  };

  const showLimitWarning = (check: LimitCheck) => {
    if (check.message) {
      toast({
        title: !check.allowed ? "Límite alcanzado" : "Advertencia de límite",
        description: check.message,
        variant: !check.allowed ? "destructive" : "default",
      });
    }
  };

  const enforceLimit = async (resourceType: string, requestedAmount: number = 1): Promise<boolean> => {
    const allowed = await checkUsageLimit(resourceType, requestedAmount);
    
    if (!allowed) {
      toast({
        title: "Límite alcanzado",
        description: "Has alcanzado el límite de tu plan actual. Actualiza tu plan para continuar.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const getUsagePercentage = (resourceType: keyof UserUsage): number => {
    const check = checkLimit(resourceType, 0);
    return check.percentage;
  };

  const isNearLimit = (resourceType: keyof UserUsage, threshold: number = 80): boolean => {
    const percentage = getUsagePercentage(resourceType);
    return percentage >= threshold;
  };

  const hasActivePlan = (): boolean => {
    return limitsData.subscription?.status === 'active' && limitsData.plan !== null;
  };

  return {
    ...limitsData,
    checkLimit,
    checkUsageLimit,
    incrementUsage,
    showLimitWarning,
    enforceLimit,
    getUsagePercentage,
    isNearLimit,
    hasActivePlan,
    refetch: fetchUsageLimits
  };
};