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
      console.error('Missing WAHA credentials - WAHA_BASE_URL:', !!WAHA_BASE_URL, 'WAHA_API_KEY:', !!WAHA_API_KEY);
      throw new Error('WAHA credentials not configured. Please add WAHA_BASE_URL and WAHA_API_KEY secrets.');
    }
    
    console.log('WAHA credentials configured, fetching QR...');

    const { session_name } = await req.json();
    console.log('Getting QR code for session:', session_name);

    if (!session_name) {
      throw new Error('session_name is required');
    }

    // Get QR code from WAHA - it's a GET request that returns JSON when Accept header is set
    const wahaResponse = await fetch(`${WAHA_BASE_URL}/api/${session_name}/auth/qr`, {
      method: 'GET',
      headers: {
        'X-Api-Key': WAHA_API_KEY,
        'Accept': 'application/json', // Get base64 image instead of binary
      },
    });

    if (!wahaResponse.ok) {
      const errorText = await wahaResponse.text();
      console.error('WAHA QR API error:', errorText);
      throw new Error(`WAHA API error: ${wahaResponse.status} - ${errorText}`);
    }

    const qrData = await wahaResponse.json();
    console.log('QR code obtained successfully');
    console.log('QR Data structure:', JSON.stringify(qrData).substring(0, 200));

    // WAHA devuelve { data: "base64...", mimetype: "image/png" }
    // Construir el data URL completo
    let qrImageUrl = qrData;
    if (qrData.data && qrData.mimetype) {
      qrImageUrl = `data:${qrData.mimetype};base64,${qrData.data}`;
      console.log('Constructed QR URL:', qrImageUrl.substring(0, 100) + '...');
    }

    return new Response(
      JSON.stringify({
        success: true,
        qr: qrImageUrl
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
