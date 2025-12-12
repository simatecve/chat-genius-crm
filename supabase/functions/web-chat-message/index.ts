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
- Mantené el hilo de conversación sin repetir info
- Evitá introducciones largas

🎰 **TUS CAPACIDADES:**
1. Crear cuentas de jugadores usando la función crear_jugador
2. Para depósitos/cargas o retiros, proporcionar CBU y derivar al cajero

**GENERACIÓN AUTOMÁTICA DE USERNAMES:**
- Si el usuario da un nombre corto o simple (ej: "pepe", "juan", "maria"), 
  generá un username único agregando la fecha actual en formato DDMMYY
- Ejemplo: Si dice "pepe" y hoy es 12/12/2025 → username: "pepe121225"
- SIEMPRE notificá el username generado al usuario

**INFORMACIÓN DEL CASINO:**
- Link: http://capibet.fun/
- CBU: {CBU}
- Cajero: {CAJERO}

**CREACIÓN DE CUENTAS:**
- Contraseña por defecto: "Capibet1234"
- Después de crear, enviar credenciales breves:
  "¡Listo! Usuario: [user] - Contraseña: [pass]. Entrá: http://capibet.fun/"

**REGLAS:**
- Para cargar fichas: dar CBU e indicar enviar comprobante al cajero
- NUNCA inventes info, derivá al cajero si no sabés`;

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
          },
          phoneNumber: {
            type: "string",
            description: "Número de teléfono del usuario (opcional)"
          }
        },
        required: ["username"]
      }
    }
  }
];

// Function to create player via n8n webhook
async function crearJugador(username: string, password: string = "Capibet1234", phoneNumber?: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`Creating casino player: ${username}`);
    
    const response = await fetch("https://n8n2025.nocodeveloper.site/webhook/crear-usuario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        phoneNumber: phoneNumber || ""
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log("Player created successfully:", result);
      return { 
        success: true, 
        message: `¡Listo! Usuario: ${username} - Contraseña: ${password}. Entrá: http://capibet.fun/` 
      };
    } else {
      const errorText = await response.text();
      console.error("Error creating player:", errorText);
      return { success: false, message: "Error al crear la cuenta. Contactá al cajero." };
    }
  } catch (error) {
    console.error("Error in crearJugador:", error);
    return { success: false, message: "Error de conexión. Intentá de nuevo o contactá al cajero." };
  }
}

// Analyze image for payment receipt
async function analyzeImageForPaymentReceipt(imageUrl: string, LOVABLE_API_KEY: string): Promise<{ isReceipt: boolean; description: string }> {
  try {
    console.log("Analyzing image for payment receipt...");
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analizá esta imagen y decime si es un comprobante de pago, transferencia bancaria, voucher o prueba de depósito. Respondé SOLO con 'SI' o 'NO' seguido de una breve descripción."
              },
              {
                type: "image_url",
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        max_tokens: 100
      })
    });

    if (response.ok) {
      const data = await response.json();
      const analysis = data.choices?.[0]?.message?.content || "";
      const isReceipt = analysis.toUpperCase().startsWith("SI");
      return { isReceipt, description: analysis };
    }
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

    // Process AI response: AI Agent takes priority, then webchat AI settings
    const shouldProcessAI = aiAgent || (webchatAISettings && webchatAISettings.is_enabled);
    
    if (shouldProcessAI) {
      try {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        
        if (LOVABLE_API_KEY) {
          // Check for payment receipt in image
          if (isImage && attachmentUrl && webchatAISettings) {
            const imageAnalysis = await analyzeImageForPaymentReceipt(attachmentUrl, LOVABLE_API_KEY);
            
            if (imageAnalysis.isReceipt) {
              console.log("Payment receipt detected, sending to cashier");
              
              // Send multiple messages for receipt
              const messages = [
                "¡Perfecto! Recibí tu comprobante 📄",
                "Para completar tu recarga, enviá este comprobante al cajero ↓",
                webchatAISettings.cashier_numbers || "Contactá al cajero"
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

              await supabase
                .from('conversations')
                .update({
                  last_message: messages[messages.length - 1],
                  last_message_time: new Date().toISOString()
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
            
            // Replace placeholders
            systemPrompt = systemPrompt
              .replace(/{CBU}/g, webchatAISettings.cbu || 'No configurado')
              .replace(/{CAJERO}/g, webchatAISettings.cashier_numbers || 'No configurado');
            
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
            // Send CBU info directly
            const cbuMessages = [
              "Para transferir te dejo el CBU ↓",
              webchatAISettings.cbu || "CBU no configurado",
              "Enviá el comprobante al cajero ↓",
              webchatAISettings.cashier_numbers || "Cajero no configurado"
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

          // Call AI with tools
          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: model,
              messages: [
                { role: "system", content: systemPrompt },
                ...conversationHistory
              ],
              max_tokens: maxTokens,
              tools: webchatAISettings ? casinoTools : undefined,
              tool_choice: webchatAISettings ? "auto" : undefined
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const aiMessage = data.choices?.[0]?.message;
            
            // Check for tool calls
            if (aiMessage?.tool_calls && aiMessage.tool_calls.length > 0) {
              for (const toolCall of aiMessage.tool_calls) {
                if (toolCall.function.name === "crear_jugador") {
                  const args = JSON.parse(toolCall.function.arguments);
                  
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
                  
                  const result = await crearJugador(
                    username,
                    args.password || "Capibet1234",
                    sessionId
                  );
                  
                  botReply = result.message;
                }
              }
            } else {
              botReply = aiMessage?.content;
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
          console.log('LOVABLE_API_KEY not configured');
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