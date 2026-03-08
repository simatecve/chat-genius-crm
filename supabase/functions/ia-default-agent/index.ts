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
  humanizationDelay?: number;
  combinedMessage?: boolean;
};

type CasinoApiConfig = {
  id: string;
  name?: string | null;
  webhook_url?: string | null;
  api_key?: string | null;
  api_base_url?: string | null;
};

// ============= CONFIGURACIÓN DE HUMANIZACIÓN =============

const saludoVariantes = [
  "Buenas! 🎰",
  "Hola! 👋",
  "Qué onda!",
  "Holaa",
  "Buenass",
  "Hola, qué tal?",
  "Hey!",
];

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

const emojisCarga = ["💸", "💰", "🎰", "✨", "👌", "🙌"];
const emojisPositivos = ["😊", "👍", "✌️", "🔥", "💪"];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function humanizeText(text: string, emojiFrequency: number = 50): string {
  const includeEmoji = Math.random() * 100 < emojiFrequency;
  let humanized = text;
  
  if (Math.random() > 0.6 && humanized.length > 0) {
    humanized = humanized.charAt(0).toLowerCase() + humanized.slice(1);
  }
  
  if (Math.random() > 0.7) {
    humanized = humanized.replace(/!!/g, '!').replace(/¡¡/g, '¡');
  }
  
  if (!includeEmoji) {
    humanized = humanized.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
  }
  
  return humanized;
}

