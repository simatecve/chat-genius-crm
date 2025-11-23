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

    // Crear registro en la tabla usuarios
    const usuarioData = {
      id: user.id,
      nombre,
      telefono: telefono || null,
      codigo_pais: codigo_pais || null,
      rol: 'usuario', // Rol por defecto
      activo: true,
      organizacion_id: organizacion_id || null
    };

    const usuarioResponse = await fetch(`${supabaseConfig.restUrl}/usuarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseConfig.anonKey || '',
        'Authorization': `Bearer ${access_token}`,
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

