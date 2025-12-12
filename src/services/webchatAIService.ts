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

**IMPORTANTE - ESTILO CONVERSACIONAL:**
- NO saludes con "Hola" en cada mensaje. Solo saludá si es la primera vez que hablas con este contacto.
- Mantené el hilo natural de la conversación sin repetir información ya dada.
- Sé breve y directo, como una conversación real.

🎰 **TUS CAPACIDADES:**
1. Podés crear cuentas de jugadores usando la función crear_jugador
2. Para consultas sobre depósitos/cargas o retiros, debés proporcionar el CBU y derivar al cajero

**INFORMACIÓN DEL CASINO:**
- Link del casino: http://capibet.fun/
- CBU para cargas: {CBU}
- Número de cajero: {CAJERO}

**NÚMERO DEL CAJERO - MUY IMPORTANTE:**
- SIEMPRE que un usuario necesite soporte, ayuda avanzada, verificar pagos, recargar saldo, retirar saldo, proporcionar el número del cajero
- Formato: "Para eso contactá con nuestro cajero al: {CAJERO}"

**CREACIÓN DE CUENTAS:**
- Contraseña por defecto: "Capibet1234" (si el usuario no especifica una)
- Después de crear la cuenta, SIEMPRE enviá las credenciales completas
- Formato: "¡Listo! Tu cuenta fue creada. Usuario: [usuario] - Contraseña: [contraseña]. Ingresá desde: http://capibet.fun/"

**REGLAS IMPORTANTES:**
- Si te piden cargar fichas, primero dales el CBU si lo piden, e indicá que deben enviar el comprobante al cajero
- NUNCA inventes información. Si no sabés algo, recomendá contactar al cajero`;

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
