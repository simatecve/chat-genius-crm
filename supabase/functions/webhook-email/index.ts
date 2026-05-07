import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // The payload format depends on what is sending the webhook (e.g. AWS SES SNS notification)
    // We assume a standard JSON with from, to, subject, text, html.
    const body = await req.json()
    console.log("Received webhook payload:", body)

    // Extract basic fields (adjust according to the actual webhook structure)
    // Example: parsing an AWS SES JSON structure if applicable, or generic format:
    const toEmail = body.to || body.receipt?.recipients?.[0] || '';
    const fromEmail = body.from || body.mail?.source || '';
    const subject = body.subject || body.mail?.commonHeaders?.subject || '';
    const textBody = body.text || body.content || '';
    const htmlBody = body.html || '';

    if (!toEmail) {
      return new Response(JSON.stringify({ error: 'Missing destination email (to)' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 1. Find if we have an inbox for this email address
    const { data: inbox, error: inboxError } = await supabaseClient
      .from('email_inboxes')
      .select('id')
      .eq('email_address', toEmail)
      .single()

    if (inboxError || !inbox) {
      console.log(`No inbox found for ${toEmail}`);
      return new Response(JSON.stringify({ message: `No inbox found for ${toEmail}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 so the webhook provider doesn't retry
      })
    }

    // 2. Insert the message into email_messages
    const { error: insertError } = await supabaseClient
      .from('email_messages')
      .insert({
        inbox_id: inbox.id,
        from_email: fromEmail,
        to_email: toEmail,
        subject: subject,
        body_text: textBody,
        body_html: htmlBody,
        direction: 'inbound',
        is_read: false
      })

    if (insertError) {
      console.error("Error inserting message:", insertError);
      throw insertError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("Webhook error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
