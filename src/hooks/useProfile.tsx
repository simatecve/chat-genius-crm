import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUserId } from './useEffectiveUserId';
import { useAuth } from './useAuth';
import { Database } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';

type ProfileType = Database['public']['Enums']['profile_type'];

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company_name: string | null;
  profile_type: ProfileType;
  plan_id: string | null;
  plan_type: string | null;
}

export const useProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { effectiveUserId, isImpersonating } = useEffectiveUserId();
  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Add timeout to avoid infinite loading
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), 10000)
        );

        const queryPromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
        if (cancelled) return;

        if (error) throw error;

        if (!data) {
          setError('No se encontró el perfil del usuario.');
          setProfile(null);
        } else {
          setProfile(data as UserProfile);
        }
      } catch (err: any) {
        if (cancelled) return;
        logger.error('Error fetching profile:', err);
        if (err?.message === 'TIMEOUT') {
          setError('Timeout al cargar el perfil. Verifica tu conexión.');
        } else {
          setError(err?.message || 'Error al cargar el perfil');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProfile();
    return () => { cancelled = true; };
  }, [user?.id, reloadKey]);

  const isSuperAdmin = profile?.profile_type === 'superadmin';
  const isClient = profile?.profile_type === 'client';
  const isCajero = profile?.profile_type === 'cajero';

  const refetchProfile = useCallback(() => {
    setReloadKey(k => k + 1);
  }, []);

  return {
    profile,
    loading,
    error,
    isSuperAdmin,
    isClient,
    isCajero,
    isImpersonating,
    effectiveUserId,
    refetchProfile,
  };
};
