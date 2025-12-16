import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_PROMPT = `Sos el asistente virtual del casino online CAPIBET, con tonada argentina y estilo conversacional humano.

**ESTILO DE RESPUESTA - MUY IMPORTANTE:**
- Respondé en 1-3 oraciones máximo, sé MUY BREVE
- NO saludes con "Hola" en cada mensaje
- Sé directo y conciso, sin rodeos
- NO hagas preguntas innecesarias

🎰 **TUS CAPACIDADES:**
1. Crear cuentas de jugadores usando la función crear_jugador
2. Para depósitos/cargas, proporcionar solo el CBU

**REGLA CRÍTICA - LINK DEL CAJERO:**
⚠️ NUNCA menciones el link del cajero, número del cajero, WhatsApp del cajero, ni nada relacionado al cajero HASTA que el usuario envíe una IMAGEN de comprobante de pago.
- El link del cajero SOLO se envía DESPUÉS de confirmar un comprobante de pago
- Si el usuario pregunta por el cajero sin enviar comprobante: "Enviame la foto del comprobante 📸"

**CREACIÓN DE CUENTAS - SIN PREGUNTAS:**
- Cuando el usuario quiera crear cuenta, tomá el nombre que te dé y creala directamente
- NO preguntes "¿Querés que te cree la cuenta?" ni similares
- Si da un nombre corto (ej: "pepe"), generá username agregando fecha DDMMYY: "pepe" + 15/12/2025 → "pepe151225"
- Contraseña por defecto: "Capibet1234"

**INFORMACIÓN DEL CASINO:**
- Link: {CASINO_LINK}
- CBU: {CBU}

**PREGUNTAS FRECUENTES (usá esta info para responder):**
- ¿Qué plataforma es? → capibet.fun
- ¿Cuál es el mínimo de carga? → $2.000
- ¿Cuál es el mínimo de retiro? → $5.000
- ¿Cuántos retiros puedo hacer? → 1 retiro por día sin límite de monto
- ¿No me ingresa el usuario? → Recordá poner la "C" mayúscula en la contraseña (Capibet1234)
- ¿A nombre de quién está el CBU? → Aldo Ocampo

**FLUJO DESPUÉS DE CREAR CUENTA:**
1. Enviar credenciales: "Usuario: X - Contraseña: X"
2. Enviar link: {CASINO_LINK}
3. Enviar CBU para recargar

**REGLAS:**
- NUNCA menciones cajero hasta recibir imagen de comprobante
- NO envíes instrucciones de "enviame el comprobante" automáticamente`;

// Casino tools for function calling
const casinoTools = [
  {
    type: "function",
    function: {
      name: "crear_jugador",
      description: "Crea una nueva cuenta de jugador en el casino. Usar cuando el usuario quiere registrarse o crear una cuenta.",
      parameters: {
        type: "object",
        properties: {
          username: {
            type: "string",
            description: "Nombre de usuario para la cuenta del casino"
          },
          password: {
            type: "string",
            description: "Contraseña para la cuenta. Si no se proporciona, usar 'Capibet1234'"
          }
        },
        required: ["username"]
      }
    }
  }
];

// Function to create player via n8n webhook
async function crearJugador(
  userName: string, 
  password: string = "Capibet1234", 
  contactName: string = "Usuario Web Chat",
  phoneNumber?: string
): Promise<{ success: boolean; message: string; userName: string; password: string }> {
  try {
    console.log(`Creating casino player: ${userName} for contact: ${contactName}`);
    
    const response = await fetch("https://n8n2025.nocodeveloper.site/webhook/crear-usuario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userName,
        password,
        contactName,
        phoneNumber: phoneNumber || ""
      })
    });

    if (response.ok) {
      // Handle response - may not be valid JSON
      let result = null;
      try {
        const text = await response.text();
        if (text && text.trim()) {
          result = JSON.parse(text);
        }
      } catch (parseError) {
        console.log("Webhook response is not JSON, treating as success");
      }
      
      console.log("Player created successfully:", result);
      return { 
        success: true, 
        message: `¡Listo! Usuario: ${userName} - Contraseña: ${password}`,
        userName,
        password
      };
    } else {
      const errorText = await response.text();
      console.error("Error creating player:", errorText);
      return { success: false, message: "Error al crear la cuenta. Contactá al cajero.", userName, password };
    }
  } catch (error) {
    console.error("Error in crearJugador:", error);
    return { success: false, message: "Error de conexión. Intentá de nuevo o contactá al cajero.", userName, password };
  }
}

