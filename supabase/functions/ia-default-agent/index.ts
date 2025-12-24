import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type DefaultAgentResponse = {
  isActivated: boolean;
  intencionCargaFichas: boolean;
  comprobanteDetectado: boolean;
  respuesta: string;
  mensajesMultiples?: string[];
  actionExecuted?: {
    type: 'crear_jugador';
    success: boolean;
    result?: any;
  };
  schedulePaymentReminder?: boolean;
  casinoUsername?: string;
  // Nuevos campos para humanización
  humanizationDelay?: number;
  combinedMessage?: boolean;
};

// ============= CONFIGURACIÓN DE HUMANIZACIÓN =============

// Variantes de saludos para evitar patrones repetitivos
const saludoVariantes = [
  "Buenas! 🎰",
  "Hola! 👋",
  "Qué onda!",
  "Holaa",
  "Buenass",
  "Hola, qué tal?",
  "Hey!",
];

// Variantes de confirmaciones
const confirmacionVariantes = [
  "Dale",
  "Listo",
  "Perfecto",
  "Genial",
  "Oka",
  "Sí",
  "Joya",
  "Ahí va",
];

// Variantes de emojis para carga
const emojisCarga = ["💸", "💰", "🎰", "✨", "👌", "🙌"];
const emojisPositivos = ["😊", "👍", "✌️", "🔥", "💪"];

// Función para obtener elemento aleatorio
function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Función para generar delay aleatorio
function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Función para humanizar texto (agregar pequeñas variaciones)
function humanizeText(text: string, emojiFrequency: number = 50): string {
  // Decidir aleatoriamente si incluir emoji
  const includeEmoji = Math.random() * 100 < emojiFrequency;
  
  // Pequeñas variaciones en el texto
  let humanized = text;
  
  // A veces usar minúsculas al inicio
  if (Math.random() > 0.6 && humanized.length > 0) {
    humanized = humanized.charAt(0).toLowerCase() + humanized.slice(1);
  }
  
  // A veces eliminar signos de exclamación dobles
  if (Math.random() > 0.7) {
    humanized = humanized.replace(/!!/g, '!').replace(/¡¡/g, '¡');
  }
  
  // Si no incluir emoji, quitarlos del texto
  if (!includeEmoji) {
    humanized = humanized.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
  }
  
  return humanized;
}

// Función para combinar mensajes múltiples en uno solo
function combineMessages(messages: string[], delayBetween: number = 0): string[] {
  if (messages.length <= 1) return messages;
  
  // Si delay es 0, combinar todo en un mensaje
  if (delayBetween === 0) {
    return [messages.join('\n\n')];
  }
  
  // Si hay delay, mantener separados pero reducir cantidad
  // Combinar mensajes cortos
  const combined: string[] = [];
  let current = '';
  
  for (const msg of messages) {
    if (current.length + msg.length < 300) {
      current = current ? `${current}\n\n${msg}` : msg;
    } else {
      if (current) combined.push(current);
      current = msg;
    }
  }
  if (current) combined.push(current);
  
  return combined;
}

// Función para verificar si un username ya existe GLOBALMENTE
async function checkUsernameExists(supabase: any, username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('conversations')
    .select('casino_username')
    .eq('casino_username', username)
    .limit(1);
  
  if (error) {
    console.error('Error checking username:', error);
    return false;
  }
  
  const exists = data && data.length > 0;
  console.log(`[ia-default-agent] Username "${username}" exists: ${exists}`);
  return exists;
}

// Función helper para crear jugador en el casino
async function crearJugador(userName: string, password: string, contactName: string, phoneNumber: string) {
  try {
    console.log(`Creating player: ${userName} for ${contactName} (${phoneNumber})`);
    const response = await fetch('https://n8n2025.nocodeveloper.site/webhook/crear-usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName, password, contactName, phoneNumber })
    });
    const result = await response.json();
    console.log('Player creation result:', result);
    return { success: response.ok, data: result };
  } catch (error) {
    console.error('Error creating player:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMsg };
  }
}

