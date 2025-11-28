import { supabase, supabaseAdmin } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type AppRole = Database['public']['Enums']['app_role'];
export type ProfileType = Database['public']['Enums']['profile_type'];

export interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  profile_type: ProfileType | null;
  role: AppRole | null;
  created_at: string;
}

export const usersService = {
  /**
   * Get all users belonging to the current client admin's account
   */
  async getAllUsers(): Promise<UserProfile[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get current user's profile to check if they're admin or have parent
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('id, parent_user_id, profile_type')
      .eq('id', user.id)
      .single();

    if (!currentProfile) throw new Error('Profile not found');

    // Determine the account owner ID
    const accountOwnerId = currentProfile.parent_user_id || currentProfile.id;

    // Get all profiles in this account (users with this parent_user_id + the admin itself)
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

    return usersWithRoles;
  },

  /**
   * Create a new user (cajero) for the current client admin
   */
  async createUser(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: AppRole = 'user',
    permissions?: Record<string, boolean>
  ) {
    if (!supabaseAdmin) {
      throw new Error('No se puede crear usuario: falta configuración de admin');
    }

    // Get current user
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('No autenticado');

    // Create user in auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      throw new Error(authError.message);
    }

    // Update profile with parent_user_id and set as cajero
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        parent_user_id: currentUser.id,
        profile_type: 'cajero'
      })
      .eq('id', authData.user.id);

    if (profileUpdateError) {
      console.error('Error updating profile:', profileUpdateError);
    }

    // Assign role in user_roles table
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: role === 'admin' ? 'admin' : 'user'
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
    }

    // Create default permissions
    const defaultPermissions = permissions || {
      puede_ver_dashboard: true,
      puede_ver_contactos: true,
      puede_ver_chats: true,
      puede_enviar_mensajes: true,
      puede_ver_embudos: true,
      puede_mover_contactos_embudos: true,
      puede_ver_tareas: true
    };

    const { error: permissionsError } = await supabaseAdmin
      .from('user_permissions')
      .insert({
        user_id: authData.user.id,
        ...defaultPermissions
      });

    if (permissionsError) {
      console.error('Error creating permissions:', permissionsError);
    }

    return authData.user;
  },

  /**
   * Update user role
   */
  async updateUserRole(userId: string, newRole: AppRole) {
    const { error } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: newRole
      });

    if (error) throw error;
  },

  /**
   * Delete user
   */
  async deleteUser(userId: string) {
    if (!supabaseAdmin) {
      throw new Error('No se puede eliminar usuario: falta configuración de admin');
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
  }
};
