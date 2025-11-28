import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface AccountUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  profile_type: Database['public']['Enums']['profile_type'] | null;
  parent_user_id: string | null;
  role: AppRole | null;
  created_at: string;
}

/**
 * Hook para obtener todos los usuarios de la misma cuenta (empresa)
 * Incluye el admin y todos los usuarios cajero que creó
 */
export const useAccountUsers = () => {
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchUsers = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get current user's profile
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id, parent_user_id, profile_type')
        .eq('id', user.id)
        .single();

      if (!currentProfile) {
        throw new Error('Perfil no encontrado');
      }

      // Determine account owner
      const accountOwnerId = currentProfile.parent_user_id || currentProfile.id;

      // Get all users in this account
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, profile_type, parent_user_id, created_at')
        .or(`id.eq.${accountOwnerId},parent_user_id.eq.${accountOwnerId}`)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get roles for each user
      const usersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          const { data: userRole } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id)
            .maybeSingle();

          return {
            ...profile,
            role: userRole?.role || null
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (err: any) {
      console.error('Error fetching account users:', err);
      setError(err.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [user?.id]);

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
    // Helper para filtrar por rol
    getUsersByRole: (role: AppRole) => users.filter(u => u.role === role),
    // Helper para obtener solo cajeros
    getCashiers: () => users.filter(u => u.parent_user_id !== null),
    // Helper para obtener el admin
    getAdmin: () => users.find(u => u.parent_user_id === null)
  };
};