function combineMessages(messages: string[], delayBetween: number = 0): string[] {
  if (messages.length <= 1) return messages;
  
  if (delayBetween === 0) {
    return [messages.join('\n\n')];
  }
  
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

// ============= COMBINAR MENSAJES EXCEPTO CBU =============
// Mantiene el CBU siempre como mensaje separado para facilitar copiar
function combineMessagesExceptCBU(messages: string[], cbu: string): string[] {
  if (messages.length <= 1) return messages;
  if (!cbu || cbu.trim() === '') return combineMessages(messages, 0);
  
  // Encontrar el índice del mensaje que es SOLO el CBU
  const cbuIndex = messages.findIndex(m => m.trim() === cbu.trim());
  
  if (cbuIndex === -1) {
    // Si no hay CBU separado, combinar normal
    return combineMessages(messages, 0);
  }
  
  // Separar: mensajes antes del CBU, el CBU, mensajes después del CBU
  const beforeCBU = messages.slice(0, cbuIndex);
  const afterCBU = messages.slice(cbuIndex + 1);
  
  const result: string[] = [];
  
  // Combinar mensajes antes del CBU
  if (beforeCBU.length > 0) {
    result.push(beforeCBU.join('\n\n'));
  }
  
  // CBU siempre como mensaje separado
  result.push(cbu);
  
  // Combinar mensajes después del CBU
  if (afterCBU.length > 0) {
    result.push(afterCBU.join('\n\n'));
  }
  
  console.log('[ia-default-agent] CBU separado en mensaje independiente');
  return result;
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

// ============= GENERADOR ROBUSTO DE USERNAME =============
// Genera username único con reintentos automáticos
async function generateUniqueUsername(
  supabase: any, 
  contactName: string, 
  maxRetries: number = 5
): Promise<string> {
  // Normalizar nombre: solo letras minúsculas, sin espacios ni acentos
  const normalizedName = (contactName || 'user')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar acentos
    .replace(/[^a-z]/g, '') // solo letras
    .slice(0, 8); // máximo 8 caracteres
  
  const baseName = normalizedName || 'user';
  const now = new Date();
  const ddmm = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Generar 2 dígitos aleatorios
    const randomDigits = String(Math.floor(Math.random() * 100)).padStart(2, '0');
    const username = `${baseName}${ddmm}${randomDigits}`;
    
    const exists = await checkUsernameExists(supabase, username);
    if (!exists) {
      console.log(`[ia-default-agent] Generated unique username: ${username} (attempt ${attempt + 1})`);
      return username;
    }
    
    console.log(`[ia-default-agent] Username ${username} already exists, retrying...`);
  }
  
  // Fallback: agregar timestamp
  const fallback = `${baseName}${ddmm}${Date.now().toString().slice(-4)}`;
  console.log(`[ia-default-agent] Using fallback username: ${fallback}`);
  return fallback;
}

// ============= FILTRO ANTI-CAJERO =============
// Remueve cualquier mención del cajero si no hay comprobante verificado
function sanitizeCashierFromResponse(
  respuesta: string, 
  cashierNumbers: string, 
  comprobanteDetectado: boolean
): string {
  if (comprobanteDetectado) {
    return respuesta; // Si hay comprobante, no filtrar
  }
  
  let sanitized = respuesta;
  
  // Lista de patrones a filtrar
  const patternsToRemove = [
    cashierNumbers, // El link/número del cajero
    'wa.link',
    'http://wa.link',
    'https://wa.link',
  ];
  
  for (const pattern of patternsToRemove) {
    if (pattern && pattern.trim()) {
      // Escapar caracteres especiales para regex
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      sanitized = sanitized.replace(new RegExp(escaped, 'gi'), '[disponible después del comprobante]');
    }
  }
  
  // Detectar si menciona "cajero" en contexto de enviar link
  const cajeroPhrases = [
    /pasale\s+(ese\s+)?comprobante\s+al\s+cajero/gi,
    /contacta\s+(al\s+)?cajero/gi,
    /manda(le)?\s+al\s+cajero/gi,
    /habla\s+con\s+(el\s+)?cajero/gi,
  ];
  
  for (const phrase of cajeroPhrases) {
    if (phrase.test(sanitized)) {
      console.warn('[ia-default-agent] FILTRO: Bloqueando mención de cajero sin comprobante');
      sanitized = sanitized.replace(phrase, 'primero mandame el comprobante de transferencia');
    }
  }
  
  return sanitized;
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

// Función para analizar si una imagen o PDF es un comprobante de pago
async function analyzeImageForPaymentReceipt(imageUrl: string, GOOGLE_GEMINI_API_KEY: string): Promise<boolean> {
  try {
    console.log('[ia-default-agent] Analyzing image/document for payment receipt:', imageUrl);
    
    // Detectar si es un PDF por la URL o extensión
    const isPdf = imageUrl.toLowerCase().includes('.pdf') || 
                  imageUrl.toLowerCase().includes('application/pdf') ||
                  imageUrl.toLowerCase().includes('pdf');
    
    if (isPdf) {
      console.log('[ia-default-agent] PDF detected, will analyze as document');
    }
    
    let imagePart: any;
    
    if (imageUrl.startsWith('data:')) {
      const base64Data = imageUrl.split(',')[1];
      let mimeType = imageUrl.split(':')[1]?.split(';')[0] || 'image/jpeg';
      
      // Si es PDF, asegurar el mimeType correcto
      if (isPdf || mimeType.includes('pdf')) {
        mimeType = 'application/pdf';
      }
      
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
          console.error('[ia-default-agent] Failed to download image/document:', imageResponse.status);
          return false;
        }
        const imageBuffer = await imageResponse.arrayBuffer();
        const uint8Array = new Uint8Array(imageBuffer);
        let binaryString = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binaryString += String.fromCharCode(uint8Array[i]);
        }
        const base64Data = btoa(binaryString);
        let contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
        
        // Si es PDF, asegurar el mimeType correcto
        if (isPdf || contentType.includes('pdf')) {
          contentType = 'application/pdf';
          console.log('[ia-default-agent] Setting mimeType to application/pdf');
        }
        
        imagePart = {
          inlineData: {
            mimeType: contentType.split(';')[0],
            data: base64Data
          }
        };
        
        console.log(`[ia-default-agent] Downloaded file, contentType: ${contentType}, size: ${base64Data.length} chars`);
      } catch (downloadError) {
        console.error('[ia-default-agent] Error downloading image/document:', downloadError);
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
¿Es esta imagen un comprobante de transacción bancaria de CUALQUIER tipo?

Incluye como válidos:
- Comprobante de pago, transferencia, depósito, RETIRO, extracción
- Envío de dinero, recepción de dinero, voucher, ticket bancario
- Captura de home banking, captura de billetera virtual
- Apps como Mercado Pago, Palta, Ualá, Brubank, Naranja X, Personal Pay, etc.
- Cualquier documento que muestre datos de operación financiera (CBU, CVU, monto, fecha, número de operación)

EN CASO DE DUDA, responde "SI".
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
      console.log(`[ia-default-agent] Gemini Vision raw response: "${answer}"`);
      const isReceipt = answer.includes('SI') || answer.includes('SÍ') || answer === 'YES';
      console.log(`[ia-default-agent] ¿Es comprobante de pago? ${isReceipt ? 'SÍ' : 'NO'} (imageUrl: ${imageUrl.substring(0, 50)}...)`);
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

    // ============= RAMA 1: ANÁLISIS DE IMÁGENES (COMPROBANTE) =============
    if (imageUrls && imageUrls.length > 0 && GOOGLE_GEMINI_API_KEY) {
      console.log(`[ia-default-agent] RAMA: analizando ${imageUrls.length} imágenes...`);
      
      for (const imageUrl of imageUrls) {
        const isReceipt = await analyzeImageForPaymentReceipt(imageUrl, GOOGLE_GEMINI_API_KEY);
        
        if (isReceipt) {
          console.log('[ia-default-agent] RAMA: comprobante_detectado_imagen ✓');
          
          const cajas = cashierNumbersText?.trim() || '';
          const confirmacion = enableVariation ? getRandomElement(confirmacionVariantes) : 'Perfecto';
          const emoji = Math.random() * 100 < emojiFrequency ? ' 📄' : '';
          
          let mensajesMultiples = [
            humanizeText(`${confirmacion}, recibí tu comprobante${emoji}`, emojiFrequency),
            humanizeText('Para completar la carga, pasale ese comprobante al cajero ↓', emojiFrequency),
            cajas || 'Contacta a soporte para obtener el número del cajero'
          ];

          if (combineMessages_enabled) {
            mensajesMultiples = combineMessages(mensajesMultiples, 0);
          }

          const payload: DefaultAgentResponse = {
            isActivated: true,
            intencionCargaFichas: true,
            comprobanteDetectado: true, // ← IMPORTANTE: Solo aquí es true
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
      // FALLBACK SEGURO: Si hay imagen pero no se detectó como comprobante,
      // igual derivar al cajero por seguridad (mejor falso positivo que perder una carga)
      console.log('[ia-default-agent] RAMA: imagen_no_reconocida_derivar_cajero ✓');
      
      const cajas = cashierNumbersText?.trim() || '';
      
      let mensajesMultiples = [
        humanizeText('Recibí tu imagen. Para validar la operación, pasale esa imagen al cajero ↓', emojiFrequency),
        cajas || 'Contacta a soporte para obtener el número del cajero'
      ];

      if (combineMessages_enabled) {
        mensajesMultiples = combineMessages(mensajesMultiples, 0);
      }

      return new Response(JSON.stringify({
        isActivated: true,
        intencionCargaFichas: true,
        comprobanteDetectado: false,
        respuesta: mensajesMultiples[0],
        mensajesMultiples,
        humanizationDelay,
        combinedMessage: combineMessages_enabled
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    const text = (messageContent || '').toLowerCase();

    // ============= RAMA 1.5: DETECCIÓN DE SALUDO/PRIMER CONTACTO =============
    // Si es un saludo o mensaje inicial, preguntar si tiene cuenta ANTES de hacer nada
    const saludoPatterns = [
      'hola', 'buenas', 'buen dia', 'buenos dias', 'buen día', 'buenos días',
      'buenas tardes', 'buenas noches', 'hey', 'que tal', 'qué tal',
      'como andas', 'cómo andás', 'como estas', 'cómo estás', 'ola', 'wenas'
    ];
    const esSaludo = saludoPatterns.some(p => text.includes(p));
    
    // Verificar si es primera interacción (conversación nueva o solo saludo sin contexto)
    const esConversacionNueva = !conversationId;
    const mensajeMuyCorto = text.length < 20 && esSaludo;
    
    // Solo aplicar si NO tiene cuenta existente Y es saludo/nuevo
    if ((esSaludo || mensajeMuyCorto) && !existingCasinoUser && !existingCasinoUsername) {
      // Verificar que no esté pidiendo algo específico (no solo saludando)
      const tienePedidoEspecifico = [
        'cargar', 'cbu', 'cuenta', 'usuario', 'jugar', 'fichas', 'saldo',
        'recargar', 'depositar', 'transferir', 'registrar', 'crear'
      ].some(p => text.includes(p));
      
      if (!tienePedidoEspecifico) {
        console.log('[ia-default-agent] RAMA: saludo_inicial ✓');
        
        const saludo = getRandomElement(['Buenas!', 'Hola!', 'Holaa', 'Hey!', 'Qué onda!']);
        const emoji = Math.random() * 100 < emojiFrequency ? ' 🎰' : '';
        
        const respuesta = humanizeText(
          `${saludo}${emoji} ¿Ya tenés cuenta en CAPIBET o querés que te cree una?`, 
          emojiFrequency
        );
        
        const payload: DefaultAgentResponse = {
          isActivated: true,
          intencionCargaFichas: false,
          comprobanteDetectado: false,
          respuesta,
          humanizationDelay
        };
        
        return new Response(JSON.stringify(payload), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }
    }

    // ============= RAMA 2: PREGUNTA INICIAL "CÓMO JUEGO" (ANTES del LLM) =============
    const preguntaInicialPatterns = [
      'como juego', 'cómo juego', 'como empiezo', 'cómo empiezo',
      'quiero jugar', 'puedo jugar', 'quiero empezar', 'como funciona',
      'cómo funciona', 'que tengo que hacer', 'qué tengo que hacer',
      'como hago para jugar', 'cómo hago para jugar', 'como es',
      'como me registro', 'cómo me registro', 'como creo cuenta',
      'cómo creo cuenta', 'como abro cuenta', 'cómo abro cuenta',
      'quiero apostar', 'como apuesto', 'cómo apuesto',
      'explicame', 'explícame', 'como arranco', 'cómo arranco'
    ];
    
    const esPreguntaInicial = preguntaInicialPatterns.some(p => text.includes(p));
    
    // Solo aplicar si NO tiene cuenta existente
    if (esPreguntaInicial && !existingCasinoUser && !existingCasinoUsername) {
      console.log('[ia-default-agent] RAMA: pregunta_inicial (cómo juego) ✓');
      
      const saludo = enableVariation ? getRandomElement(['Buenas!', 'Hola!', 'Hey!', 'Holaa']) : 'Hola!';
      const emoji = Math.random() * 100 < emojiFrequency ? ' 🎰' : '';
      
      const respuesta = humanizeText(
        `${saludo}${emoji} Para jugar primero necesitás una cuenta. ¿Ya tenés usuario o querés que te cree uno?`, 
        emojiFrequency
      );
      
      const payload: DefaultAgentResponse = {
        isActivated: true,
        intencionCargaFichas: false,
        comprobanteDetectado: false,
        respuesta,
        humanizationDelay
      };
      
      return new Response(JSON.stringify(payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // ============= RAMA 3: DETECCIÓN DE INTENCIÓN BANCARIA (CBU/CARGAR) =============
    const bankInfoPatterns = [
      'cbu', 'alias', 'qr', 
      'transferir', 'transferencia', 'depositar', 'deposito', 'depósito',
      'cargar', 'recargar', 'cargar fichas', 'cargar saldo', 'quiero cargar',
      'como cargo', 'cómo cargo', 'para cargar', 
      'retirar', 'retiro', 'sacar plata', 'sacar dinero', 'cobrar',
      'pagar', 'pago', 'abonar',
      'datos bancarios', 'datos para transferir', 'a donde transfiero', 'adonde transfiero',
      'como hago para cargar', 'cómo hago para cargar',
      'como deposito', 'cómo deposito',
      'pasame el cbu', 'pásame el cbu', 'pasame cbu', 'dame el cbu', 'mandame el cbu'
    ];
    
    // EXCLUIR "cajero" y "caja" de bankInfoPatterns para evitar dar el link
    // El cajero SOLO se da después del comprobante
    
    const bankInfoRequested = bankInfoPatterns.some(p => text.includes(p));
    
    if (bankInfoRequested) {
      console.log('[ia-default-agent] RAMA: bankInfoRequested ✓');
      
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
        mensajesMultiples = combineMessagesExceptCBU(mensajesMultiples, cbu);
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

    // ============= RAMA 4: USUARIO DICE QUE YA TIENE CUENTA =============
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
      console.log('[ia-default-agent] RAMA: usuario_existente ✓');
      
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
          mensajesMultiples = combineMessagesExceptCBU(mensajesMultiples, cbu);
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

    // ============= RAMA 5: QUIERE CREAR CUENTA (detección directa) =============
    const quiereCrearCuentaPatterns = [
      'creame', 'créame', 'creame cuenta', 'créame cuenta', 'creame usuario', 'créame usuario',
      'quiero cuenta', 'quiero una cuenta', 'quiero usuario', 'quiero un usuario',
      'no tengo cuenta', 'no tengo usuario', 'crear cuenta', 'crear usuario',
      'haceme cuenta', 'haceme una cuenta', 'haceme usuario',
      'registrarme', 'registrame', 'regístrame', 'quiero registrarme'
    ];
    const quiereCrearCuenta = quiereCrearCuentaPatterns.some(p => text.includes(p));

    if (quiereCrearCuenta && !existingCasinoUser) {
      console.log('[ia-default-agent] RAMA: quiere_crear_cuenta ✓');
      
      // Verificar si tenemos un nombre válido (no genérico, no número de teléfono)
      const nombreEsValido = contactName && 
        contactName.trim().length > 2 && 
        !/^\+?\d+$/.test(contactName.trim()) &&  // No es solo números (teléfono)
        contactName.toLowerCase() !== 'user' &&
        contactName.toLowerCase() !== 'usuario' &&
        !contactName.toLowerCase().startsWith('cliente') &&
        !contactName.toLowerCase().includes('unknown');
      
      if (!nombreEsValido) {
        // NO tenemos nombre válido → Preguntar primero
        console.log('[ia-default-agent] RAMA: quiere_crear_cuenta SIN nombre válido → Preguntar nombre');
        
        const respuesta = humanizeText(
          'Dale! ¿Cómo te llamo para crear tu usuario?', 
          emojiFrequency
        );
        
        return new Response(JSON.stringify({
          isActivated: true,
          intencionCargaFichas: false,
          comprobanteDetectado: false,
          respuesta,
          humanizationDelay
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }
      
      // Si tenemos nombre válido, proceder con creación
      console.log('[ia-default-agent] RAMA: quiere_crear_cuenta CON nombre válido → Crear cuenta');
      
      // Generar username único automáticamente
      const generatedUsername = await generateUniqueUsername(supabase, contactName);
      const password = 'Capibet1234';
      
      // Crear jugador
      const result = await crearJugador(generatedUsername, password, contactName || 'Usuario', phoneNumber || '');
      
      if (result.success) {
        const emoji = Math.random() * 100 < emojiFrequency ? ' 🎰' : '';
        
        let mensajesMultiples = [
          humanizeText(`listo${emoji} tu cuenta:\nUsuario: ${generatedUsername}\nContraseña: ${password}`, emojiFrequency),
          humanizeText(`ingresá desde: ${casinoLink}`, emojiFrequency),
          humanizeText('para cargar fichas, transferí al CBU ↓', emojiFrequency),
          cbu || '[CBU no configurado]',
          humanizeText('mandame el comprobante acá cuando transfieras', emojiFrequency)
        ];
        
        if (combineMessages_enabled) {
          mensajesMultiples = combineMessagesExceptCBU(mensajesMultiples, cbu);
        }

        const payload: DefaultAgentResponse = {
          isActivated: true,
          intencionCargaFichas: false,
          comprobanteDetectado: false,
          respuesta: mensajesMultiples[0],
          mensajesMultiples,
          actionExecuted: {
            type: 'crear_jugador',
            success: true,
            result: { credentials: { userName: generatedUsername, password } }
          },
          schedulePaymentReminder: true,
          casinoUsername: generatedUsername,
          humanizationDelay,
          combinedMessage: combineMessages_enabled
        };
        
        return new Response(JSON.stringify(payload), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      } else {
        const payload: DefaultAgentResponse = {
          isActivated: true,
          intencionCargaFichas: false,
          comprobanteDetectado: false,
          respuesta: humanizeText('hubo un problema creando la cuenta, probá de nuevo en unos minutos', emojiFrequency),
          humanizationDelay
        };
        
        return new Response(JSON.stringify(payload), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }
    }

    // ============= RAMA 5.5: DETECTAR NOMBRE DESPUÉS DE PREGUNTAR =============
    // Si el mensaje anterior de la IA fue preguntando el nombre, crear cuenta con ese nombre
    const mensajeCortoPosibleNombre = text.length < 40 && text.split(' ').length <= 4;
    const noEsSaludo = !saludoPatterns.some(p => text.includes(p));
    const noEsPregunta = !text.includes('?') && !text.includes('como') && !text.includes('cómo');

    if (mensajeCortoPosibleNombre && noEsSaludo && noEsPregunta && !existingCasinoUser && !existingCasinoUsername) {
      // Verificar si el mensaje anterior del bot preguntó por el nombre
      if (conversationId) {
        const { data: lastBotMessage } = await supabase
          .from('messages')
          .select('content')
          .eq('conversation_id', conversationId)
          .eq('direction', 'outbound')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        const preguntoPorNombre = lastBotMessage?.content?.toLowerCase().includes('cómo te llamo') ||
                                   lastBotMessage?.content?.toLowerCase().includes('como te llamo') ||
                                   lastBotMessage?.content?.toLowerCase().includes('tu nombre');
        
        if (preguntoPorNombre) {
          console.log('[ia-default-agent] RAMA: nombre_recibido_crear_cuenta ✓');
          
          // Usar el mensaje del usuario como nombre para crear la cuenta
          const nombreUsuario = messageContent.trim();
          const generatedUsername = await generateUniqueUsername(supabase, nombreUsuario);
          const password = 'Capibet1234';
          
          const result = await crearJugador(generatedUsername, password, nombreUsuario, phoneNumber || '');
          
          if (result.success) {
            const emoji = Math.random() * 100 < emojiFrequency ? ' 🎰' : '';
            
            let mensajesMultiples = [
              humanizeText(`Listo ${nombreUsuario}!${emoji} tu cuenta:\nUsuario: ${generatedUsername}\nContraseña: ${password}`, emojiFrequency),
              humanizeText(`Ingresá desde: ${casinoLink}`, emojiFrequency),
              humanizeText('Para cargar fichas, transferí al CBU ↓', emojiFrequency),
              cbu || '[CBU no configurado]',
              humanizeText('Mandame el comprobante acá cuando transfieras', emojiFrequency)
            ];
            
            if (combineMessages_enabled) {
              mensajesMultiples = combineMessagesExceptCBU(mensajesMultiples, cbu);
            }

            return new Response(JSON.stringify({
              isActivated: true,
              intencionCargaFichas: false,
              comprobanteDetectado: false,
              respuesta: mensajesMultiples[0],
              mensajesMultiples,
              actionExecuted: { type: 'crear_jugador', success: true, result: { credentials: { userName: generatedUsername, password } } },
              schedulePaymentReminder: true,
              casinoUsername: generatedUsername,
              humanizationDelay,
              combinedMessage: combineMessages_enabled
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
          } else {
            return new Response(JSON.stringify({
              isActivated: true,
              intencionCargaFichas: false,
              comprobanteDetectado: false,
              respuesta: humanizeText('hubo un problema creando la cuenta, probá de nuevo en unos minutos', emojiFrequency),
              humanizationDelay
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
          }
        }
      }
    }

    // ============= RAMA 6: MENCIÓN DE COMPROBANTE SIN IMAGEN → DERIVAR =============
    const cargaPatterns = [
      'cargar fichas','cargar saldo','quiero cargar','pasame el cbu','pásame el cbu','alias','qr',
      'ya hice la transferencia','transferi','transferí','transferir','te paso el comprobante','te mando el comprobante',
      'voucher','comprobante','te mando el voucher','te paso el voucher'
    ];
    const intencionCargaFichas = cargaPatterns.some(p => text.includes(p));
    const comprobantePatterns = ['comprobante','voucher','recibo','captura','screenshot','foto del pago','ticket'];
    const comprobanteDetectadoTexto = comprobantePatterns.some(p => text.includes(p));

    if (intencionCargaFichas || comprobanteDetectadoTexto) {
      console.log('[ia-default-agent] RAMA: intencion_carga_o_comprobante_texto ✓');
      const respuesta = humanizeText('Por seguridad, te derivo con un asesor que te ayuda con eso 💸', emojiFrequency);

      const payload: DefaultAgentResponse = {
        isActivated: false,
        intencionCargaFichas,
        comprobanteDetectado: false, // No es comprobante real, solo texto
        respuesta,
        humanizationDelay
      };

      return new Response(JSON.stringify(payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // ============= RAMA 7: CONVERSACIÓN NORMAL CON GEMINI =============
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
    
    // ============= SYSTEM PROMPT MEJORADO (SIN CAJERO VISIBLE) =============
    // IMPORTANTE: El cajero NO está en el prompt para que Gemini no lo mencione
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

**FLUJO OBLIGATORIO - SEGUÍ ESTOS PASOS EN ORDEN:**
1. SIEMPRE empezá preguntando: "¿Ya tenés cuenta o querés que te cree una?"
2. Si dicen que NO tienen cuenta y EXPLÍCITAMENTE piden crearla → Usá la función crear_jugador
3. Si quieren cargar → Dales el CBU y pedí que manden el comprobante
4. SOLO después de que envíen comprobante → Ahí recién los derivamos al cajero

**REGLA ABSOLUTA SOBRE CREAR CUENTAS:**
- SOLO usá crear_jugador cuando el usuario EXPLÍCITAMENTE diga que quiere crear cuenta
- Ejemplos VÁLIDOS para crear cuenta: "créame una cuenta", "quiero registrarme", "no tengo cuenta créame una", "dale", "si créame", "haceme una"
- Ejemplos INVÁLIDOS (NO crear cuenta): "hola", "buenas", "quiero jugar", "cómo funciona" → Primero preguntá si tiene cuenta
- Si tenés dudas, NO crees cuenta, preguntá primero: "¿Querés que te cree una cuenta?"

**REGLAS CRÍTICAS:**
- NUNCA menciones "cajero", "caja", ni "wa.link" en tus respuestas
- El link del cajero se envía automáticamente SOLO después de verificar el comprobante
- Si piden CBU, respondé: "${cbu}"
- Contraseña por defecto: Capibet1234

**PREGUNTAS FRECUENTES:**
- Mínimo carga: $2.000
- Mínimo retiro: $5.000
- 1 retiro por día sin límite
- CBU a nombre de: Edgardo Barrientos

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
              { role: 'model', parts: [{ text: 'dale, entendido. hablo natural, uso los datos exactos, y NUNCA menciono cajero ni wa.link' }] },
              ...geminiHistory,
              { role: 'user', parts: [{ text: messageContent }] }
            ],
            tools: [{
              functionDeclarations: [{
                name: "crear_jugador",
                description: "Crear un nuevo jugador en el casino. Llamá a esta función cuando el usuario quiera crear una cuenta.",
                parameters: {
                  type: "object",
                  properties: {
                    userName: { 
                      type: "string", 
                      description: "Username sugerido. El sistema lo generará automáticamente si no se proporciona." 
                    },
                    password: { 
                      type: "string", 
                      description: "Contraseña. Default: Capibet1234"
                    }
                  },
                  required: []
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
            
            if (toolCallName === 'crear_jugador') {
              // VALIDACIÓN: Verificar que el usuario realmente pidió crear cuenta
              const confirmacionPatterns = [
                'si', 'sí', 'dale', 'creame', 'créame', 'quiero una', 'no tengo', 
                'registrame', 'regístrame', 'haceme', 'abrí', 'abrime', 'ok', 'oka',
                'bueno', 'va', 'vamos', 'dale que si', 'claro', 'obvio', 'por favor',
                'porfa', 'porfavor', 'quiero cuenta', 'quiero usuario'
              ];
              const usuarioConfirmo = confirmacionPatterns.some(p => text.includes(p));
              
              if (!usuarioConfirmo) {
                // Gemini quiso crear cuenta pero usuario no lo pidió explícitamente → Preguntar primero
                console.log('[ia-default-agent] BLOQUEANDO crear_jugador: usuario no confirmó explícitamente');
                const payload: DefaultAgentResponse = {
                  isActivated: true,
                  intencionCargaFichas: false,
                  comprobanteDetectado: false,
                  respuesta: humanizeText('¿Querés que te cree una cuenta?', emojiFrequency),
                  humanizationDelay
                };
                return new Response(JSON.stringify(payload), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  status: 200
                });
              }
              
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
              
              // Usar generador robusto de username (ignora lo que sugiera Gemini)
              const generatedUsername = await generateUniqueUsername(supabase, contactName || 'user');
              const password = args.password || 'Capibet1234';
              
              console.log(`[ia-default-agent] Creating user with generated username: ${generatedUsername}`);
              const toolResult = await crearJugador(generatedUsername, password, contactName || 'Usuario', phoneNumber || '');
              
              if (toolResult.success && toolResult.data) {
                toolResult.data.credentials = { userName: generatedUsername, password };
              }
              
              actionExecuted = {
                type: 'crear_jugador',
                success: toolResult.success,
                result: toolResult
              };
              
              if (toolResult.success) {
                const emoji = Math.random() * 100 < emojiFrequency ? ' 🎰' : '';
                
                let mensajesMultiples = [
                  humanizeText(`listo${emoji} tu cuenta:\nUsuario: ${generatedUsername}\nContraseña: ${password}`, emojiFrequency),
                  humanizeText(`ingresá desde: ${casinoLink}`, emojiFrequency),
                  humanizeText('para cargar fichas, transferí al CBU ↓', emojiFrequency),
                  cbu || '[CBU no configurado]',
                  humanizeText('mandame el comprobante acá cuando transfieras', emojiFrequency)
                ];
                
                if (combineMessages_enabled) {
                  mensajesMultiples = combineMessagesExceptCBU(mensajesMultiples, cbu);
                }

                const payload: DefaultAgentResponse = {
                  isActivated: true,
                  intencionCargaFichas: false,
                  comprobanteDetectado: false,
                  respuesta: mensajesMultiples[0],
                  mensajesMultiples,
                  actionExecuted,
                  schedulePaymentReminder: true,
                  casinoUsername: generatedUsername,
                  humanizationDelay,
                  combinedMessage: combineMessages_enabled
                };
                
                return new Response(JSON.stringify(payload), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  status: 200
                });
              } else {
                respuesta = humanizeText(`hubo un problema creando la cuenta. intentá de nuevo en unos minutos`, emojiFrequency);
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

    // ============= FILTRO ANTI-CAJERO FINAL =============
    // Sanitizar la respuesta para asegurar que no contenga cajero sin comprobante
    respuesta = sanitizeCashierFromResponse(respuesta, cashierNumbersText, false);

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
