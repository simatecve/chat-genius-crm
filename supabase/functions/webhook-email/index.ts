import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

type N8nEmailWebhookItem = {
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
    let body: unknown
    try {
      body = await req.json()
    } catch (parseError) {
      console.log("[webhook-email] Error parseando JSON:", parseError)
      return Response.json(false, {
        status: 400,
        headers: corsHeaders,
      })
    }

    console.log("[webhook-email] Body recibido:", JSON.stringify(body))

    if (!Array.isArray(body)) {
      console.log("[webhook-email] Body inválido: no es un array")
      return Response.json(false, {
        status: 400,
        headers: corsHeaders,
      })
    }

    if (body.length === 0) {
      console.log("[webhook-email] Body inválido: array vacío")
      return Response.json(false, {
        status: 400,
        headers: corsHeaders,
      })
    }

    const downloads: Array<{
      bucket: string
      key: string
      url: string
      ok: boolean
      status: number
      bytes?: number
      preview?: string
      error?: string
    }> = []

    for (const itemUnknown of body) {
      const item = itemUnknown as Partial<N8nEmailWebhookItem>

      const bucket = typeof item.bucket === "string" ? item.bucket : ""
      let key = typeof item.key === "string" ? item.key : ""
      const size = typeof item.size === "number" ? item.size : undefined
      const received_at =
        typeof item.received_at === "string" ? item.received_at : undefined
      const source_ip =
        typeof item.source_ip === "string" ? item.source_ip : undefined

      if (!bucket || !key) {
        console.log(
          "[webhook-email] Item inválido (bucket/key faltantes):",
          JSON.stringify(itemUnknown),
        )
        downloads.push({
          bucket,
          key,
          url: "",
          ok: false,
          status: 400,
          error: "Item inválido: bucket y key son requeridos",
        })
        continue
      }

      key = key.replace(/^\/+/, "")

      console.log("[webhook-email] Extracción:", {
        bucket,
        key,
        size,
        received_at,
        source_ip,
      })

      const fileUrl = `https://s3-us-west-1.amazonaws.com/${bucket}/${key}`
      console.log("[webhook-email] URL generada:", fileUrl)

      try {
        const response = await fetch(fileUrl)
        console.log("[webhook-email] Resultado descarga:", {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get("content-type"),
          contentLength: response.headers.get("content-length"),
        })

        if (!response.ok) {
          const errorText = await response.text().catch(() => "")
          downloads.push({
            bucket,
            key,
            url: fileUrl,
            ok: false,
            status: response.status,
            error: errorText || `Descarga falló con status ${response.status}`,
          })
          continue
        }

        const bytes = new Uint8Array(await response.arrayBuffer())
        const previewBytes = bytes.slice(0, Math.min(bytes.length, 600))
        const preview = new TextDecoder().decode(previewBytes)

        console.log("[webhook-email] Primeros caracteres del archivo:", preview)

        downloads.push({
          bucket,
          key,
          url: fileUrl,
          ok: true,
          status: response.status,
          bytes: bytes.length,
          preview,
        })
      } catch (downloadError) {
        console.log("[webhook-email] Error descargando archivo:", downloadError)
        downloads.push({
          bucket,
          key,
          url: fileUrl,
          ok: false,
          status: 500,
          error:
            downloadError instanceof Error
              ? downloadError.message
              : String(downloadError),
        })
      }
    }

    const allOk = downloads.every((d) => d.ok)

    if (!allOk) {
      console.log("[webhook-email] Procesamiento finalizó con errores:", downloads)
      return Response.json(false, {
        status: 200,
        headers: corsHeaders,
      })
    }

    console.log("[webhook-email] Procesamiento finalizó OK:", downloads)
    return Response.json(true, {
      status: 200,
      headers: corsHeaders,
    })
  } catch (error) {
    console.log("[webhook-email] Error no controlado:", error)
    return Response.json(false, {
      status: 500,
      headers: corsHeaders,
    })
  }
})
