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
  const { effectiveUserId, isImpersonating, loading: userIdLoading } = useEffectiveUserId();
  const { user } = useAuth();

  useEffect(() => {
    const fetchProfile = async () => {
      // Use user.id directly for profile loading, not effectiveUserId
      // effectiveUserId is for data sharing, but profile should always be the logged-in user's
      if (!user?.id || userIdLoading) {
        setLoading(userIdLoading);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id) // Always load the logged-in user's profile
          .single();

        if (error) {
          throw error;
        }

        setProfile(data);
      } catch (err: any) {
        console.error('Error fetching profile:', err);
        setError(err.message || 'Error al cargar el perfil');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id, userIdLoading]);

  const isSuperAdmin = profile?.profile_type === 'superadmin';
  const isClient = profile?.profile_type === 'client';
  const isCajero = profile?.profile_type === 'cajero';

  return {
    profile,
    loading: loading || userIdLoading,
    error,
    isSuperAdmin,
    isClient,
    isCajero,
    isImpersonating,
    effectiveUserId,
    refetchProfile: () => {
      if (user?.id) {
        setLoading(true);
        // Re-trigger the effect
        setProfile(null);
      }
    }
  };
};