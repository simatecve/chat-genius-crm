import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const payload = await req.json();
    console.log('WAHA webhook received:', JSON.stringify(payload, null, 2));

    const { event, session, payload: eventPayload } = payload;

    // Procesar evento de cambio de estado de sesión
    if (event === 'session.status') {
      const sessionName = session;
      const status = eventPayload?.status;

      if (!sessionName || !status) {
        console.warn('Invalid session.status event:', payload);
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Session ${sessionName} changed to status: ${status}`);

      // Actualizar estado en la base de datos
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .update({
          status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('name', sessionName);

      if (error) {
        console.error('Error updating session status:', error);
      } else {
        console.log('Session status updated in database');
      }
    }

    // Procesar mensajes recibidos (opcional, para funcionalidad futura)
    if (event === 'message') {
      console.log('Message event received:', eventPayload);
      // Aquí se puede agregar lógica para procesar mensajes entrantes
      // y guardarlos en la tabla de conversaciones/mensajes
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in waha-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        received: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
