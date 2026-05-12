import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Buffer } from "node:buffer"
import nodemailer from 'npm:nodemailer'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const getEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = Deno.env.get(key)
    if (value && value.trim()) return value.trim()
  }
  return undefined
}

const hmacSha256 = async (key: Uint8Array, data: string) => {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(data),
  )
  return new Uint8Array(signature)
}

const buildSesSmtpPassword = async (secretAccessKey: string, region: string) => {
  const kSecret = new TextEncoder().encode(`AWS4${secretAccessKey}`)
  const kDate = await hmacSha256(kSecret, "11111111")
  const kRegion = await hmacSha256(kDate, region)
  const kService = await hmacSha256(kRegion, "ses")
  const kTerminal = await hmacSha256(kService, "aws4_request")
  const kSigning = await hmacSha256(kTerminal, "SendRawEmail")

  const version = 0x04
  const out = new Uint8Array(1 + kSigning.length)
  out[0] = version
  out.set(kSigning, 1)
  return Buffer.from(out).toString("base64")
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
    const region = getEnv("AWS_REGION", "AWS_DEFAULT_REGION", "AWS_SES_REGION") || "us-west-1"
    const smtpHost = getEnv("AWS_SES_SMTP_HOST", "SMTP_HOST") ||
      `email-smtp.${region}.amazonaws.com`
    const smtpPort = parseInt(
      getEnv("AWS_SES_SMTP_PORT", "SMTP_PORT", "SES_SMTP_PORT") || "587",
      10,
    )

    const explicitSmtpUser = getEnv(
      "AWS_SES_SMTP_USER",
      "AWS_SES_SMTP_USERNAME",
      "AWS_SES_SMTP_USER_NAME",
      "SES_SMTP_USER",
      "SES_SMTP_USERNAME",
      "SMTP_USER",
      "SMTP_USERNAME",
    )
    const explicitSmtpPass = getEnv(
      "AWS_SES_SMTP_PASS",
      "AWS_SES_SMTP_PASSWORD",
      "SES_SMTP_PASS",
      "SES_SMTP_PASSWORD",
      "SMTP_PASS",
      "SMTP_PASSWORD",
    )

    const accessKeyId = getEnv("AWS_ACCESS_KEY_ID")
    const secretAccessKey = getEnv("AWS_SECRET_ACCESS_KEY")

    let smtpUser = explicitSmtpUser
    let smtpPass = explicitSmtpPass

    if (!smtpUser && accessKeyId) smtpUser = accessKeyId
    if (!smtpPass && secretAccessKey) {
      smtpPass = await buildSesSmtpPassword(secretAccessKey, region)
    }

    console.log("[send-email] SMTP configuración:", {
      region,
      smtpHost,
      smtpPort,
      hasExplicitUser: !!explicitSmtpUser,
      hasExplicitPass: !!explicitSmtpPass,
      hasAccessKeyId: !!accessKeyId,
      hasSecretAccessKey: !!secretAccessKey,
      hasFinalUser: !!smtpUser,
      hasFinalPass: !!smtpPass,
    })

    if (!smtpUser || !smtpPass) {
       return new Response(JSON.stringify({ error: 'SMTP credentials not configured on the server' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const isTlsWrapperPort = smtpPort === 465 || smtpPort === 2465

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: isTlsWrapperPort,
      requireTLS: true,
      tls: {
        servername: smtpHost,
        minVersion: "TLSv1.2",
      },
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

  } catch (error: unknown) {
    console.error("Error sending email:", error)
    const message = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
