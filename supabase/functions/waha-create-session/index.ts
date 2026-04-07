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
    const WAHA_BASE_URL = Deno.env.get('WAHA_BASE_URL');
    const WAHA_API_KEY = Deno.env.get('WAHA_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!WAHA_BASE_URL || !WAHA_API_KEY) {
      console.error('Missing WAHA credentials - WAHA_BASE_URL:', !!WAHA_BASE_URL, 'WAHA_API_KEY:', !!WAHA_API_KEY);
      throw new Error('WAHA credentials not configured');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase credentials - SUPABASE_URL:', !!SUPABASE_URL, 'SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_ROLE_KEY);
      throw new Error('Supabase credentials not configured. Please add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY secrets.');
    }

    console.log('All credentials configured correctly');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const payload = await req.json();
    console.log('Creating WAHA session with payload:', payload);

    const {
      user_id,
      session_name,
      phone_number,
      workspace_id,
      workspace_name,
      default_column_id,
      email,
      first_name,
      last_name,
      company_name,
      plan_type,
      connection_subtype,
      n8n_webhook_url
    } = payload;

    if (!session_name || !user_id) {
      throw new Error('session_name and user_id are required');
    }

    // Sanitize session name: only allow alphanumeric, hyphens, and underscores
    const sanitizedSessionName = session_name
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/[^a-zA-Z0-9-_]/g, '') // Remove invalid characters
      .toLowerCase();

    // Configurar webhook URL para recibir actualizaciones de WAHA
    const webhookUrl = `${SUPABASE_URL}/functions/v1/waha-webhook`;

    // Crear sesión en WAHA
    const wahaResponse = await fetch(`${WAHA_BASE_URL}/api/sessions/`, {
      method: 'POST',
      headers: {
        'X-Api-Key': WAHA_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: sanitizedSessionName,
        config: {
          webhooks: [
            {
              url: webhookUrl,
              // Removido 'session.status' - solo el botón Verificar actualiza estados
              events: ['message', 'message.any'],
              hmac: null,
              retries: null,
              customHeaders: null
            }
          ]
        }
      }),
    });

    if (!wahaResponse.ok) {
      const errorText = await wahaResponse.text();
      console.error('WAHA API error:', errorText);
      throw new Error(`WAHA API error: ${wahaResponse.status} - ${errorText}`);
    }

    const wahaData = await wahaResponse.json();
    console.log('WAHA session created:', wahaData);

    // Iniciar la sesión
    const startResponse = await fetch(`${WAHA_BASE_URL}/api/sessions/${sanitizedSessionName}/start`, {
      method: 'POST',
      headers: {
        'X-Api-Key': WAHA_API_KEY,
      },
    });

    if (!startResponse.ok) {
      const errorText = await startResponse.text();
      console.error('WAHA start session error:', errorText);
    }

    // Guardar en Supabase
    const { data: connectionData, error: dbError } = await supabase
      .from('whatsapp_connections')
      .insert({
        user_id,
        name: sanitizedSessionName,
        phone_number,
        workspace_id: workspace_id || null,
        default_column_id: default_column_id || null,
        n8n_webhook_url: n8n_webhook_url || null,
        connection_subtype: connection_subtype || 'qr',
        status: 'STARTING',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log('Connection saved to database:', connectionData);

    return new Response(
      JSON.stringify({
        success: true,
        session: wahaData,
        connection: connectionData,
        message: 'Session created successfully. Please scan the QR code.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in waha-create-session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Failed to create WAHA session'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
