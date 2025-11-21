import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const KOONETXA_API_KEY = 'XAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOieyJ0e';
const KOONETXA_API_URL = 'https://ws.koonetxa.cloud/api/sendText';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduledMessage {
  id: string;
  user_id: string;
  whatsapp_number: string;
  message_content: string;
  instance_name: string;
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
    // Crear cliente de Supabase con service_role para acceso completo
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
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
      console.log(`\n📤 Processing message ${message.id} for ${message.whatsapp_number}`);

      try {
        // 2.1 Verificar si el contacto está bloqueado del bot
        const { data: blockedContact } = await supabase
          .from('contacto_bloqueado_bot')
          .select('id')
          .eq('user_id', message.user_id)
          .eq('numero', message.whatsapp_number)
          .single();

        if (blockedContact) {
          console.log(`⏭️ Contact ${message.whatsapp_number} is blocked, skipping...`);
          
          await supabase
            .from('automated_message_logs')
            .update({ status: 'skipped', error_message: 'Contact blocked from bot' })
            .eq('id', message.id);
          
          skippedCount++;
          continue;
        }

        // 2.2 Formatear número al formato WhatsApp
        let chatId = message.whatsapp_number;
        if (!chatId.endsWith('@c.us')) {
          // Limpiar el número (remover espacios, guiones, etc)
          const cleanNumber = chatId.replace(/[^\d]/g, '');
          chatId = `${cleanNumber}@c.us`;
        }

        console.log(`📱 Formatted chatId: ${chatId}`);

        // 2.3 Enviar mensaje a la API de Koonetxa
        const payload = {
          chatId: chatId,
          text: message.message_content,
          session: 'default',
          linkPreview: true,
          linkPreviewHighQuality: false,
          reply_to: null,
        };

        console.log('🚀 Sending to Koonetxa API:', JSON.stringify(payload, null, 2));

        const response = await fetch(KOONETXA_API_URL, {
          method: 'POST',
          headers: {
            'X-Api-Key': KOONETXA_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const responseText = await response.text();
        console.log(`📥 Koonetxa API response (${response.status}):`, responseText);

        // 2.4 Manejar respuesta
        if (response.ok) {
          // Éxito
          console.log(`✅ Message sent successfully to ${message.whatsapp_number}`);
          
          await supabase
            .from('automated_message_logs')
            .update({ 
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', message.id);
          
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
            
            failureCount++;
          }
        }
      } catch (messageError) {
        console.error(`❌ Error processing message ${message.id}:`, messageError);
        
        const currentRetryCount = message.retry_count || 0;
        
        if (currentRetryCount < 3) {
          const nextRetry = new Date(Date.now() + 5 * 60 * 1000).toISOString();
          
          await supabase
            .from('automated_message_logs')
            .update({ 
              retry_count: currentRetryCount + 1,
              last_retry_at: new Date().toISOString(),
              scheduled_for: nextRetry,
              error_message: `Exception: ${messageError.message}`,
            })
            .eq('id', message.id);
        } else {
          await supabase
            .from('automated_message_logs')
            .update({ 
              status: 'failed',
              error_message: `Failed after 3 retries. Last error: ${messageError.message}`,
            })
            .eq('id', message.id);
          
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
