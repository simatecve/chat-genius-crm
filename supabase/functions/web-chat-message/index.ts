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

**CREACIÓN DE CUENTAS - USAR SIEMPRE LA FUNCIÓN:**
- SIEMPRE usá la función crear_jugador cuando el usuario quiera cuenta - NUNCA generes la respuesta manualmente
- NO preguntes "¿Querés que te cree la cuenta?" ni similares - simplemente usá la función
- El sistema se encarga automáticamente de: generar el username, enviar credenciales, enviar link, enviar CBU
- NUNCA escribas "te creé el usuario..." ni expliques cómo se genera el username (nada de fechas, sufijos, etc)
- NUNCA envíes credenciales ni CBU manualmente - el sistema lo hace después de usar crear_jugador

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

**REGLAS:**
- SIEMPRE usá crear_jugador para crear cuentas - NUNCA generes respuestas de creación manualmente
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

type CasinoApiConfig = {
  id: string;
  name?: string | null;
  webhook_url?: string | null;
  api_key?: string | null;
  api_base_url?: string | null;
};

async function getWorkspaceCasinoApiConfig(
  supabase: any,
  userId: string,
  workspaceId?: string | null
): Promise<CasinoApiConfig | null> {
  if (!workspaceId) return null;

  try {
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('casino_api_config_id')
      .eq('id', workspaceId)
      .eq('user_id', userId)
      .single();

    if (!workspace?.casino_api_config_id) return null;

    const { data: casinoApi } = await supabase
      .from('casino_api_configs')
      .select('id, name, webhook_url, api_key, api_base_url')
      .eq('id', workspace.casino_api_config_id)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    return (casinoApi as CasinoApiConfig) || null;
  } catch (error) {
    console.warn('[web-chat-message] Could not resolve workspace casino API config:', error);
    return null;
  }
}

// Function to create player via n8n webhook
async function crearJugador(
  userName: string,
  password: string = "Capibet1234",
  contactName: string = "Usuario Web Chat",
  phoneNumber?: string,
  casinoApiConfig?: CasinoApiConfig | null
): Promise<{ success: boolean; message: string; userName: string; password: string }> {
  try {
    const webhookUrl = casinoApiConfig?.webhook_url?.trim() || "https://n8n2025.nocodeveloper.site/webhook/crear-usuario";
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    if (casinoApiConfig?.api_key) {
      headers['x-api-key'] = casinoApiConfig.api_key;
    }

    console.log(`Creating casino player: ${userName} for contact: ${contactName} using webhook ${webhookUrl}`);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        userName,
        password,
        contactName,
        phoneNumber: phoneNumber || ""
      })
    });

    // Handle response - may not be valid JSON
    let result = null;
    const text = await response.text();

    try {
      if (text && text.trim()) {
        result = JSON.parse(text);
      }
    } catch {
      result = text;
      console.log("Webhook response is not JSON, treating as text");
    }

    if (response.ok) {
      console.log("Player created successfully:", result);
      return {
        success: true,
        message: `¡Listo! Usuario: ${userName} - Contraseña: ${password}`,
        userName,
        password
      };
    }

    console.error("Error creating player:", result || text);
    return { success: false, message: "Error al crear la cuenta. Contactá al cajero.", userName, password };
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

