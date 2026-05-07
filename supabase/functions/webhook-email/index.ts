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

    // 1. Manejar confirmación de suscripción de AWS SNS
    if (payload.Type === 'SubscriptionConfirmation' && payload.SubscribeURL) {
      console.log("Confirmando suscripción a SNS:", payload.SubscribeURL)
      await fetch(payload.SubscribeURL)
      return new Response(JSON.stringify({ success: true, message: "Subscription confirmed" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 2. Procesar notificación de SES (viene dentro de un evento de SNS en payload.Message)
    if (payload.Type === 'Notification' && payload.Message) {
      const sesMessage = JSON.parse(payload.Message)
      
      if (sesMessage.notificationType === 'Received') {
        const mailInfo = sesMessage.mail
        const receipt = sesMessage.receipt

        // Buscar información de S3 (donde SES guardó el correo crudo)
        const s3Action = receipt.action
        if (s3Action && s3Action.type === 'S3') {
          const bucketName = s3Action.bucketName
          const objectKey = s3Action.objectKey

          console.log(`Descargando email desde s3://${bucketName}/${objectKey}`)

          // Inicializar cliente de S3 usando variables de entorno de Supabase
          // Necesitas configurar AWS_REGION, AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY en Supabase
          const s3Client = new S3Client({
            region: Deno.env.get('AWS_REGION') ?? 'us-east-1',
            credentials: {
              accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') ?? '',
              secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') ?? '',
            }
          });

          // Obtener el documento de S3
          const getObjCmd = new GetObjectCommand({
            Bucket: bucketName,
            Key: objectKey
          });
          const s3Response = await s3Client.send(getObjCmd);
          
          if (!s3Response.Body) {
             throw new Error("No body received from S3")
          }
          
          const emailRawStream = await s3Response.Body.transformToByteArray();
          const emailRawBuffer = Buffer.from(emailRawStream);

          // Parsear el archivo raw EML/MIME
          const parsedEmail = await simpleParser(emailRawBuffer);

          const fromEmail = parsedEmail.from?.value[0]?.address || mailInfo.source || '';
          const toEmailList = parsedEmail.to?.value?.map(t => t.address) || mailInfo.destination || [];
          const toEmail = toEmailList[0] || '';
          const subject = parsedEmail.subject || mailInfo.commonHeaders?.subject || '';
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

          // Si no existe la bandeja, podemos crearla opcionalmente o ignorar el correo.
          // El usuario indicó: "con eso vas a crear la bandeja de email"
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
        }
      }
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
