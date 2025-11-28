import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Hook que retorna el ID del usuario efectivo para usar en consultas de base de datos.
 * Si hay impersonación activa y el usuario actual es super admin, retorna el ID del usuario impersonado.
 * De lo contrario, retorna el ID del usuario autenticado.
 */
export const useEffectiveUserId = () => {
  const [effectiveUserId, setEffectiveUserId] = useState<string | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const determineEffectiveUserId = async () => {
      if (!user?.id) {
        setEffectiveUserId(null);
        setIsImpersonating(false);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Check for impersonation parameter in URL
        const urlParams = new URLSearchParams(window.location.search);
        const impersonateUserId = urlParams.get('impersonate');
        
        if (impersonateUserId) {
          // Verify current user is super admin before allowing impersonation
          const { data: currentUserProfile } = await supabase
            .from('profiles')
            .select('profile_type')
            .eq('id', user.id)
            .single();
            
          if (currentUserProfile?.profile_type === 'superadmin') {
            setEffectiveUserId(impersonateUserId);
            setIsImpersonating(true);
          } else {
            // Not a super admin, use their own ID
            setEffectiveUserId(user.id);
            setIsImpersonating(false);
          }
        } else {
          // Get user's profile to check for parent_user_id
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, parent_user_id')
            .eq('id', user.id)
            .single();

          // If user has a parent (is a cashier), use parent's ID for data queries
          // This allows cashiers to see the same data as their admin
          if (profile?.parent_user_id) {
            console.log('[useEffectiveUserId] User is cashier, using parent ID:', profile.parent_user_id);
            setEffectiveUserId(profile.parent_user_id);
            setIsImpersonating(false); // Not impersonation, just data sharing
          } else {
            // User is admin or superadmin, use their own ID
            setEffectiveUserId(user.id);
            setIsImpersonating(false);
          }
        }
      } catch (error) {
        console.error('Error determining effective user ID:', error);
        // Fallback to authenticated user ID
        setEffectiveUserId(user.id);
        setIsImpersonating(false);
      } finally {
        setLoading(false);
      }
    };

    determineEffectiveUserId();
  }, [user?.id]);

  return {
    effectiveUserId,
    isImpersonating,
    loading,
    // Helper function to get the effective user ID synchronously
    // (useful when you already know the hook has loaded)
    getCurrentEffectiveUserId: () => effectiveUserId
  };
};