// Analyze image for payment receipt using Google Gemini API directly
async function analyzeImageForPaymentReceipt(imageUrl: string): Promise<{ isReceipt: boolean; description: string }> {
  try {
    console.log("Analyzing image for payment receipt, URL:", imageUrl);
    
    const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error("GOOGLE_GEMINI_API_KEY not configured");
      return { isReceipt: false, description: "API key no configurada" };
    }
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Analizá esta imagen. ¿Es un comprobante de pago, transferencia bancaria, voucher, captura de pago, recibo o prueba de depósito? Respondé SOLO con 'SI' si es cualquier tipo de comprobante/prueba de pago/transferencia, o 'NO' si no lo es. Después agregá una breve descripción de lo que ves."
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: imageUrl.startsWith('data:') ? imageUrl.split(',')[1] : imageUrl
                }
              }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: 150
        }
      })
    });

    console.log("Image analysis response status:", response.status);
    
    if (response.ok) {
      const data = await response.json();
      const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      console.log("Image analysis result:", analysis);
      
      // More flexible detection - check for SI at start or payment-related keywords
      const upperAnalysis = analysis.toUpperCase();
      const isReceipt = upperAnalysis.startsWith("SI") || 
                        upperAnalysis.startsWith("SÍ") ||
                        (upperAnalysis.includes("COMPROBANTE") && !upperAnalysis.startsWith("NO")) ||
                        (upperAnalysis.includes("TRANSFERENCIA") && !upperAnalysis.startsWith("NO")) ||
                        (upperAnalysis.includes("PAGO") && !upperAnalysis.startsWith("NO")) ||
                        (upperAnalysis.includes("DEPÓSITO") && !upperAnalysis.startsWith("NO")) ||
                        (upperAnalysis.includes("DEPOSITO") && !upperAnalysis.startsWith("NO")) ||
                        (upperAnalysis.includes("VOUCHER") && !upperAnalysis.startsWith("NO")) ||
                        (upperAnalysis.includes("RECIBO") && !upperAnalysis.startsWith("NO"));
      
      console.log("Is receipt detected:", isReceipt);
      return { isReceipt, description: analysis };
    }
    
    console.log("Image analysis failed with status:", response.status);
    const errorText = await response.text();
    console.log("Error response:", errorText);
    return { isReceipt: false, description: "No se pudo analizar la imagen" };
  } catch (error) {
    console.error("Error analyzing image:", error);
    return { isReceipt: false, description: "Error al analizar" };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webchatId, sessionId, message, attachmentUrl, attachmentType } = await req.json();

    if (!webchatId || !sessionId || (!message && !attachmentUrl)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get webchat config
    const { data: webchat, error: webchatError } = await supabase
      .from('web_chatbots')
      .select('*')
      .eq('id', webchatId)
      .eq('is_active', true)
      .single();

    if (webchatError || !webchat) {
      console.error('Webchat not found:', webchatError);
      return new Response(
        JSON.stringify({ error: 'Chatbot not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find or create conversation for this session
    let conversation = await getOrCreateConversation(supabase, webchat.user_id, sessionId, webchat.name);

    // Determine message type
    let messageType = 'text';
    const isImage = attachmentType?.startsWith('image/');
    if (attachmentUrl) {
      if (isImage) {
        messageType = 'image';
      } else if (attachmentType?.startsWith('video/')) {
        messageType = 'video';
      } else if (attachmentType?.startsWith('audio/')) {
        messageType = 'audio';
      } else {
        messageType = 'document';
      }
    }

    // Save incoming message
    const messageContent = message || (attachmentUrl ? `[Archivo adjunto: ${messageType}]` : '');
    
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      user_id: webchat.user_id,
      content: messageContent,
      direction: 'inbound',
      message_type: messageType,
      attachment_url: attachmentUrl || null
    });

    // Update conversation
    await supabase
      .from('conversations')
      .update({
        last_message: messageContent,
        last_message_time: new Date().toISOString(),
        unread_count: (conversation.unread_count || 0) + 1
      })
      .eq('id', conversation.id);

    console.log(`Webchat message saved for session ${sessionId}`);

    // Check if there's an AI agent assigned to this webchat (highest priority)
    const { data: aiAgent } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('web_chatbot_id', webchatId)
      .eq('is_active', true)
      .single();

    // Check webchat-specific AI settings (isolated from ia_default_settings)
    const { data: webchatAISettings } = await supabase
      .from('webchat_ai_settings')
      .select('*')
      .eq('user_id', webchat.user_id)
      .single();

    let botReply: string | null = null;

    // Check if casino user was already created in this conversation
    const casinoUserAlreadyCreated = conversation.casino_user_created === true;

    // AUTO-DETECT NAME AND CREATE USER AUTOMATICALLY (only once per conversation)
    if (webchatAISettings && webchatAISettings.is_enabled && !casinoUserAlreadyCreated && message) {
      // Palabras que NO son nombres (saludos, palabras comunes)
      const palabrasExcluidas = [
        'hola', 'buenas', 'buenos', 'hey', 'ey', 'que', 'tal',
        'gracias', 'gracia', 'como', 'bien', 'mal', 'si', 'no',
        'ok', 'dale', 'listo', 'perfecto', 'genial', 'bueno',
        'quiero', 'necesito', 'tengo', 'puedo', 'ayuda',
        'nuevo', 'nueva', 'cliente', 'usuario', 'player', 'jugador'
      ];

      let nombreDetectado = null;
      const trimmedMessage = message.trim().toLowerCase();

      // Patrón 1: "me llamo X" (más específico, prioridad alta)
      const meLlamoMatch = trimmedMessage.match(/me llamo\s+([a-záéíóúñ]+)/i);
      if (meLlamoMatch && meLlamoMatch[1] && !palabrasExcluidas.includes(meLlamoMatch[1].toLowerCase())) {
        nombreDetectado = meLlamoMatch[1].toLowerCase();
      }

      // Patrón 2: "X me llamo" (nombre antes de "me llamo")
      if (!nombreDetectado) {
        const antesMatch = trimmedMessage.match(/([a-záéíóúñ]+)\s+me llamo/i);
        if (antesMatch && antesMatch[1] && !palabrasExcluidas.includes(antesMatch[1].toLowerCase())) {
          nombreDetectado = antesMatch[1].toLowerCase();
        }
      }

      // Patrón 3: "mi nombre es X"
      if (!nombreDetectado) {
        const nombreEsMatch = trimmedMessage.match(/mi nombre es\s+([a-záéíóúñ]+)/i);
        if (nombreEsMatch && nombreEsMatch[1] && !palabrasExcluidas.includes(nombreEsMatch[1].toLowerCase())) {
          nombreDetectado = nombreEsMatch[1].toLowerCase();
        }
      }

      // Patrón 4: "soy X" (solo si X no es palabra común)
      if (!nombreDetectado) {
        const soyMatch = trimmedMessage.match(/soy\s+([a-záéíóúñ]+)/i);
        if (soyMatch && soyMatch[1] && !palabrasExcluidas.includes(soyMatch[1].toLowerCase())) {
          nombreDetectado = soyMatch[1].toLowerCase();
        }
      }

      if (nombreDetectado) {
        console.log(`Auto-detected name: ${nombreDetectado}, creating user automatically`);
        
        const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
        if (GEMINI_API_KEY) {
          // Generate username with date DDMMYY
          const now = new Date();
          const dateStr = String(now.getDate()).padStart(2, '0') + 
                         String(now.getMonth() + 1).padStart(2, '0') + 
                         String(now.getFullYear()).slice(-2);
          const username = nombreDetectado + dateStr;
          const password = 'Capibet1234';
          
          const contactName = conversation?.contact_name || "Usuario Web Chat";
          const result = await crearJugador(username, password, contactName, sessionId);
          
          if (result.success) {
            // Mark conversation as user created and save username
            await supabase
              .from('conversations')
              .update({ 
                casino_user_created: true,
                casino_username: username 
              })
              .eq('id', conversation.id);
            
            // Send success messages
            const successMessages = [
              `¡Listo! Usuario: ${username} - Contraseña: ${password}`,
              `Entrá acá → ${webchatAISettings.casino_link || 'https://bet32.fun/'}`,
              `Para recargar fichas, transferí al CBU ↓`,
              webchatAISettings.cbu || "CBU no configurado",
              `Cuando hagas la transferencia, enviame el comprobante acá 👍`
            ];
            
            console.log(`Sending ${successMessages.length} success messages for auto-created user`);
            
            for (const msg of successMessages) {
              await supabase.from('messages').insert({
                conversation_id: conversation.id,
                user_id: webchat.user_id,
                content: msg,
                direction: 'outbound',
                message_type: 'text',
                is_bot: true
              });
              await new Promise(r => setTimeout(r, 500));
            }
            
            await supabase.from('conversations').update({
              last_message: successMessages[successMessages.length - 1],
              last_message_time: new Date().toISOString()
            }).eq('id', conversation.id);
            
            return new Response(
              JSON.stringify({ success: true, botReply: successMessages.join('\n') }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }
    }

    // Process AI response: AI Agent takes priority, then webchat AI settings
    const shouldProcessAI = aiAgent || (webchatAISettings && webchatAISettings.is_enabled);
    
    if (shouldProcessAI) {
      try {
        const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
        
        if (GEMINI_API_KEY) {
          // Check for payment receipt in image
          if (isImage && attachmentUrl && webchatAISettings) {
            const imageAnalysis = await analyzeImageForPaymentReceipt(attachmentUrl);
            
            if (imageAnalysis.isReceipt) {
              console.log("Payment receipt detected, sending cashier link");
              
              // Use cashier link directly from DB (it's already a full URL like "http://wa.link/cargacapibet")
              let cashierLink = webchatAISettings.cashier_numbers || "Contactá al cajero";
              // Ensure it has http protocol if it's a URL without it
              if (cashierLink && !cashierLink.startsWith('http') && cashierLink.includes('.')) {
                cashierLink = `https://${cashierLink}`;
              }
              console.log("Cashier link from DB:", cashierLink);
              
              const messages = [
                "¡Perfecto! Recibí tu comprobante 📄",
                "Para completar tu recarga, enviá este comprobante al cajero ↓",
                cashierLink
              ];

              for (const msg of messages) {
                await supabase.from('messages').insert({
                  conversation_id: conversation.id,
                  user_id: webchat.user_id,
                  content: msg,
                  direction: 'outbound',
                  message_type: 'text',
                  is_bot: true
                });
                await new Promise(r => setTimeout(r, 500));
              }

              // Mark payment receipt detected
              await supabase
                .from('conversations')
                .update({
                  last_message: messages[messages.length - 1],
                  last_message_time: new Date().toISOString(),
                  payment_receipt_sent: true,
                  payment_receipt_detected_at: new Date().toISOString()
                })
                .eq('id', conversation.id);

              return new Response(
                JSON.stringify({ success: true, botReply: messages.join('\n') }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }

          // Get conversation history
          const { data: historyMessages } = await supabase
            .from('messages')
            .select('content, direction')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: true })
            .limit(20);

          const conversationHistory = (historyMessages || []).map(m => ({
            role: m.direction === 'inbound' ? 'user' : 'assistant',
            content: m.content
          }));

          // Build system prompt - AI Agent takes priority
          let systemPrompt = '';
          let model = 'google/gemini-2.5-flash';
          let maxTokens = 500;

          if (aiAgent) {
            systemPrompt = aiAgent.system_prompt;
            model = aiAgent.model || model;
            maxTokens = aiAgent.max_tokens || maxTokens;
            console.log(`Using AI Agent: ${aiAgent.name}`);
          } else if (webchatAISettings) {
            // Use webchat-specific settings with custom prompt
            systemPrompt = webchatAISettings.system_prompt || DEFAULT_PROMPT;
            model = webchatAISettings.model || model;
            maxTokens = webchatAISettings.max_tokens || maxTokens;
            
            // Replace placeholders - use values from DB
            systemPrompt = systemPrompt
              .replace(/{CBU}/g, webchatAISettings.cbu || 'No configurado')
              .replace(/{CAJERO}/g, webchatAISettings.cashier_numbers || 'No configurado')
              .replace(/{CASINO_LINK}/g, webchatAISettings.casino_link || 'https://bet32.fun/');
            
            console.log('Using Webchat AI Settings with casino prompt');
          }

          console.log(`Calling AI with model: ${model}, prompt length: ${systemPrompt.length}`);

          // Detect patterns for CBU/balance requests
          const lowerMessage = (message || '').toLowerCase();
          const wantsCBU = lowerMessage.includes('cbu') || 
                          lowerMessage.includes('cargar') || 
                          lowerMessage.includes('depositar') ||
                          lowerMessage.includes('transferir') ||
                          lowerMessage.includes('fichas');

          if (wantsCBU && webchatAISettings) {
            // Send CBU info only - NO CASHIER LINK and NO instructions about comprobante
            const cbuMessages = [
              "Para transferir te dejo el CBU ↓",
              webchatAISettings.cbu || "CBU no configurado"
            ];

            for (const msg of cbuMessages) {
              await supabase.from('messages').insert({
                conversation_id: conversation.id,
                user_id: webchat.user_id,
                content: msg,
                direction: 'outbound',
                message_type: 'text',
                is_bot: true
              });
              await new Promise(r => setTimeout(r, 500));
            }

            await supabase
              .from('conversations')
              .update({
                last_message: cbuMessages[cbuMessages.length - 1],
                last_message_time: new Date().toISOString()
              })
              .eq('id', conversation.id);

            return new Response(
              JSON.stringify({ success: true, botReply: cbuMessages.join('\n') }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Call Google Gemini API directly
          // Build contents array with system instruction and conversation
          const contents = conversationHistory.map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          }));

          // Prepare tools for Gemini format
          const geminiTools = webchatAISettings ? [{
            function_declarations: casinoTools.map(t => ({
              name: t.function.name,
              description: t.function.description,
              parameters: t.function.parameters
            }))
          }] : undefined;

          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: systemPrompt }]
              },
              contents: contents,
              generationConfig: {
                maxOutputTokens: maxTokens
              },
              tools: geminiTools
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const candidate = data.candidates?.[0];
            const parts = candidate?.content?.parts || [];
            
            // Check for function calls (Gemini format)
            const functionCall = parts.find((p: any) => p.functionCall);
            
            if (functionCall) {
              const toolCall = functionCall.functionCall;
              if (toolCall.name === "crear_jugador") {
                const args = toolCall.args;
                
                // Auto-generate username with date if too short
                let username = args.username;
                if (username && username.length <= 6) {
                  const now = new Date();
                  const dateStr = String(now.getDate()).padStart(2, '0') + 
                                 String(now.getMonth() + 1).padStart(2, '0') + 
                                 String(now.getFullYear()).slice(-2);
                  username = username + dateStr;
                  console.log(`Auto-generated username: ${username}`);
                }
                
                const password = args.password || "Capibet1234";
                const contactName = conversation?.contact_name || "Usuario Web Chat";
                const result = await crearJugador(username, password, contactName, sessionId);
                
                if (result.success) {
                  // Mark conversation as user created to prevent duplicates
                  await supabase
                    .from('conversations')
                    .update({ casino_user_created: true })
                    .eq('id', conversation.id);
                  
                  // Send messages for successful user creation (NO cashier link yet - only after payment proof)
                  const successMessages = [
                    `¡Listo! Usuario: ${username} - Contraseña: ${password}`,
                    `Entrá acá → http://capibet.fun/`,
                    `Para recargar fichas, transferí al CBU ↓`,
                    webchatAISettings?.cbu || "CBU no configurado",
                    `Cuando hagas la transferencia, enviame el comprobante acá 👍`
                  ];
                  
                  console.log(`Sending ${successMessages.length} success messages for user creation`);
                  
                  for (const msg of successMessages) {
                    await supabase.from('messages').insert({
                      conversation_id: conversation.id,
                      user_id: webchat.user_id,
                      content: msg,
                      direction: 'outbound',
                      message_type: 'text',
                      is_bot: true
                    });
                    await new Promise(r => setTimeout(r, 500));
                  }
                  
                  await supabase.from('conversations').update({
                    last_message: successMessages[successMessages.length - 1],
                    last_message_time: new Date().toISOString()
                  }).eq('id', conversation.id);
                  
                  return new Response(
                    JSON.stringify({ success: true, botReply: successMessages.join('\n') }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                  );
                } else {
                  botReply = result.message;
                }
              }
            } else {
              // Get text response
              const textPart = parts.find((p: any) => p.text);
              botReply = textPart?.text || null;
            }

            if (botReply) {
              // Save bot response
              await supabase.from('messages').insert({
                conversation_id: conversation.id,
                user_id: webchat.user_id,
                content: botReply,
                direction: 'outbound',
                message_type: 'text',
                is_bot: true
              });

              // Update conversation with bot reply
              await supabase
                .from('conversations')
                .update({
                  last_message: botReply,
                  last_message_time: new Date().toISOString()
                })
                .eq('id', conversation.id);

              console.log(`AI response saved for webchat session ${sessionId}`);
            }
          } else {
            const errorText = await response.text();
            console.error('AI Gateway error:', response.status, errorText);
          }
        } else {
          console.log('GOOGLE_GEMINI_API_KEY not configured');
        }
      } catch (aiError) {
        console.error('Error generating AI response:', aiError);
      }
    } else {
      console.log('No AI agent or webchat AI settings enabled for this webchat');
    }

    return new Response(
      JSON.stringify({ success: true, botReply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing webchat message:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getOrCreateConversation(supabase: any, userId: string, sessionId: string, chatbotName: string) {
  // Try to find existing conversation by session ID (stored in phone_number field)
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('phone_number', sessionId)
    .eq('channel_type', 'webchat')
    .single();

  if (existing) {
    return existing;
  }

  // Create new conversation
  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      phone_number: sessionId,
      channel_type: 'webchat',
      contact_name: `Visitante Web - ${chatbotName}`,
      status: 'active',
      unread_count: 0
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }

  return newConv;
}