import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Función para buscar sesión en WAHA con coincidencia parcial
async function findWahaSession(
  sessionName: string, 
  wahaBaseUrl: string, 
  wahaApiKey: string
): Promise<{ found: boolean; wahaName: string | null; sessionData: any }> {
  
  // 1. Intentar nombre exacto
  console.log(`Trying exact match for session: ${sessionName}`);
  const exactUrl = `${wahaBaseUrl}/api/sessions/${encodeURIComponent(sessionName)}`;
  const exactResponse = await fetch(exactUrl, {
    method: 'GET',
    headers: { 'X-Api-Key': wahaApiKey }
  });
  
  if (exactResponse.ok) {
    const data = await exactResponse.json();
    console.log(`Exact match found for session: ${sessionName}`);
    return { found: true, wahaName: sessionName, sessionData: data };
  }
  
  console.log(`Exact match not found (status: ${exactResponse.status}), searching all sessions...`);
  
  // 2. Buscar en todas las sesiones con coincidencia parcial
  const sessionsUrl = `${wahaBaseUrl}/api/sessions`;
  const sessionsResponse = await fetch(sessionsUrl, {
    method: 'GET',
    headers: { 'X-Api-Key': wahaApiKey }
  });
  
  if (!sessionsResponse.ok) {
    console.error(`Failed to list WAHA sessions: ${sessionsResponse.status}`);
    return { found: false, wahaName: null, sessionData: null };
  }
  
  const sessions = await sessionsResponse.json();
  console.log(`Found ${sessions.length} sessions in WAHA`);
  
  // Obtener el nombre base (sin sufijos como " PRINCIPAL", " META", etc.)
  const baseName = sessionName.split(' ')[0];
  console.log(`Looking for partial match with baseName: ${baseName}`);
  
  // Buscar coincidencia
  const match = sessions.find((s: any) => 
    s.name === baseName || 
    s.name.startsWith(baseName) ||
    sessionName.startsWith(s.name)
  );
  
  if (match) {
    console.log(`Found matching session: DB="${sessionName}" -> WAHA="${match.name}"`);
    
    // Obtener datos completos de la sesión encontrada
    const detailUrl = `${wahaBaseUrl}/api/sessions/${encodeURIComponent(match.name)}`;
    const detailResponse = await fetch(detailUrl, {
      method: 'GET',
      headers: { 'X-Api-Key': wahaApiKey }
    });
    
    if (detailResponse.ok) {
      const detailData = await detailResponse.json();
      return { found: true, wahaName: match.name, sessionData: detailData };
    }
    
    // Si no podemos obtener detalles, devolver los datos básicos del listado
    return { found: true, wahaName: match.name, sessionData: match };
  }
  
  console.log(`No matching session found for: ${sessionName}`);
  return { found: false, wahaName: null, sessionData: null };
}

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

    const { session_name, connection_id, update_db = false } = await req.json();
    
    // Log de auditoría para rastrear quién llama a esta función
    console.log('waha-session-status audit:', {
      session_name,
      connection_id,
      update_db,
      hasAuth: !!req.headers.get('authorization'),
      userAgent: req.headers.get('user-agent')?.substring(0, 100)
    });

    if (!session_name) {
      throw new Error('session_name is required');
    }

    // Buscar sesión en WAHA con coincidencia parcial
    const { found, wahaName, sessionData } = await findWahaSession(
      session_name, 
      WAHA_BASE_URL, 
      WAHA_API_KEY
    );

    // Si no se encontró la sesión en WAHA
    if (!found || !sessionData) {
      console.log(`Session "${session_name}" not found in WAHA`);
      
      // Solo actualizar BD si update_db es true (verificación manual)
      if (connection_id && update_db) {
        const { error: updateError } = await supabase
          .from('whatsapp_connections')
          .update({
            status: 'disconnected',
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection_id);

        if (updateError) {
          console.error('Database update error:', updateError);
        } else {
          console.log(`Database updated (manual verify): connection ${connection_id} set to "disconnected"`);
        }
      } else {
        console.log(`Skipping DB update: update_db=${update_db}, connection_id=${connection_id}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: 'disconnected',
          waha_status: 'NOT_FOUND',
          message: 'Session not found in WAHA. Please reconnect by scanning QR code.',
          session: null,
          phone_number: null
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`Session found in WAHA as "${wahaName}":`, sessionData);

    const wahaStatus = sessionData.status || 'UNKNOWN';
    const phoneNumber = sessionData.me?.id ? sessionData.me.id.split('@')[0] : null;

    // Normalizar el estado de WAHA a nuestros estados internos
    // IMPORTANTE: STARTING es transitorio, NO marcar como disconnected
    let normalizedStatus = 'unknown';
    if (wahaStatus === 'WORKING') {
      normalizedStatus = 'connected';
    } else if (wahaStatus === 'SCAN_QR_CODE') {
      normalizedStatus = 'pending_qr';
    } else if (wahaStatus === 'STARTING') {
      // STARTING es transitorio, mantener como connected para no afectar UI
      normalizedStatus = 'connected';
      console.log('STARTING status detected - treating as connected (transient state)');
    } else if (['STOPPED', 'FAILED'].includes(wahaStatus)) {
      normalizedStatus = 'disconnected';
    }

    console.log(`WAHA status "${wahaStatus}" normalized to "${normalizedStatus}"`);

    // Solo actualizar BD si update_db es true (verificación manual del usuario)
    if (connection_id && update_db) {
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
        console.log(`Database updated (manual verify): connection ${connection_id} set to "${normalizedStatus}"`);
      }
    } else {
      console.log(`Skipping DB update: update_db=${update_db}, connection_id=${connection_id}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: normalizedStatus,
        waha_status: wahaStatus,
        waha_session_name: wahaName,
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
