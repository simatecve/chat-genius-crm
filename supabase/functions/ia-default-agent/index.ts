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
  mensajesMultiples?: string[]; // Para enviar varios mensajes separados
  actionExecuted?: {
    type: 'crear_jugador';
    success: boolean;
    result?: any;
  };
  // Nuevos campos para recordatorios de pago
  schedulePaymentReminder?: boolean;
  casinoUsername?: string;
};

// Función para verificar si un username ya existe GLOBALMENTE
async function checkUsernameExists(supabase: any, username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('conversations')
    .select('casino_username')
    .eq('casino_username', username)
    .limit(1);
  
  if (error) {
    console.error('Error checking username:', error);
    return false; // En caso de error, permitir crear (la API del casino validará)
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

// Función para analizar si una imagen es un comprobante de pago usando visión
async function analyzeImageForPaymentReceipt(imageUrl: string, GOOGLE_GEMINI_API_KEY: string): Promise<boolean> {
  try {
    console.log('Analyzing image for payment receipt:', imageUrl);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_GEMINI_API_KEY}`, {
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
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: imageUrl.startsWith('data:') ? imageUrl.split(',')[1] : ''
              }
            }
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
      console.log('Image analysis result:', answer);
      return answer.includes('SI') || answer.includes('SÍ') || answer === 'YES';
    } else {
      const errorText = await response.text();
      console.error('Error analyzing image:', errorText);
      return false;
    }
  } catch (error) {
    console.error('Exception analyzing image:', error);
    return false;
  }
}

// Definición de herramientas (tools) para function calling
const casinoTools = [
  {
    type: "function",
    function: {
      name: "crear_jugador",
      description: "Crear un nuevo jugador en el casino. Usar cuando el usuario quiera registrarse o crear una cuenta. Si no especifica contraseña, usar 'Capibet1234' como contraseña por defecto.",
      parameters: {
        type: "object",
        properties: {
          userName: { 
            type: "string", 
            description: "Nombre de usuario para el casino (username único)" 
          },
          password: { 
            type: "string", 
            description: "Contraseña del usuario. Si no se proporciona, usar 'Capibet1234' por defecto",
            default: "Capibet1234"
          }
        },
        required: ["userName"]
      }
    }
  }
];

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

    // Recibir parámetros incluyendo estado de usuario existente
    const { 
      userId, 
      messageContent, 
      imageUrls, 
      contactName, 
      phoneNumber, 
      conversationId,
      existingCasinoUser,      // Si esta conversación ya tiene usuario creado
      existingCasinoUsername   // El username de esta conversación si existe
    } = await req.json();

    if (!userId || typeof messageContent !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid input: userId and messageContent are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Processing message:', { 
      userId, 
      contactName, 
      phoneNumber, 
      conversationId, 
      hasImages: !!(imageUrls?.length),
      imageUrlsCount: imageUrls?.length || 0,
      imageUrls: imageUrls || [],
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

    // La IA predeterminada siempre está disponible - la activación se controla a nivel de sesión/canal
    const cashierNumbersText: string = settings?.cashier_numbers || '';
    const cbu: string = settings?.cbu || '';
    const casinoLink: string = settings?.casino_link || 'https://bet32.fun/';

    // ANÁLISIS DE IMÁGENES: Si hay imágenes, verificar si alguna es comprobante de pago
    if (imageUrls && imageUrls.length > 0 && GOOGLE_GEMINI_API_KEY) {
      console.log(`Analyzing ${imageUrls.length} images for payment receipts...`);
      
      for (const imageUrl of imageUrls) {
        const isReceipt = await analyzeImageForPaymentReceipt(imageUrl, GOOGLE_GEMINI_API_KEY);
        
        if (isReceipt) {
          console.log('Payment receipt detected in image:', imageUrl);
          
          const cajas = cashierNumbersText?.trim() || '';
          const mensajesMultiples = [
            '¡Perfecto! Recibí tu comprobante 📄',
            'Para completar tu recarga de saldo, enviá este comprobante al siguiente número de nuestro cajero ↓',
            cajas || 'Contacta a soporte para obtener el número del cajero'
          ];

          const payload: DefaultAgentResponse = {
            isActivated: true,
            intencionCargaFichas: true,
            comprobanteDetectado: true,
            respuesta: mensajesMultiples[0],
            mensajesMultiples
          };

          return new Response(JSON.stringify(payload), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          });
        }
      }
      
      console.log('No payment receipts detected in images');
    }

    const text = (messageContent || '').toLowerCase();

    // DETECCIÓN: Usuario dice que YA tiene cuenta
    const yaTieneCuentaPatterns = [
      'ya tengo cuenta',
      'ya tengo usuario',
      'mi usuario es',
      'mi cuenta es',
      'tengo cuenta',
      'tengo usuario',
      'ya estoy registrado',
      'ya me registré',
      'ya me registre',
      'tengo una cuenta',
      'ya tengo una cuenta',
      // Patrones adicionales
      'ya tengo',           // Respuesta directa común
      'ya tengo creado',
      'tengo creado',
      'ya lo tengo',
      'ya cree',
      'ya creé',
      'tengo mi usuario',
      'tengo mi cuenta',
      'ya hice la cuenta',
      'ya hice mi cuenta',
      'soy jugador',
      'ya soy jugador',
      'si tengo',
      'sí tengo'
    ];
    const yaTieneCuenta = yaTieneCuentaPatterns.some(p => text.includes(p));

    // Detección de intención de recargar
    const quiereRecargarPatterns = [
      'cargar', 'cbu', 'fichas', 'saldo', 'recargar', 'depositar', 
      'deposito', 'depósito', 'transferir', 'transferencia'
    ];
    const quiereRecargar = quiereRecargarPatterns.some(p => text.includes(p));

    // FLUJO: Usuario dice que ya tiene cuenta O la conversación tiene casino_user_created
    if (yaTieneCuenta || (existingCasinoUser && existingCasinoUsername)) {
      console.log(`[ia-default-agent] User has existing account. yaTieneCuenta: ${yaTieneCuenta}, existingCasinoUser: ${existingCasinoUser}, existingCasinoUsername: ${existingCasinoUsername}`);
      
      // Si dice que ya tiene cuenta, asumimos que quiere recargar
      if (yaTieneCuenta || quiereRecargar) {
        const cajas = cashierNumbersText?.trim() || '';
        
        // Mensajes adaptados según si conocemos su username o no
        const mensajesMultiples = existingCasinoUsername 
          ? [
              `Ya tenés tu cuenta ${existingCasinoUsername} 🎰`,
              'Para cargar fichas, transferí al siguiente CBU ↓',
              cbu || '[CBU no configurado]',
              'Una vez que transferiste, enviame la captura del comprobante acá para acreditar tu saldo 💸'
            ]
          : [
              '¡Perfecto! Para cargar fichas, transferí al siguiente CBU ↓',
              cbu || '[CBU no configurado]',
              'Una vez que transferiste, enviame la captura del comprobante acá para acreditar tu saldo 💸'
            ];
        
        const payload: DefaultAgentResponse = {
          isActivated: true,
          intencionCargaFichas: true,
          comprobanteDetectado: false,
          respuesta: mensajesMultiples[0],
          mensajesMultiples,
          schedulePaymentReminder: true,
          casinoUsername: existingCasinoUsername || 'usuario_existente'
        };
        
        return new Response(JSON.stringify(payload), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }
    }

    // Detección de intención real de carga (sin ser usuario existente)
    const cargaPatterns = [
      'cargar fichas','cargar saldo','quiero cargar','pasame el cbu','pásame el cbu','alias','qr',
      'ya hice la transferencia','transferi','transferí','transferir','te paso el comprobante','te mando el comprobante',
      'voucher','comprobante','te mando el voucher','te paso el voucher'
    ];
    const intencionCargaFichas = cargaPatterns.some(p => text.includes(p));

    // Detección de comprobante por texto (fallback si no hay imágenes)
    const comprobantePatterns = [
      'comprobante','voucher','recibo','captura','screenshot','foto del pago','ticket'
    ];
    const comprobanteDetectado = comprobantePatterns.some(p => text.includes(p));

    // Solicitud explícita de datos bancarios (CBU, alias, etc.)
    const bankInfoPatterns = [
      'cbu','alias','qr','numero de caja','número de caja','cajero','caja','transferir','transferencia','depositar','deposito','depósito'
    ];
    const bankInfoRequested = bankInfoPatterns.some(p => text.includes(p));

    // Si pide CBU o datos bancarios, responder con mensajes múltiples estructurados
    if (bankInfoRequested && cbu) {
      const cajas = cashierNumbersText?.trim() || '';
      const mensajesMultiples = [
        'Para transferir te dejo el CBU a continuación ↓',
        cbu,
        'Una vez realizada la transferencia, enviá el comprobante al cajero para acreditar tu saldo ↓',
        cajas || 'Contacta a soporte para obtener el número del cajero'
      ];

      const payload: DefaultAgentResponse = {
        isActivated: true,
        intencionCargaFichas: true,
        comprobanteDetectado: false,
        respuesta: mensajesMultiples[0],
        mensajesMultiples
      };

      return new Response(JSON.stringify(payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Caso derivación por intención/comprobante (sin datos bancarios)
    if (intencionCargaFichas || comprobanteDetectado) {
      let respuesta = 'Por seguridad, te derivo con un asesor que te ayuda con eso 💸';

      const payload: DefaultAgentResponse = {
        isActivated: false,
        intencionCargaFichas,
        comprobanteDetectado,
        respuesta
      };

      return new Response(JSON.stringify(payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Caso conversación normal: usar Gemini 2.5 Flash vía Lovable con tools
    let respuesta = '';
    let actionExecuted: DefaultAgentResponse['actionExecuted'] = undefined;
    
    // Obtener historial de mensajes para memoria conversacional (últimos 12)
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

    // Información adicional para el system prompt si el usuario ya tiene cuenta
    const existingUserInfo = existingCasinoUser && existingCasinoUsername
      ? `\n**USUARIO CON CUENTA EXISTENTE:**
- Este contacto ya tiene cuenta de casino: ${existingCasinoUsername}
- NO crear cuenta nueva para este usuario
- Si quiere cargar fichas, darle el CBU directamente`
      : '';
    
    const systemPrompt = `Sos el asistente virtual del casino online CAPIBET, con tonada argentina y estilo conversacional humano.

**IMPORTANTE - ESTILO CONVERSACIONAL:**
- NO saludes con "Hola" en cada mensaje. Solo saludá si es la primera vez que hablas con este contacto.
- Mantené el hilo natural de la conversación sin repetir información ya dada.
- Sé breve y directo, como una conversación real por WhatsApp.
${existingUserInfo}

🎰 **TUS CAPACIDADES:**
1. Podés crear cuentas de jugadores usando la función crear_jugador
2. Para consultas sobre depósitos/cargas o retiros, debés proporcionar el CBU y derivar al cajero

**INFORMACIÓN DEL CASINO:**
- Link del casino: ${casinoLink}
- CBU para cargas: ${cbu || '[no configurado]'}
- Número de cajero: ${cashierNumbersText || '[no configurado]'}

**NÚMERO DEL CAJERO - MUY IMPORTANTE:**
- El número del cajero es: ${cashierNumbersText || '[no configurado]'}
- SIEMPRE que un usuario necesite soporte, ayuda avanzada, verificar pagos, recargar saldo, retirar saldo, o cualquier operación que requiera asistencia humana, debés proporcionar el número del cajero
- El cajero es el contacto para: recargas de saldo, retiros, verificación de pagos, comprobantes, y soporte técnico avanzado
- Formato: "Para eso contactá con nuestro cajero al: ${cashierNumbersText || '[número]'}"

**CREACIÓN DE CUENTAS:**
- Contraseña por defecto: "Capibet1234" (si el usuario no especifica una)
- Después de crear la cuenta, SIEMPRE enviá las credenciales completas: usuario y contraseña
- Formato de respuesta: "¡Listo! Tu cuenta fue creada. Usuario: [usuario] - Contraseña: [contraseña]. Ingresá desde: ${casinoLink}"
- SIEMPRE incluí el link ${casinoLink} cuando crees una cuenta o cuando pregunten cómo acceder al casino
- NUNCA expliques por qué el usuario tiene ese formato (no menciones fechas, sufijos, ni cómo se generó). Solo comunicá el usuario creado tal cual.

**REGLAS IMPORTANTES:**
- Si te piden cargar fichas, depositar o retirar saldo, primero dales el CBU si lo piden, y SIEMPRE indicá que deben enviar el comprobante al cajero: ${cashierNumbersText || '[número del cajero]'}
- NUNCA inventes información. Si no sabés algo, decilo claramente y recomendá contactar al cajero
- Si te preguntan por juegos específicos, promociones, o detalles técnicos que no conocés, recomendá que contacten al cajero
- Si preguntan el link o cómo entrar al casino, respondé: ${casinoLink}

Mantené un tono amigable, claro y profesional. Recordá: no repitas saludos en cada respuesta.`;

    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: messageContent }
    ];

    if (GOOGLE_GEMINI_API_KEY) {
      try {
        // Construir historial para Gemini
        const geminiHistory = conversationHistory.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }));

        // Primera llamada a la IA con tools (Gemini no soporta tools nativamente igual que OpenAI)
        // Usamos el prompt para incluir instrucciones de tools
        const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_GEMINI_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: systemPrompt }] },
              { role: 'model', parts: [{ text: 'Entendido, soy el asistente de CAPIBET.' }] },
              ...geminiHistory,
              { role: 'user', parts: [{ text: messageContent }] }
            ],
            tools: [{
              functionDeclarations: [{
                name: "crear_jugador",
                description: "Crear un nuevo jugador en el casino. Usar cuando el usuario quiera registrarse o crear una cuenta.",
                parameters: {
                  type: "object",
                  properties: {
                    userName: { 
                      type: "string", 
                      description: "Nombre de usuario para el casino (username único)" 
                    },
                    password: { 
                      type: "string", 
                      description: "Contraseña del usuario. Si no se proporciona, usar 'Capibet1234' por defecto"
                    }
                  },
                  required: ["userName"]
                }
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 500
            }
          }),
        });

        if (aiResponse.ok) {
          const aiResult = await aiResponse.json();
          const candidate = aiResult.candidates?.[0];
          
          // Verificar si hay function call
          const functionCall = candidate?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;
          
          // Si la IA quiere ejecutar una tool
          if (functionCall) {
            const toolCallName = functionCall.name;
            const args = functionCall.args || {};
            console.log('Function call detected:', toolCallName, args);
            
            if (args) {
              let toolResult;
              let actionType: 'crear_jugador' = 'crear_jugador';
              
              switch (toolCallName) {
                case 'crear_jugador':
                  actionType = 'crear_jugador';
                  
                  // VERIFICACIÓN 1: Si esta conversación ya tiene usuario creado, NO crear otro
                  if (existingCasinoUser) {
                    console.log(`[ia-default-agent] Conversation already has casino user: ${existingCasinoUsername}`);
                    const payload: DefaultAgentResponse = {
                      isActivated: true,
                      intencionCargaFichas: false,
                      comprobanteDetectado: false,
                      respuesta: `¡Ya tenés tu cuenta creada! Tu usuario es: ${existingCasinoUsername}. ¿Querés cargar fichas?`
                    };
                    return new Response(JSON.stringify(payload), {
                      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                      status: 200
                    });
                  }
                  
                  // VERIFICACIÓN 2: Verificar duplicado GLOBAL del username
                  const usernameExists = await checkUsernameExists(supabase, args.userName);
                  
                  if (usernameExists) {
                    console.log(`[ia-default-agent] Username "${args.userName}" already exists globally`);
                    const payload: DefaultAgentResponse = {
                      isActivated: true,
                      intencionCargaFichas: false,
                      comprobanteDetectado: false,
                      respuesta: `El usuario "${args.userName}" ya está en uso 🚫. Probá con otro nombre, por ejemplo agregando más números o letras.`
                    };
                    return new Response(JSON.stringify(payload), {
                      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                      status: 200
                    });
                  }
                  
                  // Si no existe, proceder con la creación normal
                  const password = args.password || 'Capibet1234';
                  toolResult = await crearJugador(
                    args.userName, 
                    password, 
                    contactName || 'Usuario', 
                    phoneNumber || ''
                  );
                  // Incluir credenciales en el resultado para la IA
                  if (toolResult.success && toolResult.data) {
                    toolResult.data.credentials = {
                      userName: args.userName,
                      password: password
                    };
                  }
                  break;
                default:
                  console.error('Tool no permitida:', toolCallName);
                  respuesta = 'Para esa operación necesitás hablar con un asesor humano. Te contactamos enseguida.';
                  toolResult = null;
                  break;
              }
              
              if (toolResult) {
                // Guardar información de la acción ejecutada
                actionExecuted = {
                  type: actionType!,
                  success: toolResult.success,
                  result: toolResult
                };
                
                console.log('Tool execution result:', toolResult);
                
                // Si se creó el usuario exitosamente, enviar mensajes estructurados con CBU
                if (actionType === 'crear_jugador' && toolResult.success) {
                  const userName = args.userName;
                  const password = args.password || 'Capibet1234';
                  
                  // Mensajes múltiples estructurados post-creación
                  const mensajesMultiples = [
                    `¡Listo! Tu cuenta fue creada 🎰\nUsuario: ${userName}\nContraseña: ${password}`,
                    `Ingresá desde: ${casinoLink}`,
                    'Para cargar fichas, transferí al siguiente CBU ↓',
                    cbu || '[CBU no configurado]',
                    'Una vez que transferiste, enviame la captura del comprobante acá para acreditar tu saldo 💸'
                  ];
                  
                  const payload: DefaultAgentResponse = {
                    isActivated: true,
                    intencionCargaFichas: false,
                    comprobanteDetectado: false,
                    respuesta: mensajesMultiples[0],
                    mensajesMultiples,
                    actionExecuted,
                    schedulePaymentReminder: true,
                    casinoUsername: userName
                  };
                  
                  return new Response(JSON.stringify(payload), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200
                  });
                }
                
                // Para otras tools, segunda llamada a la IA con el resultado
                const followUpResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_GEMINI_API_KEY}`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    contents: [
                      { role: 'user', parts: [{ text: systemPrompt }] },
                      { role: 'model', parts: [{ text: 'Entendido.' }] },
                      { role: 'user', parts: [{ text: messageContent }] },
                      { role: 'model', parts: [{ functionCall: { name: toolCallName, args } }] },
                      { role: 'function', parts: [{ functionResponse: { name: toolCallName, response: toolResult } }] }
                    ],
                    generationConfig: {
                      temperature: 0.7,
                      maxOutputTokens: 500
                    }
                  }),
                });
                
                if (followUpResponse.ok) {
                  const followUpResult = await followUpResponse.json();
                  respuesta = followUpResult.candidates?.[0]?.content?.parts?.[0]?.text || '';
                } else {
                  // Si falla la segunda llamada, generar respuesta básica
                  if (toolResult.success) {
                    respuesta = `¡Listo! La operación se completó exitosamente. 🎰`;
                  } else {
                    respuesta = `Hubo un problema al procesar tu solicitud: ${toolResult.error || 'Error desconocido'}. Por favor intentá de nuevo o contactá a soporte.`;
                  }
                }
              }
            }
          } else {
            // No hay function call, respuesta normal de texto
            respuesta = candidate?.content?.parts?.[0]?.text || '';
          }
        } else {
          const errorText = await aiResponse.text();
          console.error('Lovable AI error:', errorText);
        }
      } catch (e) {
        console.error('Lovable AI call failed:', e);
      }
    }

    if (!respuesta) {
      // Fallback de estilo conversacional
      respuesta = 'Depende del juego. Las fichas arrancan desde $100, y si hay promo pueden rendir más. ¿Querés que te cuente las opciones?';
    }

    const payload: DefaultAgentResponse = {
      isActivated: true,
      intencionCargaFichas: false,
      comprobanteDetectado: false,
      respuesta,
      actionExecuted
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
      status: 200
    });
  }
});
