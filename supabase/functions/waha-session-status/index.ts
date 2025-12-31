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
    console.log('Session status from WAHA:', sessionData);

    const wahaStatus = sessionData.status || 'UNKNOWN';
    const phoneNumber = sessionData.me?.id ? sessionData.me.id.split('@')[0] : null;

    // Normalizar el estado de WAHA a nuestros estados internos
    let normalizedStatus = 'unknown';
    if (wahaStatus === 'WORKING') {
      normalizedStatus = 'connected';
    } else if (wahaStatus === 'SCAN_QR_CODE') {
      normalizedStatus = 'pending_qr';
    } else if (['STARTING', 'STOPPED', 'FAILED'].includes(wahaStatus)) {
      normalizedStatus = 'disconnected';
    }

    console.log(`WAHA status "${wahaStatus}" normalized to "${normalizedStatus}"`);

    // Actualizar estado en la base de datos
    if (connection_id) {
      const updateData: any = {
        status: normalizedStatus,
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
      } else {
        console.log(`Database updated: connection ${connection_id} set to "${normalizedStatus}"`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: normalizedStatus,
        waha_status: wahaStatus,
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
