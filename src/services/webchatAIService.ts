import { supabase } from '@/integrations/supabase/client';

export interface WebchatAISettings {
  id: number;
  user_id: string;
  is_enabled: boolean;
  system_prompt: string;
  cashier_numbers: string;
  cbu: string;
  casino_link: string;
  model: string;
  max_tokens: number;
  created_at?: string | null;
  updated_at?: string | null;
}

const DEFAULT_PROMPT = `Sos el asistente virtual del casino online CAPIBET, con tonada argentina y estilo conversacional humano.

**ESTILO DE RESPUESTA - MUY IMPORTANTE:**
- Respondé en 1-3 oraciones máximo, sé MUY BREVE
- NO saludes con "Hola" en cada mensaje
- Sé directo y conciso, sin rodeos
- Mantené el hilo de conversación sin repetir info
- Evitá introducciones largas

🎰 **FLUJO DE CONVERSACIÓN:**
1. PRIMERO preguntá si ya tiene usuario o si quiere crear uno
2. Si quiere crear: pedí el nombre de usuario deseado y crealo con crear_jugador
3. Después de crear el usuario, enviá las credenciales y el CBU para recargar
4. Cuando el usuario envíe una IMAGEN del comprobante de pago, ahí SÍ enviá el link del cajero

**GENERACIÓN AUTOMÁTICA DE USERNAMES:**
- Si el usuario da un nombre corto o simple (ej: "pepe", "juan", "maria"), 
  generá un username único agregando la fecha actual en formato DDMMYY
- Ejemplo: Si dice "pepe" y hoy es 12/12/2025 → username: "pepe121225"
- SIEMPRE notificá el username generado al usuario

**INFORMACIÓN DEL CASINO:**
- Link: {CASINO_LINK}
- CBU: {CBU}
- Link cajero (SOLO después de recibir comprobante): {CAJERO}

**PREGUNTAS FRECUENTES (usá esta info para responder):**
- ¿Qué plataforma es? → Entrá en {CASINO_LINK}
- ¿Cuál es el mínimo de carga? → $2.000
- ¿Cuál es el mínimo de retiro? → $5.000
- ¿Cuántos retiros puedo hacer? → 1 retiro por día sin límite de monto
- ¿No me ingresa el usuario? → Recordá poner la "C" mayúscula en la contraseña (Capibet1234)
- ¿A nombre de quién está el CBU? → Aldo Ocampo

**CREACIÓN DE CUENTAS:**
- Contraseña por defecto: "Capibet1234"
- Después de crear, enviar: credenciales + link del casino + CBU para recargar
- NO enviar link del cajero aún, solo después de que envíen comprobante

**CUANDO RECIBAS IMAGEN DE COMPROBANTE:**
- Analizá si es un comprobante de pago/transferencia
- Si es comprobante: "¡Perfecto! Recibí tu comprobante. Ahora envialo al cajero haciendo click acá → {CAJERO}"
- El link {CAJERO} es clickeable, el usuario hace click y envía por WhatsApp

**REGLAS:**
- NUNCA envíes el link del cajero ANTES de recibir el comprobante
- El cajero solo recibe comprobantes, no consultas
- NUNCA inventes info, derivá al cajero si no sabés`;

export const webchatAIService = {
  async getSettings(userId: string): Promise<WebchatAISettings | null> {
    const { data, error } = await supabase
      .from('webchat_ai_settings' as any)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching webchat AI settings:', error);
      throw error;
    }
    return data as unknown as WebchatAISettings;
  },

  async saveSettings(settings: Partial<WebchatAISettings> & { user_id: string }): Promise<WebchatAISettings> {
    const payload = {
      user_id: settings.user_id,
      is_enabled: settings.is_enabled ?? false,
      system_prompt: settings.system_prompt || DEFAULT_PROMPT,
      cashier_numbers: settings.cashier_numbers || '',
      cbu: settings.cbu || '',
      casino_link: settings.casino_link || 'https://bet32.fun/',
      model: settings.model || 'google/gemini-2.5-flash',
      max_tokens: settings.max_tokens || 500,
      updated_at: new Date().toISOString(),
    };

    // Try update first
    const { data: existing } = await supabase
      .from('webchat_ai_settings' as any)
      .select('id')
      .eq('user_id', settings.user_id)
      .single();

    if (existing) {
      const { data, error } = await supabase
        .from('webchat_ai_settings' as any)
        .update(payload)
        .eq('user_id', settings.user_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating webchat AI settings:', error);
        throw error;
      }
      return data as unknown as WebchatAISettings;
    }

    // Insert new
    const { data, error } = await supabase
      .from('webchat_ai_settings' as any)
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error inserting webchat AI settings:', error);
      throw error;
    }
    return data as unknown as WebchatAISettings;
  },

  getDefaultPrompt(): string {
    return DEFAULT_PROMPT;
  }
};