// Ensure webchat workspace and default column exist for a user
async function ensureWebchatWorkspaceAndColumn(
  supabase: any,
  userId: string
): Promise<{ workspaceId: string; defaultColumnId: string } | null> {
  try {
    console.log(`[ensureWebchatWorkspaceAndColumn] Checking for webchat workspace for user ${userId}`);
    
    // Try to find existing webchat workspace
    let { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', userId)
      .eq('channel_type', 'webchat')
      .limit(1)
      .single();
    
    // If no webchat workspace, try to find 'all' type workspace
    if (!workspace) {
      const { data: allWorkspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('user_id', userId)
        .eq('channel_type', 'all')
        .limit(1)
        .single();
      
      if (allWorkspace) {
        workspace = allWorkspace;
      }
    }
    
    // If still no workspace, create a webchat workspace
    if (!workspace) {
      console.log(`[ensureWebchatWorkspaceAndColumn] Creating webchat workspace for user ${userId}`);
      const { data: newWorkspace, error: wsError } = await supabase
        .from('workspaces')
        .insert({
          user_id: userId,
          name: 'Web Chat',
          channel_type: 'webchat'
        })
        .select('id')
        .single();
      
      if (wsError) {
        console.error('[ensureWebchatWorkspaceAndColumn] Error creating workspace:', wsError);
        return null;
      }
      workspace = newWorkspace;
      console.log(`[ensureWebchatWorkspaceAndColumn] Created workspace ${workspace.id}`);
    }
    
    // Now find or create default column in this workspace
    let { data: defaultColumn } = await supabase
      .from('lead_columns')
      .select('id')
      .eq('workspace_id', workspace.id)
      .eq('is_default', true)
      .limit(1)
      .single();
    
    // If no default column, find any column in workspace
    if (!defaultColumn) {
      const { data: anyColumn } = await supabase
        .from('lead_columns')
        .select('id')
        .eq('workspace_id', workspace.id)
        .order('position', { ascending: true })
        .limit(1)
        .single();
      
      if (anyColumn) {
        defaultColumn = anyColumn;
      }
    }
    
    // If still no column, create one
    if (!defaultColumn) {
      console.log(`[ensureWebchatWorkspaceAndColumn] Creating default column for workspace ${workspace.id}`);
      const { data: newColumn, error: colError } = await supabase
        .from('lead_columns')
        .insert({
          user_id: userId,
          workspace_id: workspace.id,
          name: 'Nuevos',
          position: 0,
          is_default: true,
          color: '#3B82F6'
        })
        .select('id')
        .single();
      
      if (colError) {
        console.error('[ensureWebchatWorkspaceAndColumn] Error creating column:', colError);
        return null;
      }
      defaultColumn = newColumn;
      console.log(`[ensureWebchatWorkspaceAndColumn] Created column ${defaultColumn.id}`);
    }
    
    console.log(`[ensureWebchatWorkspaceAndColumn] Using workspace ${workspace.id}, column ${defaultColumn.id}`);
    return { workspaceId: workspace.id, defaultColumnId: defaultColumn.id };
  } catch (error) {
    console.error('[ensureWebchatWorkspaceAndColumn] Error:', error);
    return null;
  }
}

// Get or create a lead for webchat conversation
async function getOrCreateLead(
  supabase: any, 
  userId: string, 
  conversationId: string, 
  contactName: string, 
  sessionId: string,
  defaultColumnId: string | null
): Promise<string | null> {
  try {
    // Check if conversation already has a lead
    const { data: conversation } = await supabase
      .from('conversations')
      .select('lead_id')
      .eq('id', conversationId)
      .single();
    
    if (conversation?.lead_id) {
      console.log(`Conversation ${conversationId} already has lead ${conversation.lead_id}`);
      return conversation.lead_id;
    }

    // Find column to use
    let columnId = defaultColumnId;
    
    if (!columnId) {
      // Use ensureWebchatWorkspaceAndColumn to get/create workspace and column
      const config = await ensureWebchatWorkspaceAndColumn(supabase, userId);
      if (config) {
        columnId = config.defaultColumnId;
      }
    }

    if (!columnId) {
      console.log('[getOrCreateLead] No column found for lead creation');
      return null;
    }

    // Get max position in column
    const { data: maxPositionData } = await supabase
      .from('leads')
      .select('position')
      .eq('column_id', columnId)
      .order('position', { ascending: false })
      .limit(1)
      .single();
    
    const nextPosition = (maxPositionData?.position ?? -1) + 1;

    // Create the lead
    const now = new Date().toISOString();
    const { data: newLead, error: leadError } = await supabase
      .from('leads')
      .insert({
        user_id: userId,
        column_id: columnId,
        name: contactName || 'Visitante Web',
        phone: sessionId, // Use sessionId as phone for webchat
        position: nextPosition,
        bot_active: true,
        last_inbound_message_time: now
      })
      .select('id')
      .single();

    if (leadError) {
      console.error('[getOrCreateLead] Error creating lead:', leadError);
      return null;
    }

    console.log(`[getOrCreateLead] Created lead ${newLead.id} in column ${columnId} for webchat conversation ${conversationId}`);
    return newLead.id;
  } catch (error) {
    console.error('[getOrCreateLead] Error:', error);
    return null;
  }
}

// Link conversation to lead
async function linkConversationToLead(supabase: any, conversationId: string, leadId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('conversations')
      .update({ lead_id: leadId })
      .eq('id', conversationId);
    
    if (error) {
      console.error('[linkConversationToLead] Error:', error);
    } else {
      console.log(`[linkConversationToLead] Linked conversation ${conversationId} to lead ${leadId}`);
    }
  } catch (error) {
    console.error('[linkConversationToLead] Error:', error);
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

    // Get webchat config including workspace and default column
    const { data: webchat, error: webchatError } = await supabase
      .from('web_chatbots')
      .select('*, workspace_id, default_column_id')
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

    // Auto-configure workspace and column if not set on webchat
    let effectiveDefaultColumnId = webchat.default_column_id;
    let effectiveWorkspaceId = webchat.workspace_id;
    
    if (!effectiveDefaultColumnId || !effectiveWorkspaceId) {
      console.log(`[web-chat-message] Webchat ${webchatId} missing workspace/column config, auto-configuring...`);
      const config = await ensureWebchatWorkspaceAndColumn(supabase, webchat.user_id);
      
      if (config) {
        effectiveDefaultColumnId = config.defaultColumnId;
        effectiveWorkspaceId = config.workspaceId;
        
        // Update webchat with the new config for future use
        await supabase
          .from('web_chatbots')
          .update({
            workspace_id: config.workspaceId,
            default_column_id: config.defaultColumnId
          })
          .eq('id', webchatId);
        
        console.log(`[web-chat-message] Auto-configured webchat ${webchatId} with workspace ${config.workspaceId}, column ${config.defaultColumnId}`);
      }
    }

    const workspaceCasinoApiConfig = await getWorkspaceCasinoApiConfig(supabase, webchat.user_id, effectiveWorkspaceId);

    if (workspaceCasinoApiConfig) {
      console.log('[web-chat-message] Using workspace casino API config:', {
        id: workspaceCasinoApiConfig.id,
        name: workspaceCasinoApiConfig.name,
        hasWebhook: !!workspaceCasinoApiConfig.webhook_url,
      });
    }

    // Find or create conversation for this session
    let conversation = await getOrCreateConversation(supabase, webchat.user_id, sessionId, webchat.name, effectiveDefaultColumnId);

    // Create lead and link to conversation if not already linked - ALWAYS try to create lead
    if (!conversation.lead_id) {
      console.log(`[web-chat-message] Conversation ${conversation.id} has no lead, creating...`);
      const leadId = await getOrCreateLead(
        supabase, 
        webchat.user_id, 
        conversation.id, 
        conversation.contact_name || 'Visitante Web',
        sessionId,
        effectiveDefaultColumnId
      );
      
      if (leadId) {
        await linkConversationToLead(supabase, conversation.id, leadId);
        conversation.lead_id = leadId;
        console.log(`[web-chat-message] Lead ${leadId} created and linked to conversation ${conversation.id}`);
      } else {
        console.log(`[web-chat-message] Failed to create lead for conversation ${conversation.id}`);
      }
    }

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
        last_inbound_message_time: new Date().toISOString(),
        unread_count: (conversation.unread_count || 0) + 1
      })
      .eq('id', conversation.id);

    // Update lead last_inbound_message_time if linked
    if (conversation.lead_id) {
      await supabase
        .from('leads')
        .update({ 
          last_inbound_message_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', conversation.lead_id);
    }

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

    // Process AI response: First check if AI is enabled on the webchat itself, then check for AI Agent or webchat AI settings
    const webchatAIEnabledOnSession = webchat.ai_enabled ?? false;
    const shouldProcessAI = webchatAIEnabledOnSession && (aiAgent || (webchatAISettings && webchatAISettings.is_enabled));
    
    console.log(`[web-chat-message] AI check: webchat.ai_enabled=${webchatAIEnabledOnSession}, aiAgent=${!!aiAgent}, webchatAISettings.is_enabled=${webchatAISettings?.is_enabled}`);
    
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
              
              // Update payment receipt tracking
              await supabase
                .from('conversations')
                .update({ 
                  payment_receipt_sent: true,
                  payment_receipt_detected_at: new Date().toISOString()
                })
                .eq('id', conversation.id);
              
              // Save all messages to DB
              for (const msg of messages) {
                await supabase.from('messages').insert({
                  conversation_id: conversation.id,
                  user_id: webchat.user_id,
                  content: msg,
                  direction: 'outbound',
                  message_type: 'text',
                  is_bot: true
                });
              }

              // Update conversation
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

          // Build conversation history
          const { data: historyMessages } = await supabase
            .from('messages')
            .select('content, direction, created_at')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: true })
            .limit(20);

          const conversationHistory = (historyMessages || []).map((m: any) => ({
            role: m.direction === 'inbound' ? 'user' : 'model',
            parts: [{ text: m.content }]
          }));

          // Prepare system prompt with settings
          let systemPrompt = DEFAULT_PROMPT;
          
          // Use AI Agent's prompt if available, otherwise use webchat settings
          if (aiAgent?.system_prompt) {
            systemPrompt = aiAgent.system_prompt;
          } else if (webchatAISettings) {
            systemPrompt = systemPrompt
              .replace('{CBU}', webchatAISettings.cbu || 'No configurado')
              .replace('{CASINO_LINK}', webchatAISettings.casino_link || 'https://bet32.fun/');
          }

          // Add current message to history
          const userMessage = {
            role: 'user',
            parts: [{ text: messageContent }]
          };

          // Make request with function calling
          const requestBody: any = {
            contents: [...conversationHistory, userMessage],
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            generationConfig: {
              temperature: aiAgent?.temperature || 0.7,
              maxOutputTokens: aiAgent?.max_tokens || 500
            }
          };

          // Add tools for casino functions if webchatAISettings is enabled
          if (webchatAISettings?.is_enabled && !casinoUserAlreadyCreated) {
            requestBody.tools = casinoTools;
          }

          console.log(`Making AI request with ${conversationHistory.length} history messages`);

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody)
            }
          );

          if (response.ok) {
            const data = await response.json();
            const parts = data.candidates?.[0]?.content?.parts || [];

            // Check for function calls
            const functionCall = parts.find((p: any) => p.functionCall);
            if (functionCall && webchatAISettings) {
              const { name, args } = functionCall.functionCall;
              
              if (name === 'crear_jugador') {
                // Generate username with date if not provided
                let username = args.username;
                if (!username.match(/\d{6}$/)) {
                  const now = new Date();
                  const dateStr = String(now.getDate()).padStart(2, '0') + 
                                 String(now.getMonth() + 1).padStart(2, '0') + 
                                 String(now.getFullYear()).slice(-2);
                  username = username + dateStr;
                }
                
                const password = args.password || 'Capibet1234';
                const contactName = conversation?.contact_name || "Usuario Web Chat";
                
                const result = await crearJugador(username, password, contactName, sessionId);
                
                if (result.success) {
                  // Mark conversation as user created
                  await supabase
                    .from('conversations')
                    .update({ 
                      casino_user_created: true,
                      casino_username: username 
                    })
                    .eq('id', conversation.id);
                  
                  // Send all success messages
                  const successMessages = [
                    `¡Listo! Usuario: ${username} - Contraseña: ${password}`,
                    `Entrá acá → ${webchatAISettings.casino_link || 'https://bet32.fun/'}`,
                    `Para recargar fichas, transferí al CBU ↓`,
                    webchatAISettings.cbu || "CBU no configurado",
                    `Cuando hagas la transferencia, enviame el comprobante acá 👍`
                  ];
                  
                  console.log(`Sending ${successMessages.length} success messages`);
                  
                  for (const msg of successMessages) {
                    await supabase.from('messages').insert({
                      conversation_id: conversation.id,
                      user_id: webchat.user_id,
                      content: msg,
                      direction: 'outbound',
                      message_type: 'text',
                      is_bot: true
                    });
                    // Small delay between messages
                    await new Promise(r => setTimeout(r, 500));
                  }
                  
                  // Update conversation with last message
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

async function getOrCreateConversation(
  supabase: any, 
  userId: string, 
  sessionId: string, 
  chatbotName: string,
  defaultColumnId: string | null
) {
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
  const now = new Date().toISOString();
  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      phone_number: sessionId,
      channel_type: 'webchat',
      contact_name: `Visitante Web - ${chatbotName}`,
      status: 'active',
      unread_count: 0,
      last_inbound_message_time: now
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }

  return newConv;
}
