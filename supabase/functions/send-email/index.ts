import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer'

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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Validar el usuario autenticado
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const body = await req.json()
    const { inboxId, toEmail, subject, textBody, htmlBody } = body

    if (!inboxId || !toEmail || (!textBody && !htmlBody)) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 1. Obtener la información del inbox para saber qué email poner en "from"
    const { data: inbox, error: inboxError } = await supabaseClient
      .from('email_inboxes')
      .select('email_address')
      .eq('id', inboxId)
      .eq('user_id', user.id)
      .single()

    if (inboxError || !inbox) {
      return new Response(JSON.stringify({ error: 'Inbox not found or access denied' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    const fromEmail = inbox.email_address

    // 2. Configurar el transporter de Nodemailer con AWS SES SMTP
    // (Asegúrate de agregar estas variables en los Supabase Secrets)
    const smtpHost = Deno.env.get('AWS_SES_SMTP_HOST') || 'email-smtp.us-west-1.amazonaws.com'
    const smtpPort = parseInt(Deno.env.get('AWS_SES_SMTP_PORT') || '587')
    const smtpUser = Deno.env.get('AWS_SES_SMTP_USER')
    const smtpPass = Deno.env.get('AWS_SES_SMTP_PASS')

    if (!smtpUser || !smtpPass) {
       return new Response(JSON.stringify({ error: 'SMTP credentials not configured on the server' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })

    // 3. Enviar el correo
    const mailOptions = {
      from: fromEmail,
      to: toEmail,
      subject: subject,
      text: textBody,
      html: htmlBody,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log("Message sent: %s", info.messageId)

    // 4. Guardar el correo enviado en la base de datos (email_messages)
    const { error: insertError } = await supabaseClient
      .from('email_messages')
      .insert({
        inbox_id: inboxId,
        from_email: fromEmail,
        to_email: toEmail,
        subject: subject,
        body_text: textBody,
        body_html: htmlBody,
        direction: 'outbound',
        is_read: true // Un correo saliente siempre está leído
      })

    if (insertError) {
      console.error("Error saving outbound message to db:", insertError)
      // We still return success since email was sent, but we log the error
    }

    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("Error sending email:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
