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
};

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

    const { userId, messageContent } = await req.json();

    if (!userId || typeof messageContent !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid input: userId and messageContent are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

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
    const cashierNumbers: string[] = Array.isArray(settings?.cashier_numbers) ? settings!.cashier_numbers : [];
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

    const text = (messageContent || '').toLowerCase();

    // Detección de intención real de carga
    const cargaPatterns = [
      'cargar fichas','cargar saldo','quiero cargar','pasame el cbu','pásame el cbu','alias','qr',
      'ya hice la transferencia','transferi','transferí','transferir','te paso el comprobante','te mando el comprobante',
      'voucher','comprobante','te mando el voucher','te paso el voucher'
    ];
    const intencionCargaFichas = cargaPatterns.some(p => text.includes(p));

    // Detección de comprobante
    const comprobantePatterns = [
      'comprobante','voucher','recibo','captura','screenshot','foto del pago','ticket'
    ];
    const comprobanteDetectado = comprobantePatterns.some(p => text.includes(p));

    // Solicitud explícita de datos bancarios
    const bankInfoPatterns = [
      'cbu','alias','qr','numero de caja','número de caja','cajero','caja'
    ];
    const bankInfoRequested = bankInfoPatterns.some(p => text.includes(p));

    // Caso derivación por intención/comprobante
    if (intencionCargaFichas || comprobanteDetectado) {
      let respuesta = 'Por seguridad, te derivo con un asesor que te ayuda con eso 💸';
      // Si pide datos bancarios explícitos, incluir dinámicos
      if (bankInfoRequested) {
        const cajas = cashierNumbers && cashierNumbers.length > 0 ? cashierNumbers.join(', ') : '';
        const datos = [
          cbu ? `CBU: ${cbu}` : '',
          cajas ? `Números de caja: ${cajas}` : ''
        ].filter(Boolean).join(' · ');
        if (datos) {
          respuesta = `${respuesta} | ${datos}`;
        }
      }

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

    // Caso conversación normal: usar Gemini 2.5 Flash vía Lovable
    let respuesta = '';
    const systemPrompt = `🎯 Objetivo general\n\nSimular al asistente virtual del casino online CAPIBET, con tonada argentina y estilo conversacional humano.\nDebe atender, informar y acompañar al cliente. El registro es gratuito y juego responsable (18+).\n\nSi el usuario pide datos bancarios (CBU/alias/QR/numero de caja), respóndelos usando los siguientes valores dinámicos:\nCBU: ${cbu || '[no configurado]'}\nNúmeros de caja: ${(cashierNumbers && cashierNumbers.length>0) ? cashierNumbers.join(', ') : '[no configurados]'}\n\nSolo derivá automáticamente cuando haya intención real de transferir o envío de comprobante.\nPara preguntas generales (precios, bonos, cómo jugar, juegos), responde amable y breve.\n\nFormato de salida: NO devuelvas JSON, solo devuelve el texto de respuesta conversacional. El sistema lo envolverá en JSON.`;

    const aiMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: messageContent }
    ];

    if (LOVABLE_API_KEY) {
      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: aiMessages,
            temperature: 0.7,
            max_tokens: 500,
          }),
        });

        if (aiResponse.ok) {
          const aiResult = await aiResponse.json();
          respuesta = aiResult.choices?.[0]?.message?.content || '';
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
      respuesta
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
