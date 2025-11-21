import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  CreditCard, 
  CheckCircle,
  Star,
  Zap,
  Users,
  MessageSquare,
  Phone,
  Bot,
  HardDrive,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Database } from '@/integrations/supabase/types';

type PaymentPlan = Database['public']['Tables']['subscription_plans']['Row'];
type UserSubscription = Database['public']['Tables']['user_subscriptions']['Row'];

const PaymentPlans = () => {
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchPlansAndSubscription();
    }
  }, [user]);

  const fetchPlansAndSubscription = async () => {
    try {
      setLoading(true);
      
      // Obtener planes activos
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (plansError) throw plansError;

      // Obtener suscripción actual del usuario
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .single();

      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        throw subscriptionError;
      }

      setPlans(plansData || []);
      setCurrentSubscription(subscriptionData);
    } catch (error: any) {
      console.error('Error fetching plans:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los planes de pago",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchasePlan = async (planId: string) => {
    if (!user) return;

    try {
      setPurchasing(planId);

      // Obtener el plan
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError || !plan) {
        throw new Error('Plan no encontrado');
      }

      // Obtener la configuración de Mercado Pago
      const { data: paymentMethod, error: pmError } = await supabase
        .from('payment_methods')
        .select('secret_key, name')
        .eq('provider', 'mercadopago')
        .eq('is_active', true)
        .single();

      if (pmError || !paymentMethod) {
        throw new Error('Mercado Pago no está configurado. Contacta al administrador.');
      }

      // Obtener perfil del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const accessToken = paymentMethod.secret_key; // secret_key es el Access Token
      const currentUrl = window.location.origin;

      // Crear la preferencia de pago
      const preferenceData = {
        items: [
          {
            title: `Plan ${plan.name}`,
            description: plan.description || `Suscripción mensual al plan ${plan.name}`,
            quantity: 1,
            unit_price: Number(plan.price),
            currency_id: 'ARS'
          }
        ],
        payer: {
          name: profile?.first_name || '',
          surname: profile?.last_name || '',
          email: user.email || '',
        },
        back_urls: {
          success: `${currentUrl}/payment-success`,
          failure: `${currentUrl}/payment-failure`,
          pending: `${currentUrl}/payment-pending`
        },
        auto_return: 'approved',
        metadata: {
          user_id: user.id,
          plan_id: planId,
          plan_name: plan.name
        },
        external_reference: `${user.id}-${planId}-${Date.now()}`
      };

      // Crear la preferencia en Mercado Pago
      const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferenceData)
      });

      if (!mpResponse.ok) {
        const errorText = await mpResponse.text();
        console.error('Mercado Pago API error:', errorText);
        throw new Error('Error al crear la preferencia de pago en Mercado Pago');
      }

      const preference = await mpResponse.json();

      // Guardar la referencia del pago pendiente
      await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: user.id,
          plan_id: planId,
          status: 'pending',
          started_at: new Date().toISOString()
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

      // Redirigir al usuario al checkout de Mercado Pago
      if (preference.init_point) {
        window.location.href = preference.init_point;
      } else {
        throw new Error('No se pudo obtener la URL de pago');
      }
    } catch (error: any) {
      console.error('Error purchasing plan:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo procesar el pago. Verifica que Mercado Pago esté configurado correctamente.",
        variant: "destructive",
      });
      setPurchasing(null);
    }
  };

  const getPlanFeatures = (plan: PaymentPlan) => [
    {
      icon: Phone,
      label: 'Conexiones WhatsApp',
      value: plan.max_whatsapp_connections
    },
    {
      icon: Users,
      label: 'Contactos',
      value: plan.max_contacts.toLocaleString()
    },
    {
      icon: MessageSquare,
      label: 'Conversaciones',
      value: plan.max_conversations?.toLocaleString() || 'Ilimitadas'
    },
    {
      icon: Calendar,
      label: 'Campañas por mes',
      value: plan.max_monthly_campaigns
    },
    {
      icon: Bot,
      label: 'Respuestas Bot',
      value: plan.max_bot_responses.toLocaleString()
    },
    {
      icon: HardDrive,
      label: 'Almacenamiento',
      value: `${(plan.max_storage_mb / 1024).toFixed(1)} GB`
    }
  ];

  const isCurrentPlan = (planId: string) => {
    return currentSubscription?.plan_id === planId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando planes de pago...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold flex items-center justify-center">
          <CreditCard className="mr-3 h-8 w-8" />
          Planes de Pago
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Elige el plan que mejor se adapte a las necesidades de tu negocio. 
          Puedes cambiar de plan en cualquier momento.
        </p>
        
        {currentSubscription && (
          <div className="bg-muted/50 rounded-lg p-4 max-w-md mx-auto">
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">Plan actual activo</span>
            </div>
          </div>
        )}
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {plans.map((plan) => {
          const features = getPlanFeatures(plan);
          const isCurrent = isCurrentPlan(plan.id);
          const isPurchasing = purchasing === plan.id;

          return (
            <Card key={plan.id} className={`relative ${isCurrent ? 'border-primary shadow-lg' : ''}`}>
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    <Star className="w-3 h-3 mr-1" />
                    Plan Actual
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="flex items-baseline justify-center space-x-1">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/mes</span>
                </div>
                {plan.description && (
                  <p className="text-muted-foreground text-sm mt-2">{plan.description}</p>
                )}
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Features */}
                <div className="space-y-3">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <feature.icon className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm flex-1">{feature.label}</span>
                      <span className="text-sm font-medium">{feature.value}</span>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                <div className="pt-4">
                  {isCurrent ? (
                    <Button className="w-full" disabled>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Plan Activo
                    </Button>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          className="w-full" 
                          variant={currentSubscription ? "outline" : "default"}
                          disabled={isPurchasing}
                        >
                          {isPurchasing ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                              Activando...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-2" />
                              {currentSubscription ? 'Cambiar Plan' : 'Activar Plan'}
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {currentSubscription ? 'Cambiar Plan' : 'Activar Plan'}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {currentSubscription 
                              ? `¿Estás seguro de que quieres cambiar a ${plan.name}? El cambio será efectivo inmediatamente.`
                              : `¿Estás seguro de que quieres activar el plan ${plan.name}? Será activado inmediatamente.`
                            }
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handlePurchasePlan(plan.id)}>
                            {currentSubscription ? 'Cambiar Plan' : 'Activar Plan'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {plans.length === 0 && (
        <div className="text-center py-12">
          <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            No hay planes disponibles
          </h3>
          <p className="text-muted-foreground">
            Actualmente no hay planes de pago disponibles. Contacta al administrador.
          </p>
        </div>
      )}
    </div>
  );
};

export default PaymentPlans;