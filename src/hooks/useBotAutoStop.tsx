import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const useBotAutoStop = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [autoStopEnabled, setAutoStopEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_bot_settings')
        .select('auto_stop_on_human_reply')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setAutoStopEnabled(data.auto_stop_on_human_reply);
      } else {
        // Si no existe, crear configuración por defecto
        await createDefaultSettings();
      }
    } catch (error) {
      console.error('Error fetching bot auto-stop settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_bot_settings')
        .insert({
          user_id: user.id,
          auto_stop_on_human_reply: true,
        })
        .select()
        .single();

      if (error) throw error;

      setAutoStopEnabled(data.auto_stop_on_human_reply);
    } catch (error) {
      console.error('Error creating default bot settings:', error);
    }
  };

  const toggleAutoStop = async () => {
    if (!user) return;

    const newValue = !autoStopEnabled;
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('user_bot_settings')
        .upsert({
          user_id: user.id,
          auto_stop_on_human_reply: newValue,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setAutoStopEnabled(newValue);
      toast({
        title: newValue ? 'Auto-detención activada' : 'Auto-detención desactivada',
        description: newValue 
          ? 'El bot se detendrá automáticamente cuando respondas en una conversación'
          : 'El bot seguirá respondiendo aunque escribas en la conversación',
      });
    } catch (error) {
      console.error('Error toggling bot auto-stop:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cambiar la configuración',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    autoStopEnabled,
    isLoading,
    toggleAutoStop,
  };
};
