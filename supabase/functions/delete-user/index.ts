import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No autorizado');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Client with user JWT for validation
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for deletion
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Usuario no autenticado');
    }

    // Parse request body
    const { userId } = await req.json();
    if (!userId) {
      throw new Error('userId es requerido');
    }

    // Prevent self-deletion
    if (user.id === userId) {
      throw new Error('No puedes eliminarte a ti mismo');
    }

    // Validate that requesting user is admin
    const { data: adminProfile, error: adminError } = await supabase
      .from('profiles')
      .select('id, profile_type')
      .eq('id', user.id)
      .single();

    if (adminError || !adminProfile) {
      throw new Error('Perfil no encontrado');
    }

    if (adminProfile.profile_type !== 'client') {
      throw new Error('Solo los administradores pueden eliminar usuarios');
    }

    // Validate that user to delete belongs to this admin
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('id, parent_user_id, profile_type')
      .eq('id', userId)
      .single();

    if (targetError || !targetProfile) {
      throw new Error('Usuario a eliminar no encontrado');
    }

    if (targetProfile.parent_user_id !== user.id) {
      throw new Error('Solo puedes eliminar usuarios de tu cuenta');
    }

    console.log('Iniciando eliminación de usuario:', userId);

    // Step 1: Delete user_permissions
    const { error: permError } = await supabaseAdmin
      .from('user_permissions')
      .delete()
      .eq('user_id', userId);

    if (permError) {
      console.error('Error eliminando permisos:', permError);
    }

    // Step 2: Delete user_roles
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (roleError) {
      console.error('Error eliminando roles:', roleError);
    }

    // Step 3: Delete profile (RLS should allow admin to delete their subordinates)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Error eliminando perfil:', profileError);
    }

    // Step 4: Delete auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.error('Error eliminando usuario de auth:', authError);
      throw new Error(`Error al eliminar usuario: ${authError.message}`);
    }

    console.log('Usuario eliminado exitosamente:', userId);

    return new Response(
      JSON.stringify({ success: true, message: 'Usuario eliminado correctamente' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error en delete-user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error al eliminar usuario';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
