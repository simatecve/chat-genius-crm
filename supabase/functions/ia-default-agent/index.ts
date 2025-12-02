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
};

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
async function analyzeImageForPaymentReceipt(imageUrl: string, LOVABLE_API_KEY: string): Promise<boolean> {
  try {
    console.log('Analyzing image for payment receipt:', imageUrl);
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analiza esta imagen y responde ÚNICAMENTE con "SI" o "NO":
¿Es esta imagen un comprobante de pago, transferencia bancaria, voucher de depósito, 
captura de pantalla de una transferencia realizada, recibo de pago, ticket de depósito,
o cualquier documento/captura que demuestre que se realizó una transacción financiera o pago?

Responde SOLO "SI" o "NO", sin explicaciones.`
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            }
          ]
        }],
        max_tokens: 10,
        temperature: 0.1
      }),
    });

    if (response.ok) {
      const result = await response.json();
      const answer = (result.choices?.[0]?.message?.content || '').toUpperCase().trim();
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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase environment configuration');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { userId, messageContent, imageUrls, contactName, phoneNumber, conversationId } = await req.json();

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
      imageUrls: imageUrls || []
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

    const isEnabled = !!settings?.is_enabled;
    const cashierNumbersText: string = settings?.cashier_numbers || '';
    const cbu: string = settings?.cbu || '';

    // Si la IA global está desactivada, no responde
    if (!isEnabled) {
      const payload: DefaultAgentResponse = {
        isActivated: false,
        intencionCargaFichas: false,
        comprobanteDetectado: false,
        respuesta: ''
      };
      return new Response(JSON.stringify(payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // ANÁLISIS DE IMÁGENES: Si hay imágenes, verificar si alguna es comprobante de pago
    if (imageUrls && imageUrls.length > 0 && LOVABLE_API_KEY) {
      console.log(`Analyzing ${imageUrls.length} images for payment receipts...`);
      
      for (const imageUrl of imageUrls) {
        const isReceipt = await analyzeImageForPaymentReceipt(imageUrl, LOVABLE_API_KEY);
        
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

    // Detección de intención real de carga
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
    
    const systemPrompt = `Sos el asistente virtual del casino online CAPIBET, con tonada argentina y estilo conversacional humano.

**IMPORTANTE - ESTILO CONVERSACIONAL:**
- NO saludes con "Hola" en cada mensaje. Solo saludá si es la primera vez que hablas con este contacto.
- Mantené el hilo natural de la conversación sin repetir información ya dada.
- Sé breve y directo, como una conversación real por WhatsApp.

🎰 **TUS CAPACIDADES:**
1. Podés crear cuentas de jugadores usando la función crear_jugador
2. Para consultas sobre depósitos/cargas o retiros, debés proporcionar el CBU y derivar al cajero

**INFORMACIÓN DEL CASINO:**
- Link del casino: http://capibet.fun/
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
- Formato de respuesta: "¡Listo! Tu cuenta fue creada. Usuario: [usuario] - Contraseña: [contraseña]. Ingresá desde: http://capibet.fun/"
- SIEMPRE incluí el link http://capibet.fun/ cuando crees una cuenta o cuando pregunten cómo acceder al casino

**REGLAS IMPORTANTES:**
- Si te piden cargar fichas, depositar o retirar saldo, primero dales el CBU si lo piden, y SIEMPRE indicá que deben enviar el comprobante al cajero: ${cashierNumbersText || '[número del cajero]'}
- NUNCA inventes información. Si no sabés algo, decilo claramente y recomendá contactar al cajero
- Si te preguntan por juegos específicos, promociones, o detalles técnicos que no conocés, recomendá que contacten al cajero
- Si preguntan el link o cómo entrar al casino, respondé: http://capibet.fun/

Mantené un tono amigable, claro y profesional. Recordá: no repitas saludos en cada respuesta.`;

    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: messageContent }
    ];

    if (LOVABLE_API_KEY) {
      try {
        // Primera llamada a la IA con tools
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: aiMessages,
            tools: casinoTools,
            tool_choice: 'auto', // La IA decide cuándo usar tools
            temperature: 0.7,
            max_tokens: 500,
          }),
        });

        if (aiResponse.ok) {
          const aiResult = await aiResponse.json();
          const message = aiResult.choices?.[0]?.message;
          
          // Si la IA quiere ejecutar una tool
          if (message?.tool_calls && message.tool_calls.length > 0) {
            const toolCall = message.tool_calls[0];
            console.log('Tool call detected:', toolCall.function.name, toolCall.function.arguments);
            
            let args;
            try {
              args = JSON.parse(toolCall.function.arguments);
            } catch (e) {
              console.error('Error parsing tool arguments:', e);
              respuesta = 'Disculpá, hubo un error al procesar tu solicitud. ¿Podés intentar de nuevo?';
              // No retornar undefined, continuar con el flujo normal
            }
            
            if (args) {
              let toolResult;
              let actionType: 'crear_jugador';
              
              switch (toolCall.function.name) {
                case 'crear_jugador':
                  actionType = 'crear_jugador';
                  // Usar contraseña por defecto si no se proporciona
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
                  console.error('Tool no permitida:', toolCall.function.name);
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
                
                // Segunda llamada a la IA con el resultado de la tool
                // para que genere una respuesta amigable al usuario
                const followUpMessages = [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: messageContent },
                  { role: 'assistant', content: null, tool_calls: [toolCall] },
                  { 
                    role: 'tool', 
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(toolResult)
                  }
                ];
                
                const followUpResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model: 'google/gemini-2.5-flash',
                    messages: followUpMessages,
                    temperature: 0.7,
                    max_tokens: 500,
                  }),
                });
                
                if (followUpResponse.ok) {
                  const followUpResult = await followUpResponse.json();
                  respuesta = followUpResult.choices?.[0]?.message?.content || '';
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
            // No hay tool calls, respuesta normal
            respuesta = message?.content || '';
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