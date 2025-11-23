import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { LoginCredentials, SupabaseAuthResponse, UsuarioData, OrganizacionData } from '../domain/usuario';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

/**
 * POST /api/usuarios/login - Autenticación de usuario
 * 
 * Flujo:
 * 1. Autentica con Supabase Auth
 * 2. Obtiene los datos del usuario de la tabla usuarios
 * 3. Obtiene los datos de la organización
 * 4. Retorna todo junto
 */
export async function POST(request: NextRequest) {
  try {
    const credentials: LoginCredentials = await request.json();

    if (!credentials.correo_electronico || !credentials.contrasena) {
      return NextResponse.json({
        success: false,
        error: 'Email y contraseña son requeridos'
      }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(credentials.correo_electronico)) {
      return NextResponse.json({
        success: false,
        error: 'Formato de email inválido'
      }, { status: 400 });
    }

    const authResponse = await fetch(`${supabaseConfig.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: getSupabaseHeaders(null),
      body: JSON.stringify({
        email: credentials.correo_electronico,
        password: credentials.contrasena
      })
    });

    if (!authResponse.ok) {
      const errorData = await authResponse.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: errorData.error_description || 'Credenciales incorrectas'
      }, { status: authResponse.status });
    }

    const authData: SupabaseAuthResponse = await authResponse.json();
    
    const { access_token, refresh_token, user } = authData;
    
    if (!user || !user.id) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener datos del usuario autenticado'
      }, { status: 500 });
    }

    const usuarioResponse = await fetch(`${supabaseConfig.restUrl}/usuarios`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseConfig.anonKey || '',
        'Authorization': `Bearer ${access_token}`
      }
    });

    if (!usuarioResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener los datos del usuario'
      }, { status: usuarioResponse.status });
    }

    const usuariosData = await usuarioResponse.json();
    
    if (!Array.isArray(usuariosData) || usuariosData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Usuario no encontrado en la base de datos'
      }, { status: 404 });
    }

    const usuarioData = usuariosData[0];

    let organizacion: OrganizacionData | undefined;
    
    if (usuarioData.organizacion_id) {
      const organizacionResponse = await fetch(
        `${supabaseConfig.restUrl}/organizaciones?id=eq.${usuarioData.organizacion_id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseConfig.anonKey || '',
            'Authorization': `Bearer ${access_token}`
          }
        }
      );

      if (organizacionResponse.ok) {
        const organizacionesData = await organizacionResponse.json();
        
        if (Array.isArray(organizacionesData) && organizacionesData.length > 0) {
          const org = organizacionesData[0];
          organizacion = {
            id: org.id,
            nombre: org.nombre,
            website: org.website || null,
            logo: org.logo || null
          };
        }
      }
    }

    // Paso 4: Construir la respuesta completa
    const usuarioCompleto: UsuarioData = {
      id: user.id,
      correo_electronico: user.email,
      nombre: usuarioData.nombre,
      telefono: usuarioData.telefono,
      codigo_pais: usuarioData.codigo_pais,
      rol: usuarioData.rol,
      activo: usuarioData.activo,
      organizacion_id: usuarioData.organizacion_id,
      organizacion: organizacion,
      creado_en: usuarioData.creado_en,
      actualizado_en: usuarioData.actualizado_en
    };

    return NextResponse.json({
      success: true,
      data: {
        ...usuarioCompleto,
        access_token,
        refresh_token
      },
      message: 'Login exitoso'
    });

  } catch (error) {
    console.error('Error in login:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al iniciar sesión',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}