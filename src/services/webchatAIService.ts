import { supabase } from '@/integrations/supabase/client';

export interface WebchatAISettings {
  id: number;
  user_id: string;
  is_enabled: boolean;
  system_prompt: string;
  cashier_numbers: string;
  cbu: string;
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
- El link del cajero ya viene formateado como link de WhatsApp (https://wa.me/NUMERO)
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
