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

const DEFAULT_PROMPT = `Eres un asistente virtual amigable para un sitio web. 
Responde de manera concisa y útil a las consultas de los visitantes.
Sé profesional pero cercano en tu tono.`;

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
