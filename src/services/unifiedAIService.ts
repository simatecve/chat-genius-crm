import { supabase } from '@/integrations/supabase/client';

export interface UnifiedAISettings {
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

export interface SessionAIStatus {
  id: string;
  name: string;
  channel_type: 'whatsapp' | 'telegram' | 'twilio' | 'webchat';
  ai_enabled: boolean;
  phone_number?: string;
  status?: string;
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
- Link: http://capibet.fun/
- CBU: {CBU}
- Link cajero (SOLO después de recibir comprobante): {CAJERO}

**PREGUNTAS FRECUENTES (usá esta info para responder):**
- ¿Qué plataforma es? → capibet.fun
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

export const unifiedAIService = {
  async getSettings(userId: string): Promise<UnifiedAISettings | null> {
    // First try webchat_ai_settings (unified settings)
    const { data, error } = await supabase
      .from('webchat_ai_settings' as any)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching unified AI settings:', error);
      throw error;
    }
    return data as unknown as UnifiedAISettings;
  },

  async saveSettings(settings: Partial<UnifiedAISettings> & { user_id: string }): Promise<UnifiedAISettings> {
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
        console.error('Error updating unified AI settings:', error);
        throw error;
      }
      return data as unknown as UnifiedAISettings;
    }

    // Insert new
    const { data, error } = await supabase
      .from('webchat_ai_settings' as any)
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error inserting unified AI settings:', error);
      throw error;
    }
    return data as unknown as UnifiedAISettings;
  },

  async getAllSessions(userId: string): Promise<SessionAIStatus[]> {
    const sessions: SessionAIStatus[] = [];

    // Fetch WhatsApp connections
    const { data: whatsappConnections } = await supabase
      .from('whatsapp_connections')
      .select('id, name, phone_number, status, ai_enabled')
      .eq('user_id', userId);

    if (whatsappConnections) {
      for (const conn of whatsappConnections) {
        sessions.push({
          id: conn.id,
          name: conn.name || 'WhatsApp',
          channel_type: 'whatsapp',
          ai_enabled: conn.ai_enabled ?? false,
          phone_number: conn.phone_number,
          status: conn.status,
        });
      }
    }

    // Fetch Telegram bots
    const { data: telegramBots } = await supabase
      .from('telegram_bots')
      .select('id, bot_name, bot_username, status, ai_enabled')
      .eq('user_id', userId);

    if (telegramBots) {
      for (const bot of telegramBots) {
        sessions.push({
          id: bot.id,
          name: bot.bot_name || bot.bot_username || 'Telegram Bot',
          channel_type: 'telegram',
          ai_enabled: bot.ai_enabled ?? false,
          phone_number: bot.bot_username ? `@${bot.bot_username}` : undefined,
          status: bot.status,
        });
      }
    }

    // Fetch Twilio connections
    const { data: twilioConnections } = await supabase
      .from('twilio_connections')
      .select('id, connection_name, phone_number, status, ai_enabled')
      .eq('user_id', userId);

    if (twilioConnections) {
      for (const conn of twilioConnections) {
        sessions.push({
          id: conn.id,
          name: conn.connection_name || 'Twilio',
          channel_type: 'twilio',
          ai_enabled: conn.ai_enabled ?? false,
          phone_number: conn.phone_number,
          status: conn.status,
        });
      }
    }

    // Fetch Web chatbots
    const { data: webChatbots } = await supabase
      .from('web_chatbots')
      .select('id, name, ai_enabled')
      .eq('user_id', userId);

    if (webChatbots) {
      for (const chatbot of webChatbots) {
        sessions.push({
          id: chatbot.id,
          name: chatbot.name || 'Web Chat',
          channel_type: 'webchat',
          ai_enabled: chatbot.ai_enabled ?? false,
          status: 'active',
        });
      }
    }

    return sessions;
  },

  async toggleSessionAI(sessionId: string, channelType: string, enabled: boolean): Promise<void> {
    let table: string;
    
    switch (channelType) {
      case 'whatsapp':
        table = 'whatsapp_connections';
        break;
      case 'telegram':
        table = 'telegram_bots';
        break;
      case 'twilio':
        table = 'twilio_connections';
        break;
      case 'webchat':
        table = 'web_chatbots';
        break;
      default:
        throw new Error(`Unknown channel type: ${channelType}`);
    }

    const { error } = await supabase
      .from(table as any)
      .update({ ai_enabled: enabled })
      .eq('id', sessionId);

    if (error) {
      console.error(`Error toggling AI for ${channelType}:`, error);
      throw error;
    }
  },

  getDefaultPrompt(): string {
    return DEFAULT_PROMPT;
  }
};