// Función para analizar si una imagen es un comprobante de pago
async function analyzeImageForPaymentReceipt(imageUrl: string, GOOGLE_GEMINI_API_KEY: string): Promise<boolean> {
  try {
    console.log('Analyzing image for payment receipt:', imageUrl);
    
    let imagePart: any;
    
    if (imageUrl.startsWith('data:')) {
      const base64Data = imageUrl.split(',')[1];
      const mimeType = imageUrl.split(':')[1]?.split(';')[0] || 'image/jpeg';
      imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      };
    } else {
      try {
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          console.error('Failed to download image:', imageResponse.status);
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
        
        imagePart = {
          inlineData: {
            mimeType: contentType.split(';')[0],
            data: base64Data
          }
        };
      } catch (downloadError) {
        console.error('Error downloading image:', downloadError);
        return false;
      }
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      const isReceipt = answer.includes('SI') || answer.includes('SÍ') || answer === 'YES';
      console.log(`[ia-default-agent] ¿Es comprobante de pago? ${isReceipt ? 'SÍ' : 'NO'}`);
      return isReceipt;
    } else {
      console.error('Error analyzing image:', await response.text());
      return false;
    }
  } catch (error) {
    console.error('Exception analyzing image:', error);
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

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase environment configuration');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { 
      userId, 
      messageContent, 
      imageUrls, 
      contactName, 
      phoneNumber, 
      conversationId,
      existingCasinoUser,
      existingCasinoUsername
    } = await req.json();

    if (!userId || typeof messageContent !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid input: userId and messageContent are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('[ia-default-agent] Processing message:', { 
      userId, 
      contactName, 
      phoneNumber, 
      conversationId, 
      hasImages: !!(imageUrls?.length),
      existingCasinoUser,
      existingCasinoUsername
    });

    // Obtener configuración global de IA
    const { data: settings, error: settingsError } = await supabase
      .from('ia_default_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (settingsError) {
      console.error('Error fetching ia_default_settings:', settingsError);
      throw settingsError;
    }

    // Obtener configuración de humanización
    const { data: humanSettings } = await supabase
      .from('ia_humanization_settings')
      .select('*')
      .eq('id', 1)
      .single();

    const minDelay = humanSettings?.min_response_delay_ms || 2000;
    const maxDelay = humanSettings?.max_response_delay_ms || 6000;
    const emojiFrequency = humanSettings?.emoji_frequency || 50;
    const combineMessages_enabled = humanSettings?.combine_multiple_messages ?? true;
    const delayBetweenMessages = humanSettings?.delay_between_messages_ms || 1500;
    const aiTemperature = humanSettings?.ai_temperature || 0.75;
    const enableVariation = humanSettings?.enable_response_variation ?? true;

    const cashierNumbersText: string = settings?.cashier_numbers || '';
    const cbu: string = settings?.cbu || '';
    const casinoLink: string = settings?.casino_link || 'https://bet32.fun/';

    console.log('[ia-default-agent] Humanization config:', { minDelay, maxDelay, emojiFrequency, combineMessages_enabled, aiTemperature });

    // Calcular delay aleatorio para esta respuesta
    const humanizationDelay = getRandomDelay(minDelay, maxDelay);

    // ANÁLISIS DE IMÁGENES
    if (imageUrls && imageUrls.length > 0 && GOOGLE_GEMINI_API_KEY) {
      console.log(`Analyzing ${imageUrls.length} images for payment receipts...`);
      
      for (const imageUrl of imageUrls) {
        const isReceipt = await analyzeImageForPaymentReceipt(imageUrl, GOOGLE_GEMINI_API_KEY);
        
        if (isReceipt) {
          console.log('[ia-default-agent] RAMA: comprobante_detectado_imagen');
          
          const cajas = cashierNumbersText?.trim() || '';
          const confirmacion = enableVariation ? getRandomElement(confirmacionVariantes) : 'Perfecto';
          const emoji = Math.random() * 100 < emojiFrequency ? ' 📄' : '';
          
          let mensajesMultiples = [
            humanizeText(`${confirmacion}, recibí tu comprobante${emoji}`, emojiFrequency),
            humanizeText('Para completar la carga, pasale ese comprobante al cajero ↓', emojiFrequency),
            cajas || 'Contacta a soporte para obtener el número del cajero'
          ];

          // Combinar mensajes si está habilitado
          if (combineMessages_enabled) {
            mensajesMultiples = combineMessages(mensajesMultiples, 0);
          }

          const payload: DefaultAgentResponse = {
            isActivated: true,
            intencionCargaFichas: true,
            comprobanteDetectado: true,
            respuesta: mensajesMultiples[0],
            mensajesMultiples,
            humanizationDelay,
            combinedMessage: combineMessages_enabled
          };

          return new Response(JSON.stringify(payload), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          });
        }
      }
    }

    const text = (messageContent || '').toLowerCase();

    // DETECCIÓN DE INTENCIÓN BANCARIA
    const bankInfoPatterns = [
      'cbu', 'alias', 'qr', 
      'transferir', 'transferencia', 'depositar', 'deposito', 'depósito',
      'cargar', 'recargar', 'cargar fichas', 'cargar saldo', 'quiero cargar',
      'como cargo', 'cómo cargo', 'para cargar', 
      'retirar', 'retiro', 'sacar plata', 'sacar dinero', 'cobrar',
      'pagar', 'pago', 'abonar',
      'datos bancarios', 'datos para transferir', 'a donde transfiero', 'adonde transfiero',
      'numero de caja', 'número de caja', 'cajero', 'caja',
      'como hago para cargar', 'cómo hago para cargar',
      'como deposito', 'cómo deposito',
      'pasame el cbu', 'pásame el cbu', 'pasame cbu', 'dame el cbu', 'mandame el cbu'
    ];
    
    const bankInfoRequested = bankInfoPatterns.some(p => text.includes(p));
    
    if (bankInfoRequested) {
      console.log('[ia-default-agent] RAMA: bankInfoRequested');
      
      if (!cbu || cbu.trim() === '') {
        const payload: DefaultAgentResponse = {
          isActivated: true,
          intencionCargaFichas: true,
          comprobanteDetectado: false,
          respuesta: 'Los datos bancarios no están configurados, contactá a soporte.',
          mensajesMultiples: ['Los datos bancarios no están configurados, contactá a soporte.'],
          humanizationDelay
        };
        return new Response(JSON.stringify(payload), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }
      
      const intro = enableVariation ? getRandomElement(['Ahí va el CBU ↓', 'Te paso el CBU ↓', 'CBU para transferir ↓', 'Acá tenés ↓']) : 'Para transferir, el CBU ↓';
      const emoji = Math.random() * 100 < emojiFrequency ? getRandomElement(emojisCarga) : '';
      
      let mensajesMultiples = [
        humanizeText(intro, emojiFrequency),
        cbu,
        humanizeText(`Cuando transfieras, mandame el comprobante acá ${emoji}`, emojiFrequency)
      ];

      if (combineMessages_enabled) {
        mensajesMultiples = combineMessages(mensajesMultiples, 0);
      }

      const payload: DefaultAgentResponse = {
        isActivated: true,
        intencionCargaFichas: true,
        comprobanteDetectado: false,
        respuesta: mensajesMultiples[0],
        mensajesMultiples,
        humanizationDelay,
        combinedMessage: combineMessages_enabled
      };

      return new Response(JSON.stringify(payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // DETECCIÓN: Usuario dice que YA tiene cuenta
    const yaTieneCuentaPatterns = [
      'ya tengo cuenta', 'ya tengo usuario', 'mi usuario es', 'mi cuenta es',
      'tengo cuenta', 'tengo usuario', 'ya estoy registrado', 'ya me registré', 'ya me registre',
      'tengo una cuenta', 'ya tengo una cuenta', 'ya tengo', 'ya tengo creado', 'tengo creado',
      'ya lo tengo', 'ya cree', 'ya creé', 'tengo mi usuario', 'tengo mi cuenta',
      'ya hice la cuenta', 'ya hice mi cuenta', 'soy jugador', 'ya soy jugador', 'si tengo', 'sí tengo'
    ];
    const yaTieneCuenta = yaTieneCuentaPatterns.some(p => text.includes(p));

    const quiereRecargarPatterns = [
      'cargar', 'cbu', 'fichas', 'saldo', 'recargar', 'depositar', 
      'deposito', 'depósito', 'transferir', 'transferencia'
    ];
    const quiereRecargar = quiereRecargarPatterns.some(p => text.includes(p));

    if (yaTieneCuenta || (existingCasinoUser && existingCasinoUsername)) {
      console.log('[ia-default-agent] RAMA: usuario_existente');
      
      if (yaTieneCuenta || quiereRecargar) {
        const confirmacion = enableVariation ? getRandomElement(['Genial', 'Perfecto', 'Dale', 'Joya']) : 'Perfecto';
        const emoji = Math.random() * 100 < emojiFrequency ? getRandomElement(emojisCarga) : '';
        
        let mensajesMultiples = existingCasinoUsername 
          ? [
              humanizeText(`${confirmacion}! Tu cuenta es ${existingCasinoUsername}`, emojiFrequency),
              humanizeText('Para cargar, transferí al CBU ↓', emojiFrequency),
              cbu || '[CBU no configurado]',
              humanizeText(`Mandame el comprobante acá cuando transfieras ${emoji}`, emojiFrequency)
            ]
          : [
              humanizeText(`${confirmacion}! Para cargar, transferí al CBU ↓`, emojiFrequency),
              cbu || '[CBU no configurado]',
              humanizeText(`Mandame el comprobante acá cuando transfieras ${emoji}`, emojiFrequency)
            ];
        
        if (combineMessages_enabled) {
          mensajesMultiples = combineMessages(mensajesMultiples, 0);
        }

        const payload: DefaultAgentResponse = {
          isActivated: true,
          intencionCargaFichas: true,
          comprobanteDetectado: false,
          respuesta: mensajesMultiples[0],
          mensajesMultiples,
          schedulePaymentReminder: true,
          casinoUsername: existingCasinoUsername || 'usuario_existente',
          humanizationDelay,
          combinedMessage: combineMessages_enabled
        };
        
        return new Response(JSON.stringify(payload), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }
    }

    // Detección de comprobante por texto
    const cargaPatterns = [
      'cargar fichas','cargar saldo','quiero cargar','pasame el cbu','pásame el cbu','alias','qr',
      'ya hice la transferencia','transferi','transferí','transferir','te paso el comprobante','te mando el comprobante',
      'voucher','comprobante','te mando el voucher','te paso el voucher'
    ];
    const intencionCargaFichas = cargaPatterns.some(p => text.includes(p));
    const comprobantePatterns = ['comprobante','voucher','recibo','captura','screenshot','foto del pago','ticket'];
    const comprobanteDetectado = comprobantePatterns.some(p => text.includes(p));

    if (intencionCargaFichas || comprobanteDetectado) {
      console.log('[ia-default-agent] RAMA: intencion_carga_o_comprobante_texto');
      const respuesta = humanizeText('Por seguridad, te derivo con un asesor que te ayuda con eso 💸', emojiFrequency);

      const payload: DefaultAgentResponse = {
        isActivated: false,
        intencionCargaFichas,
        comprobanteDetectado,
        respuesta,
        humanizationDelay
      };

      return new Response(JSON.stringify(payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // ===== CONVERSACIÓN NORMAL: usar Gemini con prompt humanizado =====
    console.log('[ia-default-agent] RAMA: conversacion_normal_llm');
    
    let respuesta = '';
    let actionExecuted: DefaultAgentResponse['actionExecuted'] = undefined;
    
    // Obtener historial de mensajes
    let conversationHistory: any[] = [];
    if (conversationId) {
      const { data: historyData } = await supabase
        .from('messages')
        .select('content, direction, is_bot, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(12);

      if (historyData) {
        conversationHistory = historyData
          .reverse()
          .map((msg: any) => ({
            role: msg.direction === 'inbound' ? 'user' : 'assistant',
            content: msg.content
          }));
      }
    }

    const existingUserInfo = existingCasinoUser && existingCasinoUsername
      ? `\n**USUARIO CON CUENTA EXISTENTE:** ${existingCasinoUsername} - NO crear cuenta nueva.`
      : '';
    
    // SYSTEM PROMPT HUMANIZADO
    const systemPrompt = `Sos el asistente virtual de CAPIBET, un casino online. Hablás en argentino, de forma natural y relajada.

**ESTILO DE COMUNICACIÓN (MUY IMPORTANTE):**
- Escribí como una persona real por WhatsApp, NO como un bot
- Usá contracciones: "q" en vez de "que", "tb" en vez de "también", "x" en vez de "por"
- A veces empezá con minúscula, no siempre uses signos de exclamación
- Variá tus saludos: "Buenas", "Hola", "Qué onda", "Hey", no siempre igual
- Usá emojis con moderación, no en todos los mensajes
- Sé breve y directo, como una conversación real
- NO uses viñetas ni listas, escribí en texto corrido
- NO repitas el saludo si ya saludaste antes en la conversación
${existingUserInfo}

**INFORMACIÓN DEL CASINO:**
- Nombre: CAPIBET
- Link: ${casinoLink}
- CBU para cargas: ${cbu || '[no configurado]'}
- Cajero: ${cashierNumbersText || '[no configurado]'}

**REGLAS CRÍTICAS:**
- NUNCA inventes datos bancarios, usá EXACTAMENTE los de arriba
- Si piden CBU, respondé: "${cbu}"
- Si piden cajero, respondé: "${cashierNumbersText}"
- Para crear cuentas usá la función crear_jugador
- Contraseña por defecto: Capibet1234
- Generá usernames así: [nombre][DDMM][XX] (ej: juan241237)

**PREGUNTAS FRECUENTES:**
- Mínimo carga: $2.000
- Mínimo retiro: $5.000
- 1 retiro por día sin límite
- CBU a nombre de: Edgardo Barrientos

**CUÁNDO DERIVAR AL CAJERO:**
- Solo después de recibir comprobante de transferencia verificado
- Cuando pidan RETIRO de dinero
- Problemas técnicos que no puedas resolver

Mantené el tono natural y relajado. No seas repetitivo.`;

    if (GOOGLE_GEMINI_API_KEY) {
      try {
        const geminiHistory = conversationHistory.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }));

        console.log('[ia-default-agent] Llamando a Gemini con temperature:', aiTemperature);
        const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: systemPrompt }] },
              { role: 'model', parts: [{ text: 'dale, entendido. hablo natural y uso los datos exactos' }] },
              ...geminiHistory,
              { role: 'user', parts: [{ text: messageContent }] }
            ],
            tools: [{
              functionDeclarations: [{
                name: "crear_jugador",
                description: "Crear un nuevo jugador en el casino.",
                parameters: {
                  type: "object",
                  properties: {
                    userName: { 
                      type: "string", 
                      description: "Username en formato: nombreMinúscula + DDMM + 2 números random. Ej: roberto241237" 
                    },
                    password: { 
                      type: "string", 
                      description: "Contraseña. Default: Capibet1234"
                    }
                  },
                  required: ["userName"]
                }
              }]
            }],
            generationConfig: {
              temperature: aiTemperature,
              maxOutputTokens: 400
            }
          }),
        });

        if (aiResponse.ok) {
          const aiResult = await aiResponse.json();
          const candidate = aiResult.candidates?.[0];
          const functionCall = candidate?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;
          
          if (functionCall) {
            const toolCallName = functionCall.name;
            const args = functionCall.args || {};
            console.log('[ia-default-agent] Function call:', toolCallName, args);
            
            if (args) {
              let toolResult;
              let actionType: 'crear_jugador' = 'crear_jugador';
              
              switch (toolCallName) {
                case 'crear_jugador':
                  if (existingCasinoUser) {
                    const payload: DefaultAgentResponse = {
                      isActivated: true,
                      intencionCargaFichas: false,
                      comprobanteDetectado: false,
                      respuesta: humanizeText(`ya tenés cuenta! tu usuario es ${existingCasinoUsername}. querés cargar fichas?`, emojiFrequency),
                      humanizationDelay
                    };
                    return new Response(JSON.stringify(payload), {
                      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                      status: 200
                    });
                  }
                  
                  const usernameExists = await checkUsernameExists(supabase, args.userName);
                  
                  if (usernameExists) {
                    const payload: DefaultAgentResponse = {
                      isActivated: true,
                      intencionCargaFichas: false,
                      comprobanteDetectado: false,
                      respuesta: humanizeText(`ese usuario "${args.userName}" ya está en uso, probá con otro nombre`, emojiFrequency),
                      humanizationDelay
                    };
                    return new Response(JSON.stringify(payload), {
                      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                      status: 200
                    });
                  }
                  
                  const password = args.password || 'Capibet1234';
                  toolResult = await crearJugador(args.userName, password, contactName || 'Usuario', phoneNumber || '');
                  
                  if (toolResult.success && toolResult.data) {
                    toolResult.data.credentials = { userName: args.userName, password };
                  }
                  break;
                  
                default:
                  respuesta = humanizeText('para eso necesitás hablar con un asesor, te contactamos', emojiFrequency);
                  toolResult = null;
                  break;
              }
              
              if (toolResult) {
                actionExecuted = {
                  type: actionType!,
                  success: toolResult.success,
                  result: toolResult
                };
                
                if (actionType === 'crear_jugador' && toolResult.success) {
                  const userName = args.userName;
                  const password = args.password || 'Capibet1234';
                  const emoji = Math.random() * 100 < emojiFrequency ? ' 🎰' : '';
                  
                  let mensajesMultiples = [
                    humanizeText(`listo${emoji} tu cuenta:\nUsuario: ${userName}\nContraseña: ${password}`, emojiFrequency),
                    humanizeText(`ingresá desde: ${casinoLink}`, emojiFrequency),
                    humanizeText('para cargar fichas, transferí al CBU ↓', emojiFrequency),
                    cbu || '[CBU no configurado]',
                    humanizeText('mandame el comprobante acá cuando transfieras', emojiFrequency)
                  ];
                  
                  if (combineMessages_enabled) {
                    mensajesMultiples = combineMessages(mensajesMultiples, 0);
                  }

                  const payload: DefaultAgentResponse = {
                    isActivated: true,
                    intencionCargaFichas: false,
                    comprobanteDetectado: false,
                    respuesta: mensajesMultiples[0],
                    mensajesMultiples,
                    actionExecuted,
                    schedulePaymentReminder: true,
                    casinoUsername: userName,
                    humanizationDelay,
                    combinedMessage: combineMessages_enabled
                  };
                  
                  return new Response(JSON.stringify(payload), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200
                  });
                }
                
                // Segunda llamada para otras tools
                const followUpResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_GEMINI_API_KEY}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [
                      { role: 'user', parts: [{ text: systemPrompt }] },
                      { role: 'model', parts: [{ text: 'dale' }] },
                      { role: 'user', parts: [{ text: messageContent }] },
                      { role: 'model', parts: [{ functionCall: { name: toolCallName, args } }] },
                      { role: 'function', parts: [{ functionResponse: { name: toolCallName, response: toolResult } }] }
                    ],
                    generationConfig: {
                      temperature: aiTemperature,
                      maxOutputTokens: 400
                    }
                  }),
                });
                
                if (followUpResponse.ok) {
                  const followUpResult = await followUpResponse.json();
                  respuesta = followUpResult.candidates?.[0]?.content?.parts?.[0]?.text || '';
                } else {
                  respuesta = toolResult.success 
                    ? humanizeText('listo, operación completada', emojiFrequency)
                    : humanizeText(`hubo un problema: ${toolResult.error || 'error desconocido'}. intentá de nuevo`, emojiFrequency);
                }
              }
            }
          } else {
            respuesta = candidate?.content?.parts?.[0]?.text || '';
          }
        } else {
          console.error('[ia-default-agent] Gemini API error:', await aiResponse.text());
        }
      } catch (e) {
        console.error('[ia-default-agent] Gemini call failed:', e);
      }
    }

    if (!respuesta) {
      respuesta = humanizeText('depende del juego. las fichas arrancan desde $100. querés q te cuente las opciones?', emojiFrequency);
    }

    const payload: DefaultAgentResponse = {
      isActivated: true,
      intencionCargaFichas: false,
      comprobanteDetectado: false,
      respuesta,
      actionExecuted,
      humanizationDelay
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error in ia-default-agent:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      isActivated: false,
      intencionCargaFichas: false,
      comprobanteDetectado: false,
      respuesta: ''
    } satisfies DefaultAgentResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
