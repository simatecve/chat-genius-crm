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
      throw new Error('WAHA credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { session_name, connection_id } = await req.json();
    console.log('Checking status for session:', session_name);

    if (!session_name) {
      throw new Error('session_name is required');
    }

    // Obtener estado de la sesión desde WAHA
    const wahaResponse = await fetch(`${WAHA_BASE_URL}/api/sessions/${session_name}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': WAHA_API_KEY,
      },
    });

    if (!wahaResponse.ok) {
      const errorText = await wahaResponse.text();
      console.error('WAHA status API error:', errorText);
      throw new Error(`WAHA API error: ${wahaResponse.status} - ${errorText}`);
    }

    const sessionData = await wahaResponse.json();
    console.log('Session status:', sessionData);

    const status = sessionData.status || 'UNKNOWN';
    const phoneNumber = sessionData.me?.id ? sessionData.me.id.split('@')[0] : null;

    // Actualizar estado en la base de datos
    if (connection_id) {
      const updateData: any = {
        status: status,
        updated_at: new Date().toISOString(),
      };

      if (phoneNumber) {
        updateData.phone_number = phoneNumber;
      }

      const { error: updateError } = await supabase
        .from('whatsapp_connections')
        .update(updateData)
        .eq('id', connection_id);

      if (updateError) {
        console.error('Database update error:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: status,
        session: sessionData,
        phone_number: phoneNumber
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in waha-session-status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Failed to check session status'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
