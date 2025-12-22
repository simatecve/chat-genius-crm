import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { account_sid, auth_token } = await req.json();

    if (!account_sid || !auth_token) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Account SID y Auth Token son requeridos' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[twilio-verify-credentials] Verifying credentials for account: ${account_sid}`);

    // Llamar a la API de Twilio para verificar las credenciales
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${account_sid}.json`;
    const authHeader = btoa(`${account_sid}:${auth_token}`);
    
    const response = await fetch(twilioUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authHeader}`,
      },
    });

    if (response.ok) {
      const accountData = await response.json();
      console.log(`[twilio-verify-credentials] Credentials valid. Account status: ${accountData.status}`);
      
      return new Response(
        JSON.stringify({ 
          valid: true, 
          account_name: accountData.friendly_name,
          account_status: accountData.status,
          message: 'Credenciales válidas' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[twilio-verify-credentials] Invalid credentials. Status: ${response.status}`, errorData);
      
      let errorMessage = 'Credenciales inválidas';
      if (response.status === 401) {
        errorMessage = 'Account SID o Auth Token incorrectos';
      } else if (response.status === 404) {
        errorMessage = 'Account SID no encontrado';
      }
      
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: errorMessage,
          details: errorData.message || null
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error: unknown) {
    console.error('[twilio-verify-credentials] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: 'Error al verificar credenciales',
        details: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
