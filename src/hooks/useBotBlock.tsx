import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const useBotBlock = (numero: string | null, pushname: string | null) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isBlocked, setIsBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (numero && user) {
      checkBlockStatus();
    }
  }, [numero, user]);

  const checkBlockStatus = async () => {
    if (!numero || !user) return;

    const { data, error } = await supabase
      .from('contacto_bloqueado_bot')
      .select('id')
      .eq('user_id', user.id)
      .eq('numero', numero)
      .maybeSingle();

    if (error) {
      console.error('Error checking block status:', error);
      return;
    }

    setIsBlocked(!!data);
  };

  const toggleBotBlock = async () => {
    if (!numero || !user) return;

    setIsLoading(true);

    try {
      if (isBlocked) {
        // Desbloquear: eliminar de la base de datos
        const { error } = await supabase
          .from('contacto_bloqueado_bot')
          .delete()
          .eq('user_id', user.id)
          .eq('numero', numero);

        if (error) throw error;

        setIsBlocked(false);
        toast({
          title: 'Bot activado',
          description: 'El bot responderá a este contacto',
        });
      } else {
        // Bloquear: agregar a la base de datos
        const { error } = await supabase
          .from('contacto_bloqueado_bot')
          .insert({
            user_id: user.id,
            numero: numero,
            pushname: pushname,
          });

        if (error) throw error;

        setIsBlocked(true);
        toast({
          title: 'Bot desactivado',
          description: 'El bot no responderá a este contacto',
        });
      }
    } catch (error) {
      console.error('Error toggling bot block:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado del bot',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isBlocked,
    isLoading,
    toggleBotBlock,
  };
};
