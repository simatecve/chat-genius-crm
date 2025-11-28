import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'cashier' | 'user';
  permissions?: {
    [key: string]: boolean;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[create-user] Starting user creation process');

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get the authenticated user (must be a client admin)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[create-user] Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create regular client with user's JWT
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    const { data: { user: currentUser }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !currentUser) {
      console.error('[create-user] Invalid user token:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-user] Authenticated user:', currentUser.id);

    // Check if user is admin (client profile_type)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('profile_type, parent_user_id')
      .eq('id', currentUser.id)
      .single();

    if (profileError || !profile) {
      console.error('[create-user] Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only clients (admins) can create users
    if (profile.profile_type !== 'client') {
      console.error('[create-user] User is not a client admin:', profile.profile_type);
      return new Response(
        JSON.stringify({ error: 'Only client admins can create users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: CreateUserRequest = await req.json();
    const { email, password, firstName, lastName, role, permissions } = body;

    console.log('[create-user] Creating user:', { email, role });

    // Create user in auth.users
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
      console.error('[create-user] Error creating auth user:', authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-user] Auth user created:', authData.user.id);

    // Update profile with parent_user_id (link to admin)
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        parent_user_id: currentUser.id, // Link to the admin creating this user
        profile_type: 'client' // Keep as client type but with parent relationship
      })
      .eq('id', authData.user.id);

    if (profileUpdateError) {
      console.error('[create-user] Error updating profile:', profileUpdateError);
      // Don't fail completely, just log
    }

    // Assign role in user_roles table
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: role === 'admin' ? 'admin' : 'user' // Map cashier/user to 'user' role
      });

    if (roleError) {
      console.error('[create-user] Error assigning role:', roleError);
      // Continue anyway
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
      console.error('[create-user] Error creating permissions:', permissionsError);
      // Continue anyway
    }

    console.log('[create-user] User creation completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          role
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('[create-user] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
