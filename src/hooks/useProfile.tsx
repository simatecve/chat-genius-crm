import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUserId } from './useEffectiveUserId';
import { useAuth } from './useAuth';
import { Database } from '@/integrations/supabase/types';

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
  const { effectiveUserId, isImpersonating } = useEffectiveUserId();
  const { user } = useAuth();

  useEffect(() => {
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
          .single();

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

        if (error) {
          throw error;
        }

        setProfile(data);
      } catch (err: any) {
        console.error('Error fetching profile:', err);
        if (err.name === 'AbortError') {
          setError('Timeout al cargar el perfil. Intenta recargar la página.');
        } else {
          setError(err.message || 'Error al cargar el perfil');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id]);

  const isSuperAdmin = profile?.profile_type === 'superadmin';
  const isClient = profile?.profile_type === 'client';
  const isCajero = profile?.profile_type === 'cajero';

  return {
    profile,
    loading,
    error,
    isSuperAdmin,
    isClient,
    isCajero,
    isImpersonating,
    effectiveUserId,
    refetchProfile: () => {
      if (user?.id) {
        setLoading(true);
        setProfile(null);
      }
    }
  };
};
