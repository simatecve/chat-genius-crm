import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

import { Buffer } from "node:buffer"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0"
import {
  S3Client,
  GetObjectCommand,
} from "npm:@aws-sdk/client-s3"
import { simpleParser } from "npm:mailparser"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

type N8nWebhookItem = {
  bucket: string
  key: string
  size?: number
  received_at?: string
  source_ip?: string
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

      const { data: inboxes, error: inboxesError } = await supabase
        .from("email_inboxes")
        .select("id,email_address")
        .in("email_address", toCandidates)

      if (inboxesError) {
        console.log("[webhook-email] Error buscando inbox:", inboxesError)
        return Response.json(false, {
          status: 500,
          headers: corsHeaders,
        })
      }

      const inbox = inboxes?.[0]
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
