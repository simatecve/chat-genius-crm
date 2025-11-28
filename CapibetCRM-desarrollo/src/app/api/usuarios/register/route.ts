import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

/**
 * POST /api/usuarios/register - Registro de nuevo usuario
 * 
 * Flujo:
 * 1. Crea el usuario en Supabase Auth
 * 2. Crea el registro en la tabla usuarios
 * 3. Retorna los datos del usuario con tokens
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      correo_electronico, 
      contrasena, 
      nombre,
      telefono,
      codigo_pais,
      organizacion_id 
    } = body;

    // Validaciones
    if (!correo_electronico || !contrasena || !nombre) {
      return NextResponse.json({
        success: false,
        error: 'Email, contraseña y nombre son requeridos'
      }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo_electronico)) {
      return NextResponse.json({
        success: false,
        error: 'Formato de email inválido'
      }, { status: 400 });
    }

    if (contrasena.length < 6) {
      return NextResponse.json({
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres'
      }, { status: 400 });
    }

    // Crear usuario en Supabase Auth
    const authResponse = await fetch(`${supabaseConfig.url}/auth/v1/signup`, {
      method: 'POST',
      headers: getSupabaseHeaders(null),
      body: JSON.stringify({
        email: correo_electronico,
        password: contrasena
      })
    });

    if (!authResponse.ok) {
      const errorData = await authResponse.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: errorData.error_description || errorData.msg || 'Error al crear usuario'
      }, { status: authResponse.status });
    }

    const authData = await authResponse.json();
    const { access_token, refresh_token, user } = authData;

    if (!user || !user.id) {
      return NextResponse.json({
        success: false,
        error: 'Error al crear el usuario en el sistema de autenticación'
      }, { status: 500 });
    }

    // Crear registro en la tabla usuarios con el rol que viene en el body
    const usuarioData = {
      id: user.id,
      correo_electronico: correo_electronico,
      nombre,
      telefono: telefono || null,
      codigo_pais: codigo_pais || null,
      rol: body.rol || 'Cliente', // Usar el rol del body o Cliente por defecto
      activo: true,
      organizacion_id: organizacion_id || null
    };

    // Usar service role key para crear el usuario en la tabla
    const usuarioResponse = await fetch(`${supabaseConfig.restUrl}/usuarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseConfig.anonKey || '',
        'Authorization': `Bearer ${supabaseConfig.serviceRoleKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(usuarioData)
    });

    if (!usuarioResponse.ok) {
      // Si falla crear el usuario en la tabla, deberíamos eliminar el usuario de Auth
      // pero por simplicidad lo dejamos así. En producción sería bueno manejarlo mejor.
      const errorData = await usuarioResponse.text();
      return NextResponse.json({
        success: false,
        error: 'Error al crear el perfil del usuario',
        details: errorData
      }, { status: usuarioResponse.status });
    }

    const usuarioCreado = await usuarioResponse.json();
    const userData = Array.isArray(usuarioCreado) ? usuarioCreado[0] : usuarioCreado;

    const adminRoles = ['ADMINITRADOR', 'admin', 'super_admin'];
    const isAdmin = adminRoles.includes(body.rol);
    const defaultPerms: Record<string, boolean> = {};
    const allKeys = [
      'puede_ver_dashboard','puede_ver_contactos','puede_crear_contactos','puede_editar_contactos','puede_eliminar_contactos','puede_importar_contactos',
      'puede_ver_chats','puede_enviar_mensajes','puede_ver_mensajes_otros','puede_eliminar_mensajes',
      'puede_ver_embudos','puede_crear_embudos','puede_editar_embudos','puede_eliminar_embudos','puede_mover_contactos_embudos',
      'puede_ver_ventas','puede_crear_ventas','puede_editar_ventas','puede_eliminar_ventas',
      'puede_ver_tareas','puede_crear_tareas','puede_asignar_tareas','puede_eliminar_tareas',
      'puede_ver_reportes','puede_exportar_datos','puede_ver_analytics',
      'puede_gestionar_usuarios','puede_ver_configuracion','puede_editar_configuracion','puede_gestionar_plantillas','puede_gestionar_respuestas_rapidas',
      'puede_gestionar_whatsapp','puede_gestionar_instagram','puede_gestionar_facebook','puede_gestionar_telegram'
    ];
    allKeys.forEach(k => { defaultPerms[k] = isAdmin; });
    if (!isAdmin) {
      defaultPerms['puede_ver_dashboard'] = true;
      defaultPerms['puede_ver_chats'] = true;
      defaultPerms['puede_enviar_mensajes'] = true;
      defaultPerms['puede_ver_embudos'] = true;
      defaultPerms['puede_mover_contactos_embudos'] = true;
      defaultPerms['puede_ver_tareas'] = true;
      defaultPerms['puede_ver_contactos'] = true;
    }

    await fetch(`${supabaseConfig.restUrl}/user_permissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseConfig.anonKey || '',
        'Authorization': `Bearer ${supabaseConfig.serviceRoleKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ usuario_id: user.id, ...defaultPerms })
    });

    return NextResponse.json({
      success: true,
      data: {
        ...userData,
        access_token,
        refresh_token
      },
      message: 'Usuario registrado exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error in register:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error al registrar usuario',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

