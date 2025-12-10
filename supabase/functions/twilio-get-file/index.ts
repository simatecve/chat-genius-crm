import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { mediaUrl, twilioConnectionId } = await req.json();
    
    console.log('Fetching Twilio media:', { mediaUrl, twilioConnectionId });

    if (!mediaUrl) {
      throw new Error('mediaUrl is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Twilio credentials from the connection
    let accountSid: string;
    let authToken: string;

    if (twilioConnectionId) {
      const { data: connection, error: connError } = await supabase
        .from('twilio_connections')
        .select('account_sid, auth_token')
        .eq('id', twilioConnectionId)
        .single();

      if (connError || !connection) {
        throw new Error('Twilio connection not found');
      }

      accountSid = connection.account_sid;
      authToken = connection.auth_token;
    } else {
      // Try to extract account SID from URL and find matching connection
      const urlMatch = mediaUrl.match(/Accounts\/([^\/]+)/);
      if (urlMatch) {
        const extractedSid = urlMatch[1];
        
        const { data: connection, error: connError } = await supabase
          .from('twilio_connections')
          .select('account_sid, auth_token')
          .eq('account_sid', extractedSid)
          .single();

        if (connError || !connection) {
          throw new Error('Twilio connection not found for account SID');
        }

        accountSid = connection.account_sid;
        authToken = connection.auth_token;
      } else {
        throw new Error('Could not determine Twilio credentials');
      }
    }

    // Fetch the media with Basic Auth
    const credentials = btoa(`${accountSid}:${authToken}`);
    const response = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    });

    if (!response.ok) {
      console.error('Twilio media fetch failed:', response.status, response.statusText);
      throw new Error(`Failed to fetch media: ${response.status}`);
    }

    // Get the content type and binary data
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to base64
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);

    console.log('Successfully fetched Twilio media, size:', uint8Array.length, 'type:', contentType);

    return new Response(
      JSON.stringify({
        file: base64,
        mimeType: contentType,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in twilio-get-file:', error);
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
