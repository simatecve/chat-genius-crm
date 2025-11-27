import { supabase, supabaseAdmin } from '@/integrations/supabase/client';

export interface IADefaultSettings {
  id: number;
  is_enabled: boolean;
  cashier_numbers: string; // ahora texto libre
  cbu: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export const iaDefaultService = {
  async getSettings(): Promise<IADefaultSettings | null> {
    const { data, error } = await supabase
      .from('ia_default_settings' as any)
      .select('*')
      .limit(1)
      .single();

    if (error) {
      // If no rows, return defaults
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching IA default settings:', error);
      throw error;
    }
    return data as IADefaultSettings;
  },

  async saveSettings(settings: Omit<IADefaultSettings, 'created_at' | 'updated_at'>): Promise<IADefaultSettings> {
    const payload = {
      id: 1,
      is_enabled: settings.is_enabled,
      cashier_numbers: settings.cashier_numbers,
      cbu: settings.cbu,
      updated_at: new Date().toISOString(),
    };

    // Prefer UPDATE to avoid INSERT RLS checks during upsert
    const updateRes = await supabase
      .from('ia_default_settings' as any)
      .update(payload)
      .eq('id', 1)
      .select()
      .single();

    if (!updateRes.error && updateRes.data) {
      return updateRes.data as IADefaultSettings;
    }

    // If no row exists yet, perform regular upsert (RLS allows any authenticated user)
    const { data, error } = await supabase
      .from('ia_default_settings' as any)
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Error saving IA default settings:', error);
      throw error;
    }
    return data as IADefaultSettings;
  }
};