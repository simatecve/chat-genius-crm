import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduledMessage {
  id: string;
  user_id: string;
  phone_number: string;
  message_content: string;
  retry_count: number;
  scheduled_for: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🔄 Starting process-scheduled-messages function...');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const wahaBaseUrl = Deno.env.get('WAHA_BASE_URL')!;
    const wahaApiKey = Deno.env.get('WAHA_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Obtener mensajes pendientes que ya deben enviarse
    const { data: pendingMessages, error: fetchError } = await supabase
      .from('automated_message_logs')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(50);

    if (fetchError) {
      console.error('❌ Error fetching pending messages:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending messages' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      console.log('✅ No pending messages to process');
      return new Response(
        JSON.stringify({ message: 'No pending messages', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📨 Found ${pendingMessages.length} pending messages to process`);

    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    // 2. Procesar cada mensaje
    for (const message of pendingMessages as ScheduledMessage[]) {
      const triggerType = (message as any).trigger_type || 'campaign';
      console.log(`\n📤 Processing ${triggerType} message ${message.id} for ${message.phone_number}`);

      try {
        // 2.1 Verificar si el contacto está bloqueado del bot
        const { data: blockedContact } = await supabase
          .from('contacto_bloqueado_bot')
          .select('id')
          .eq('user_id', message.user_id)
          .eq('numero', message.phone_number)
          .single();

        if (blockedContact) {
          console.log(`⏭️ Contact ${message.phone_number} is blocked, skipping...`);
          
          await supabase
            .from('automated_message_logs')
            .update({ status: 'skipped', error_message: 'Contact blocked from bot' })
            .eq('id', message.id);
          
          skippedCount++;
          continue;
        }

        // 2.2 Para recordatorios de pago, verificar si ya envió comprobante
        if (triggerType === 'payment_reminder') {
          const { data: conv } = await supabase
            .from('conversations')
            .select('payment_receipt_sent')
            .eq('phone_number', message.phone_number)
            .eq('user_id', message.user_id)
            .single();

          if (conv?.payment_receipt_sent) {
            console.log(`⏭️ Payment receipt already sent for ${message.phone_number}, skipping reminder...`);
            
            await supabase
              .from('automated_message_logs')
              .update({ status: 'skipped', error_message: 'Payment receipt already sent' })
              .eq('id', message.id);
            
            skippedCount++;
            continue;
          }
        }

        // 2.2 Formatear número al formato WhatsApp
        const cleanNumber = message.phone_number.replace(/[^\d]/g, '');
        const chatId = cleanNumber; // WAHA acepta número limpio como chatId

        console.log(`📱 Formatted chatId: ${chatId}`);

        const { data: connection } = await supabase
          .from('whatsapp_connections')
          .select('name, phone_number, status')
          .eq('user_id', message.user_id)
          .eq('status', 'WORKING')
          .limit(1)
          .maybeSingle();

        const sessionName = connection?.name || connection?.phone_number || 'default';

        const payload = {
          chatId: chatId,
          text: message.message_content,
          session: sessionName,
          linkPreview: true,
          linkPreviewHighQuality: false,
          reply_to: null,
        };

        console.log('🚀 Sending via WAHA API:', JSON.stringify(payload, null, 2));

        const response = await fetch(`${wahaBaseUrl}/api/sendText`, {
          method: 'POST',
          headers: {
            'X-Api-Key': wahaApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const responseText = await response.text();
        console.log(`📥 Koonetxa API response (${response.status}):`, responseText);

        // 2.4 Manejar respuesta
        if (response.ok) {
          // Éxito
          console.log(`✅ Message sent successfully to ${message.phone_number}`);
          
          await supabase
            .from('automated_message_logs')
            .update({ 
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', message.id);

          // Actualizar campaña_sends 'queued' a 'sent' si existe para el usuario y número
          await supabase
            .from('campaign_sends')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('user_id', message.user_id)
            .eq('phone_number', message.phone_number)
            .eq('status', 'queued');
          
          successCount++;
        } else {
          // Error - intentar reenvío
          const currentRetryCount = message.retry_count || 0;
          
          if (currentRetryCount < 3) {
            // Reprogramar para dentro de 5 minutos
            const nextRetry = new Date(Date.now() + 5 * 60 * 1000).toISOString();
            
            console.log(`🔄 Retry ${currentRetryCount + 1}/3 - Rescheduling for ${nextRetry}`);
            
            await supabase
              .from('automated_message_logs')
              .update({ 
                retry_count: currentRetryCount + 1,
                last_retry_at: new Date().toISOString(),
                scheduled_for: nextRetry,
                error_message: `API Error ${response.status}: ${responseText}`,
              })
              .eq('id', message.id);
          } else {
            // Máximo de reintentos alcanzado
            console.log(`❌ Max retries reached for message ${message.id}`);
            
            await supabase
              .from('automated_message_logs')
              .update({ 
                status: 'failed',
                error_message: `Failed after 3 retries. Last error: ${response.status} - ${responseText}`,
              })
              .eq('id', message.id);

            // Marcar en campaign_sends como 'failed' si estaba 'queued'
            await supabase
              .from('campaign_sends')
              .update({ status: 'failed', error_message: `API Error ${response.status}: ${responseText}` })
              .eq('user_id', message.user_id)
              .eq('phone_number', message.phone_number)
              .eq('status', 'queued');
            
            failureCount++;
          }
        }
      } catch (messageError) {
        console.error(`❌ Error processing message ${message.id}:`, messageError);
        
        const errorMsg = messageError instanceof Error ? messageError.message : 'Unknown error';
        const currentRetryCount = message.retry_count || 0;
        
        if (currentRetryCount < 3) {
          const nextRetry = new Date(Date.now() + 5 * 60 * 1000).toISOString();
          
          await supabase
            .from('automated_message_logs')
            .update({ 
              retry_count: currentRetryCount + 1,
              last_retry_at: new Date().toISOString(),
              scheduled_for: nextRetry,
              error_message: `Exception: ${errorMsg}`,
            })
            .eq('id', message.id);
        } else {
          await supabase
            .from('automated_message_logs')
            .update({ 
              status: 'failed',
              error_message: `Failed after 3 retries. Last error: ${errorMsg}`,
            })
            .eq('id', message.id);
          
          await supabase
            .from('campaign_sends')
            .update({ status: 'failed', error_message: `Exception: ${errorMsg}` })
            .eq('user_id', message.user_id)
            .eq('phone_number', message.phone_number)
            .eq('status', 'queued');
          failureCount++;
        }
      }
    }

    const summary = {
      total: pendingMessages.length,
      success: successCount,
      failed: failureCount,
      skipped: skippedCount,
      retrying: pendingMessages.length - successCount - failureCount - skippedCount,
    };

    console.log('\n✅ Processing complete:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Fatal error in process-scheduled-messages:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
