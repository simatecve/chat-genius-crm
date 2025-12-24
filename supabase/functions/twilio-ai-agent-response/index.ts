import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Función para analizar si una imagen es un comprobante de pago
async function analyzeImageForPaymentReceipt(imageUrl: string, GOOGLE_GEMINI_API_KEY: string): Promise<boolean> {
  try {
    console.log('[twilio-ai-agent-response] Analyzing image for payment receipt:', imageUrl);
    
    let imagePart: any;
    
    if (imageUrl.startsWith('data:')) {
      // Imagen en formato base64
      const base64Data = imageUrl.split(',')[1];
      const mimeType = imageUrl.split(':')[1]?.split(';')[0] || 'image/jpeg';
      console.log('[twilio-ai-agent-response] Processing base64 image with mimeType:', mimeType);
      imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      };
    } else {
      // URL HTTP - descargar y convertir a base64
      console.log('[twilio-ai-agent-response] Downloading image from URL:', imageUrl);
      try {
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          console.error('[twilio-ai-agent-response] Failed to download image:', imageResponse.status, imageResponse.statusText);
          return false;
        }
        const imageBuffer = await imageResponse.arrayBuffer();
        const uint8Array = new Uint8Array(imageBuffer);
        let binaryString = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binaryString += String.fromCharCode(uint8Array[i]);
        }
        const base64Data = btoa(binaryString);
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
        console.log('[twilio-ai-agent-response] Downloaded image, size:', uint8Array.length, 'bytes, contentType:', contentType);
        
        imagePart = {
          inlineData: {
            mimeType: contentType.split(';')[0],
            data: base64Data
          }
        };
      } catch (downloadError) {
        console.error('[twilio-ai-agent-response] Error downloading image:', downloadError);
        return false;
      }
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: `Analiza esta imagen y responde ÚNICAMENTE con "SI" o "NO":
¿Es esta imagen un comprobante de pago, transferencia bancaria, voucher de depósito, 
captura de pantalla de una transferencia realizada, recibo de pago, ticket de depósito,
o cualquier documento/captura que demuestre que se realizó una transacción financiera o pago?

Responde SOLO "SI" o "NO", sin explicaciones.`
            },
            imagePart
          ]
        }],
        generationConfig: {
          maxOutputTokens: 10,
          temperature: 0.1
        }
      }),
    });

    if (response.ok) {
      const result = await response.json();
      const answer = (result.candidates?.[0]?.content?.parts?.[0]?.text || '').toUpperCase().trim();
      console.log('[twilio-ai-agent-response] Image analysis result:', answer);
      const isReceipt = answer.includes('SI') || answer.includes('SÍ') || answer === 'YES';
      console.log(`[twilio-ai-agent-response] ¿Es comprobante de pago? ${isReceipt ? 'SÍ' : 'NO'}`);
      return isReceipt;
    } else {
      const errorText = await response.text();
      console.error('[twilio-ai-agent-response] Error analyzing image:', errorText);
      return false;
    }
  } catch (error) {
    console.error('[twilio-ai-agent-response] Exception analyzing image:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');

    if (!GOOGLE_GEMINI_API_KEY) {
      console.error('GOOGLE_GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { conversationId, userId, messageContent, phoneNumber, twilioConnectionId, imageUrls } = await req.json();

    console.log('[twilio-ai-agent-response] Processing AI agent response for Twilio conversation:', conversationId);
    console.log('[twilio-ai-agent-response] Received imageUrls:', imageUrls?.length || 0);

    // 1. Verificar si hay un agente de IA activo para Twilio
    const { data: aiAgent, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .or('channel_type.eq.twilio,channel_type.eq.all')
      .eq('twilio_connection_id', twilioConnectionId)
      .single();

    if (agentError || !aiAgent) {
      console.log('[twilio-ai-agent-response] No active AI agent found for this Twilio connection');
      return new Response(
        JSON.stringify({ success: true, message: 'No AI agent configured', processed: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[twilio-ai-agent-response] Found active AI agent:', aiAgent.name);

    // 2. Verificar configuración global del bot
    const { data: botSettings } = await supabase
      .from('user_bot_settings')
      .select('bot_enabled')
      .eq('user_id', userId)
      .single();

    if (!botSettings?.bot_enabled) {
      console.log('[twilio-ai-agent-response] Bot globally disabled for this user');
      return new Response(
        JSON.stringify({ success: true, message: 'Bot disabled', processed: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Verificar si el contacto tiene el bot bloqueado
    const { data: blockedContact } = await supabase
      .from('contacto_bloqueado_bot')
      .select('id')
      .eq('user_id', userId)
      .eq('numero', phoneNumber)
      .single();

    if (blockedContact) {
      console.log('[twilio-ai-agent-response] Bot blocked for this contact');
      return new Response(
        JSON.stringify({ success: true, message: 'Bot blocked for contact', processed: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. NUEVO: Verificar si hay imágenes y analizar si es comprobante de pago
    if (imageUrls && imageUrls.length > 0) {
      console.log('[twilio-ai-agent-response] Checking images for payment receipt...');
      
      for (const imageUrl of imageUrls) {
        const isPaymentReceipt = await analyzeImageForPaymentReceipt(imageUrl, GOOGLE_GEMINI_API_KEY);
        
        if (isPaymentReceipt) {
          console.log('[twilio-ai-agent-response] Payment receipt detected! Sending cashier info...');
          
          // Obtener configuración de cajero desde ia_default_settings
          const { data: iaSettings } = await supabase
            .from('ia_default_settings')
            .select('cashier_numbers')
            .single();
          
          // También verificar en webchat_ai_settings por user_id
          const { data: userSettings } = await supabase
            .from('webchat_ai_settings')
            .select('cashier_numbers')
            .eq('user_id', userId)
            .single();
          
          const cashierNumbers = userSettings?.cashier_numbers || iaSettings?.cashier_numbers || '';
          
          // Enviar primer mensaje: confirmación del comprobante
          const confirmMessage = '¡Perfecto! Recibí tu comprobante 📄\n\nLo estoy verificando y en breve te confirmo la carga de fichas.';
          
          await supabase.functions.invoke('twilio-send-message', {
            body: {
              twilioConnectionId,
              phoneNumber,
              message: confirmMessage,
              userId,
              conversationId,
              isBot: true
            }
          });
          
          // Pequeño delay entre mensajes
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Enviar segundo mensaje: número del cajero
          if (cashierNumbers) {
            const cashierMessage = `🎰 Tu cajero asignado es: ${cashierNumbers}\n\nContactalo para confirmar tu carga de fichas.`;
            
            await supabase.functions.invoke('twilio-send-message', {
              body: {
                twilioConnectionId,
                phoneNumber,
                message: cashierMessage,
                userId,
                conversationId,
                isBot: true
              }
            });
          }
          
          // Actualizar conversation con comprobante detectado
          await supabase
            .from('conversations')
            .update({
              payment_receipt_sent: true,
              payment_receipt_detected_at: new Date().toISOString()
            })
            .eq('id', conversationId);
          
          // Cancelar recordatorios pendientes
          await supabase
            .from('automated_message_logs')
            .update({ status: 'cancelled' })
            .eq('phone_number', phoneNumber)
            .eq('user_id', userId)
            .eq('status', 'pending')
            .eq('trigger_type', 'payment_reminder');
          
          console.log('[twilio-ai-agent-response] Payment receipt processed, cashier info sent');
          
          return new Response(
            JSON.stringify({
              success: true,
              message: 'Payment receipt detected, cashier info sent',
              processed: true,
              comprobanteDetectado: true
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // 5. Obtener historial de conversación (últimos 10 mensajes)
    const { data: messages } = await supabase
      .from('messages')
      .select('content, direction, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    const conversationHistory = (messages || [])
      .reverse()
      .map(msg => ({
        role: msg.direction === 'inbound' ? 'user' : 'assistant',
        content: msg.content
      }));

    // 6. Llamar a Google Gemini
    console.log('[twilio-ai-agent-response] Calling Google Gemini...');
    
    // Construir historial para Gemini
    const geminiHistory = conversationHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: aiAgent.system_prompt }] },
          { role: 'model', parts: [{ text: 'Entendido, seguiré tus instrucciones.' }] },
          ...geminiHistory,
          { role: 'user', parts: [{ text: messageContent }] }
        ],
        generationConfig: {
          temperature: aiAgent.temperature || 0.7,
          maxOutputTokens: aiAgent.max_tokens || 500
        }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[twilio-ai-agent-response] Google Gemini API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const aiResponseText = aiResult.candidates?.[0]?.content?.parts?.[0]?.text || 'Lo siento, no pude generar una respuesta.';

    console.log('[twilio-ai-agent-response] AI response generated:', aiResponseText.substring(0, 100));

    // 7. Enviar respuesta via Twilio
    const { data: sendResult, error: sendError } = await supabase.functions.invoke('twilio-send-message', {
      body: {
        twilioConnectionId,
        phoneNumber,
        message: aiResponseText,
        userId,
        conversationId,
        isBot: true
      }
    });

    if (sendError) {
      console.error('[twilio-ai-agent-response] Error sending AI response via Twilio:', sendError);
      throw sendError;
    }

    console.log('[twilio-ai-agent-response] AI response sent successfully via Twilio');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'AI response sent',
        response: aiResponseText,
        processed: true
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[twilio-ai-agent-response] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        processed: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
