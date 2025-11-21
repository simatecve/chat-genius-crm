import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    console.log('Mercado Pago webhook received:', JSON.stringify(body, null, 2));

    // Mercado Pago envía notificaciones de tipo "payment"
    if (body.type === 'payment') {
      const paymentId = body.data.id;
      
      // Obtener configuración de Mercado Pago
      const { data: paymentMethod, error: pmError } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('provider', 'mercadopago')
        .eq('is_active', true)
        .single();

      if (pmError || !paymentMethod) {
        console.error('Mercado Pago no configurado');
        throw new Error('Mercado Pago no está configurado');
      }

      const accessToken = paymentMethod.secret_key;

      // Obtener información del pago
      const paymentResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!paymentResponse.ok) {
        throw new Error('Error al obtener información del pago');
      }

      const payment = await paymentResponse.json();
      console.log('Payment details:', JSON.stringify(payment, null, 2));

      // Solo procesar pagos aprobados
      if (payment.status === 'approved') {
        const userId = payment.metadata.user_id;
        const planId = payment.metadata.plan_id;

        console.log('Payment approved for user:', userId, 'plan:', planId);

        // Verificar si ya existe una suscripción activa
        const { data: existingSubscription } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active')
          .single();

        if (existingSubscription) {
          // Actualizar suscripción existente
          const { error: updateError } = await supabase
            .from('user_subscriptions')
            .update({
              plan_id: planId,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSubscription.id);

          if (updateError) {
            console.error('Error updating subscription:', updateError);
            throw updateError;
          }

          console.log('Subscription updated:', existingSubscription.id);
        } else {
          // Crear nueva suscripción
          const { error: insertError } = await supabase
            .from('user_subscriptions')
            .insert({
              user_id: userId,
              plan_id: planId,
              status: 'active',
              started_at: new Date().toISOString()
            });

          if (insertError) {
            console.error('Error creating subscription:', insertError);
            throw insertError;
          }

          console.log('Subscription created for user:', userId);
        }

        // Actualizar plan_id en el perfil del usuario
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ plan_id: planId })
          .eq('id', userId);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});