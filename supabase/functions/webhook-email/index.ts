import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

import { Buffer } from "node:buffer"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0"
import {
  S3Client,
  GetObjectCommand,
} from "npm:@aws-sdk/client-s3"
import { simpleParser } from "npm:mailparser"
import nodemailer from "npm:nodemailer"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void
}

type N8nWebhookItem = {
  bucket: string
  key: string
  size?: number
  received_at?: string
  source_ip?: string
}

type InboxAiConfig = {
  id: string
  email_address: string
  ai_enabled: boolean
  ai_webhook_url: string | null
  signature_text: string | null
  signature_html: string | null
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

const extractAiReply = async (
  response: Response,
): Promise<{ subject?: string; text?: string; html?: string } | null> => {
  const contentType = response.headers.get("content-type") || ""
  const bodyText = await response.text().catch(() => "")
  if (!bodyText) return null

  if (contentType.includes("application/json")) {
    try {
      const json = JSON.parse(bodyText) as Record<string, unknown>
      const subject = typeof json.subject === "string" ? json.subject : undefined
      const text = typeof json.text === "string"
        ? json.text
        : (typeof json.reply === "string" ? json.reply : undefined)
      const html = typeof json.html === "string" ? json.html : undefined
      return { subject, text, html }
    } catch {
      return { text: bodyText }
    }
  }

  return { text: bodyText }
}

const stripHtml = (value: string) => value.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim()

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;")

const signatureTextToHtml = (value: string) =>
  `<div style="white-space: pre-wrap; word-break: break-word;">${escapeHtml(value).replaceAll("\n", "<br>")}</div>`

const applySignature = (params: {
  text?: string
  html?: string
  signatureText?: string | null
  signatureHtml?: string | null
}) => {
  const signatureText = (params.signatureText || "").trim()
  const signatureHtml = (params.signatureHtml || "").trim()

  if (!signatureText && !signatureHtml) {
    return { text: params.text, html: params.html }
  }

  const baseText = params.text || ""
  const baseHtml = params.html

  const finalText = signatureText
    ? [baseText, signatureText].filter(Boolean).join("\n\n")
    : [baseText, stripHtml(signatureHtml)].filter(Boolean).join("\n\n")

  const signatureBlockHtml = signatureHtml
    ? signatureHtml
    : signatureTextToHtml(signatureText)

  const finalHtml = baseHtml
    ? `${baseHtml}<div style="margin-top:16px;border-top:1px solid #e5e7eb;padding-top:12px;">${signatureBlockHtml}</div>`
    : `${signatureTextToHtml(baseText)}<div style="margin-top:16px;border-top:1px solid #e5e7eb;padding-top:12px;">${signatureBlockHtml}</div>`

  return { text: finalText, html: finalHtml }
}

const sendSmtpEmail = async (params: {
  from: string
  to: string
  subject: string
  text: string
  html?: string
}) => {
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

  if (!smtpUser || !smtpPass) {
    throw new Error("SMTP credentials not configured on the server")
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

  const info = await transporter.sendMail({
    from: params.from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
    headers: {
      "X-Auto-Reply": "1",
    },
  })

  return info
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      ""

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.log("[webhook-email] Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY")
      return Response.json(false, {
        status: 500,
        headers: corsHeaders,
      })
    }

    const body = await req.json().catch((e) => {
      console.log("[webhook-email] Error parseando JSON:", e)
      return null
    })

    console.log("[webhook-email] Body recibido:", JSON.stringify(body))

    if (!Array.isArray(body) || body.length === 0) {
      console.log("[webhook-email] Body inválido (no array o vacío)")
      return Response.json(false, {
        status: 400,
        headers: corsHeaders,
      })
    }

    const s3 = new S3Client({
      region: "us-west-1",
      endpoint: "https://s3-us-west-1.amazonaws.com",
      forcePathStyle: true,
      credentials: {
        accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") || "",
        secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") || "",
      },
    })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    for (const itemUnknown of body) {
      const item = itemUnknown as Partial<N8nWebhookItem>

      const bucket = typeof item.bucket === "string" ? item.bucket : ""
      let key = typeof item.key === "string" ? item.key : ""
      const size = typeof item.size === "number" ? item.size : undefined
      const receivedAt = typeof item.received_at === "string"
        ? item.received_at
        : undefined
      const sourceIp = typeof item.source_ip === "string"
        ? item.source_ip
        : undefined

      if (!bucket || !key) {
        console.log(
          "[webhook-email] Item inválido (bucket/key faltantes):",
          JSON.stringify(itemUnknown),
        )
        return Response.json(false, {
          status: 400,
          headers: corsHeaders,
        })
      }

      key = key.replace(/^\/+/, "")

      const fileUrl = `https://s3-us-west-1.amazonaws.com/${bucket}/${key}`

      console.log("[webhook-email] Extracción:", {
        bucket,
        key,
        size,
        receivedAt,
        sourceIp,
      })
      console.log("[webhook-email] URL generada:", fileUrl)

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })

      const s3Response = await s3.send(command)

      const rawEmailBytes = await s3Response.Body?.transformToByteArray()

      if (!rawEmailBytes) {
        console.log("[webhook-email] S3 sin Body para:", { bucket, key })
        return Response.json(false, {
          status: 500,
          headers: corsHeaders,
        })
      }

      const preview = new TextDecoder().decode(
        rawEmailBytes.slice(0, Math.min(rawEmailBytes.length, 1000)),
      )
      console.log("[webhook-email] Email descargado (preview):", preview)

      const parsedEmail = await simpleParser(Buffer.from(rawEmailBytes))

      const fromEmail = parsedEmail.from?.value?.[0]?.address || ""
      const toEmails = parsedEmail.to?.value?.map((t) => t.address).filter(Boolean) ||
        []
      const toEmail = toEmails[0] || ""
      const subject = parsedEmail.subject || ""
      const bodyText = parsedEmail.text || ""
      const bodyHtml = typeof parsedEmail.html === "string"
        ? parsedEmail.html
        : (parsedEmail.html ? String(parsedEmail.html) : "")
      const headersMap = (parsedEmail as unknown as { headers?: Map<string, unknown> })
        .headers
      const hasAutoReplyHeader = !!headersMap?.get("x-auto-reply")

      console.log("[webhook-email] Email parseado:", {
        fromEmail,
        toEmails,
        subjectPreview: subject.slice(0, 120),
      })

      if (!toEmail) {
        console.log("[webhook-email] No se encontró toEmail")
        return Response.json(false, {
          status: 200,
          headers: corsHeaders,
        })
      }

      const toCandidates = Array.from(
        new Set(toEmails.map((e) => e.trim().toLowerCase()).filter(Boolean)),
      )

      let inbox: InboxAiConfig | undefined

      const { data: inboxesWithAi, error: inboxesWithAiError } = await supabase
        .from("email_inboxes")
        .select("id,email_address,ai_enabled,ai_webhook_url,signature_text,signature_html")
        .in("email_address", toCandidates)

      if (!inboxesWithAiError) {
        inbox = inboxesWithAi?.[0] as InboxAiConfig | undefined
      } else {
        console.log("[webhook-email] Inbox query con firma falló:", inboxesWithAiError)

        const { data: inboxesAiOnly, error: inboxesAiOnlyError } = await supabase
          .from("email_inboxes")
          .select("id,email_address,ai_enabled,ai_webhook_url")
          .in("email_address", toCandidates)

        if (!inboxesAiOnlyError) {
          const aiOnly = inboxesAiOnly?.[0] as
            | { id?: string; email_address?: string; ai_enabled?: boolean; ai_webhook_url?: string | null }
            | undefined
          if (aiOnly?.id && aiOnly.email_address) {
            inbox = {
              id: aiOnly.id,
              email_address: aiOnly.email_address,
              ai_enabled: !!aiOnly.ai_enabled,
              ai_webhook_url: aiOnly.ai_webhook_url ?? null,
              signature_text: null,
              signature_html: null,
            }
          }
        } else {
          console.log("[webhook-email] Inbox query sin AI (fallback):", inboxesAiOnlyError)
        }

        const { data: inboxesBasic, error: inboxesBasicError } = await supabase
          .from("email_inboxes")
          .select("id,email_address")
          .in("email_address", toCandidates)

        if (inboxesBasicError) {
          console.log("[webhook-email] Error buscando inbox:", inboxesBasicError)
          return Response.json(false, {
            status: 500,
            headers: corsHeaders,
          })
        }

        const basic = inboxesBasic?.[0] as { id?: string; email_address?: string } | undefined
        if (basic?.id && basic.email_address) {
          inbox = {
            id: basic.id,
            email_address: basic.email_address,
            ai_enabled: false,
            ai_webhook_url: null,
            signature_text: null,
            signature_html: null,
          }
        }
      }

      if (!inbox?.id) {
        console.log("[webhook-email] No existe inbox para:", toCandidates)
        return Response.json(false, {
          status: 200,
          headers: corsHeaders,
        })
      }

      const { error: insertError } = await supabase
        .from("email_messages")
        .insert({
          inbox_id: inbox.id,
          from_email: fromEmail,
          to_email: toEmail,
          subject,
          body_text: bodyText,
          body_html: bodyHtml,
          direction: "inbound",
          is_read: false,
          received_at: receivedAt,
        })

      if (insertError) {
        console.log("[webhook-email] Error insertando email_messages:", insertError)
        return Response.json(false, {
          status: 500,
          headers: corsHeaders,
        })
      }

      console.log("[webhook-email] Mensaje insertado OK:", {
        inboxId: inbox.id,
        toEmail,
      })

      if (!hasAutoReplyHeader && inbox.ai_enabled && inbox.ai_webhook_url && fromEmail) {
        const aiWebhookUrl = inbox.ai_webhook_url.trim()
        const aiTask = (async () => {
          try {
            console.log("[webhook-email] IA activa, enviando a n8n:", {
              inboxId: inbox.id,
              url: aiWebhookUrl,
            })

            const aiResponse = await fetch(aiWebhookUrl, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                inbox_id: inbox.id,
                inbox_email: inbox.email_address,
                from_email: fromEmail,
                to_email: toEmail,
                subject,
                body_text: bodyText,
                body_html: bodyHtml,
                received_at: receivedAt,
              }),
            })

            console.log("[webhook-email] Respuesta n8n:", {
              ok: aiResponse.ok,
              status: aiResponse.status,
              contentType: aiResponse.headers.get("content-type"),
            })

            if (!aiResponse.ok) return

            const reply = await extractAiReply(aiResponse)
            const signed = applySignature({
              text: reply?.text?.trim() || "",
              html: reply?.html?.trim(),
              signatureText: inbox.signature_text,
              signatureHtml: inbox.signature_html,
            })
            const replyText = signed.text?.trim() || ""
            const replyHtml = signed.html?.trim()

            if (!replyText && !replyHtml) return

            const replySubject = (reply?.subject?.trim() || subject || "(Sin asunto)")

            const info = await sendSmtpEmail({
              from: inbox.email_address,
              to: fromEmail,
              subject: replySubject,
              text: replyText || "",
              html: replyHtml,
            })

            console.log("[webhook-email] Auto-respuesta enviada:", {
              messageId: (info as { messageId?: string }).messageId,
            })

            const { error: outboundInsertError } = await supabase
              .from("email_messages")
              .insert({
                inbox_id: inbox.id,
                from_email: inbox.email_address,
                to_email: fromEmail,
                subject: replySubject,
                body_text: replyText || null,
                body_html: replyHtml || null,
                direction: "outbound",
                is_read: true,
              })

            if (outboundInsertError) {
              console.log(
                "[webhook-email] Error insertando outbound email_messages:",
                outboundInsertError,
              )
            }
          } catch (aiError) {
            console.log("[webhook-email] Error IA auto-respuesta:", aiError)
          }
        })()

        try {
          EdgeRuntime.waitUntil(aiTask)
        } catch {
          await aiTask
        }
      }
    }

    return Response.json(true, {
      status: 200,
      headers: corsHeaders,
    })
  } catch (error) {
    console.log("[webhook-email] ERROR:", error)
    return Response.json(false, {
      status: 500,
      headers: corsHeaders,
    })
  }
})
