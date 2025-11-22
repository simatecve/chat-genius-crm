import { supabase, supabaseAdmin } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type AppRole = Database['public']['Enums']['app_role'];
export type Permission = Database['public']['Tables']['permissions']['Row'];
export type RolePermission = Database['public']['Tables']['role_permissions']['Row'];
export type UserRole = Database['public']['Tables']['user_roles']['Row'];

export interface UserWithRole {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: AppRole | null;
  created_at: string;
}

export const fetchAllPermissions = async () => {
  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
};

export const fetchRolePermissions = async (role: AppRole) => {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('permission_id')
    .eq('role', role);

  if (error) throw error;
  return data.map(rp => rp.permission_id);
};

export const fetchAllUsers = async () => {
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, created_at')
    .order('created_at', { ascending: false });

  if (profilesError) throw profilesError;

  const usersWithRoles: UserWithRole[] = await Promise.all(
    profiles.map(async (profile) => {
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.id)
        .single();

      return {
        ...profile,
        role: userRole?.role || null
      };
    })
  );

  return usersWithRoles;
};

export const createUser = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: AppRole
) => {
  if (!supabaseAdmin) {
    throw new Error('No se puede crear usuario: falta configuración de admin');
  }

  // Crear usuario en auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName
    }
  });

  if (authError) throw authError;

  // Asignar rol
  const { error: roleError } = await supabaseAdmin
    .from('user_roles')
    .insert({
      user_id: authData.user.id,
      role
    });

  if (roleError) throw roleError;

  return authData.user;
};

export const updateUserRole = async (userId: string, newRole: AppRole) => {
  const { error } = await supabase
    .from('user_roles')
    .upsert({
      user_id: userId,
      role: newRole
    });

  if (error) throw error;
};

export const updateRolePermissions = async (role: AppRole, permissionIds: string[]) => {
  // Eliminar permisos existentes
  const { error: deleteError } = await supabase
    .from('role_permissions')
    .delete()
    .eq('role', role);

  if (deleteError) throw deleteError;

  // Insertar nuevos permisos
  if (permissionIds.length > 0) {
    const { error: insertError } = await supabase
      .from('role_permissions')
      .insert(
        permissionIds.map(permissionId => ({
          role,
          permission_id: permissionId
        }))
      );

    if (insertError) throw insertError;
  }
};

export const deleteUser = async (userId: string) => {
  if (!supabaseAdmin) {
    throw new Error('No se puede eliminar usuario: falta configuración de admin');
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw error;
};

export const checkUserHasPermission = async (userId: string, permissionName: string) => {
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (!userRole) return false;

  const { data: permission } = await supabase
    .from('permissions')
    .select('id')
    .eq('name', permissionName)
    .single();

  if (!permission) return false;

  const { data: rolePermission } = await supabase
    .from('role_permissions')
    .select('id')
    .eq('role', userRole.role)
    .eq('permission_id', permission.id)
    .single();

  return !!rolePermission;
};
