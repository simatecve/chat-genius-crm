import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { S3Client, GetObjectCommand } from "npm:@aws-sdk/client-s3"
import { simpleParser } from "npm:mailparser"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payloadText = await req.text()
    let payload;
    try {
      payload = JSON.parse(payloadText)
    } catch (e) {
      console.log("No JSON body, returning 400")
      return new Response("Invalid JSON", { status: 400 })
    }

    let bucketName = null;
    let objectKey = null;

    // Detect if payload is array from n8n
    if (Array.isArray(payload) && payload.length > 0 && payload[0].bucket && payload[0].key) {
      bucketName = payload[0].bucket;
      objectKey = payload[0].key;
      console.log(`Direct S3 payload detected. Bucket: ${bucketName}, Key: ${objectKey}`);
    } else if (payload.Type === 'SubscriptionConfirmation' && payload.SubscribeURL) {
      // 1. Manejar confirmación de suscripción de AWS SNS
      console.log("Confirmando suscripción a SNS:", payload.SubscribeURL)
      await fetch(payload.SubscribeURL)
      return new Response(JSON.stringify({ success: true, message: "Subscription confirmed" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else if (payload.Type === 'Notification' && payload.Message) {
      // 2. Procesar notificación de SES (viene dentro de un evento de SNS en payload.Message)
      const sesMessage = JSON.parse(payload.Message)
      
      if (sesMessage.notificationType === 'Received') {
        const receipt = sesMessage.receipt
        const s3Action = receipt.action
        if (s3Action && s3Action.type === 'S3') {
          bucketName = s3Action.bucketName
          objectKey = s3Action.objectKey
        }
      }
    }

    if (bucketName && objectKey) {
      console.log(`Descargando email desde s3://${bucketName}/${objectKey}`)

      // Inicializar cliente de S3 usando variables de entorno de Supabase
      let s3Client = new S3Client({
        region: Deno.env.get('AWS_REGION') ?? 'us-east-1',
        credentials: {
          accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') ?? '',
          secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') ?? '',
        }
      });

      let s3Response;
      try {
        const getObjCmd = new GetObjectCommand({
          Bucket: bucketName,
          Key: objectKey
        });
        s3Response = await s3Client.send(getObjCmd);
      } catch (err) {
        // Manejar error de redirección de región (PermanentRedirect)
        if (err.name === 'PermanentRedirect' || (err.$metadata?.httpStatusCode === 301)) {
          const endpoint = err.Endpoint || err.endpoint;
          console.log(`Redirección de S3 detectada. Reintentando con endpoint: ${endpoint}`);
          
          if (endpoint) {
            // Reintentar con el endpoint específico proporcionado por AWS
            s3Client = new S3Client({
              region: Deno.env.get('AWS_REGION') ?? 'us-east-1',
              endpoint: `https://${endpoint}`,
              credentials: {
                accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') ?? '',
                secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') ?? '',
              }
            });
            const retryCmd = new GetObjectCommand({
              Bucket: bucketName,
              Key: objectKey
            });
            s3Response = await s3Client.send(retryCmd);
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
      
      if (!s3Response || !s3Response.Body) {
          throw new Error("No body received from S3")
      }
      
      const emailRawStream = await s3Response.Body.transformToByteArray();

      // Parsear el archivo raw EML/MIME
      const parsedEmail = await simpleParser(emailRawStream);

      const fromEmail = parsedEmail.from?.value[0]?.address || '';
      const toEmailList = parsedEmail.to?.value?.map(t => t.address) || [];
      const toEmail = toEmailList[0] || '';
      const subject = parsedEmail.subject || '';
      const textBody = parsedEmail.text || '';
      const htmlBody = parsedEmail.html || '';

      if (!toEmail) {
        console.log("No destination email found");
        return new Response("No destination email", { status: 200 })
      }

      // 3. Buscar si existe una bandeja para este correo destino
      const { data: inbox, error: inboxError } = await supabaseClient
        .from('email_inboxes')
        .select('id')
        .eq('email_address', toEmail)
        .single()

      let inboxId = inbox?.id;
      
      if (!inboxId) {
        console.log(`Bandeja no encontrada para ${toEmail}, creando una nueva...`);
        const { data: newInbox, error: createInboxError } = await supabaseClient
          .from('email_inboxes')
          .insert({
            email_address: toEmail,
            name: `Bandeja de ${toEmail}`,
            provider: 'smtp'
          })
          .select('id')
          .single()
          
        if (createInboxError) throw createInboxError;
        inboxId = newInbox.id;
      }

      // 4. Insertar el mensaje en la base de datos
      const { error: insertError } = await supabaseClient
        .from('email_messages')
        .insert({
          inbox_id: inboxId,
          from_email: fromEmail,
          to_email: toEmail,
          subject: subject,
          body_text: textBody,
          body_html: htmlBody,
          direction: 'inbound',
          is_read: false
        })

      if (insertError) {
        console.error("Error guardando el mensaje:", insertError);
        throw insertError;
      }
      
      console.log("Mensaje procesado y guardado correctamente.");
    } else {
      console.log("Payload ignorado o formato no reconocido");
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
