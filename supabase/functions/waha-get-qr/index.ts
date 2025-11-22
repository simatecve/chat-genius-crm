import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    if (!WAHA_BASE_URL || !WAHA_API_KEY) {
      throw new Error('WAHA credentials not configured');
    }

    const { session_name } = await req.json();
    console.log('Getting QR code for session:', session_name);

    if (!session_name) {
      throw new Error('session_name is required');
    }

    // Obtener código QR de WAHA
    const wahaResponse = await fetch(`${WAHA_BASE_URL}/api/${session_name}/auth/qr`, {
      method: 'POST',
      headers: {
        'X-Api-Key': WAHA_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!wahaResponse.ok) {
      const errorText = await wahaResponse.text();
      console.error('WAHA QR API error:', errorText);
      throw new Error(`WAHA API error: ${wahaResponse.status} - ${errorText}`);
    }

    const qrData = await wahaResponse.json();
    console.log('QR code obtained successfully');

    return new Response(
      JSON.stringify({
        success: true,
        qr: qrData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in waha-get-qr:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Failed to get QR code'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
