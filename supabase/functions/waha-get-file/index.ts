import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const WAHA_API_KEY = Deno.env.get('WAHA_API_KEY');

    if (!WAHA_API_KEY) {
      throw new Error('WAHA API key not configured');
    }

    const { fileUrl } = await req.json();

    if (!fileUrl) {
      throw new Error('File URL is required');
    }

    console.log('Fetching file from WAHA:', fileUrl);

    // Hacer request al archivo con autenticación
    const response = await fetch(fileUrl, {
      method: 'GET',
      headers: {
        'X-Api-Key': WAHA_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }

    // Obtener el contenido como array buffer
    const arrayBuffer = await response.arrayBuffer();
    const mimeType = response.headers.get('content-type') || 'application/octet-stream';

    // Convertir a base64
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );

    const dataUrl = `data:${mimeType};base64,${base64}`;

    return new Response(
      JSON.stringify({
        file: dataUrl,
        mimeType,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in waha-get-file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
