import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

/**
 * POST /api/usuarios/refresh-token - Renovar access token
 * 
 * Utiliza el refresh_token para obtener un nuevo access_token
 * sin necesidad de volver a ingresar credenciales
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refresh_token } = body;

    if (!refresh_token) {
      return NextResponse.json({
        success: false,
        error: 'refresh_token es requerido'
      }, { status: 400 });
    }

    // Renovar el token con Supabase Auth
    const authResponse = await fetch(`${supabaseConfig.url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: getSupabaseHeaders(null),
      body: JSON.stringify({
        refresh_token
      })
    });

    if (!authResponse.ok) {
      const errorData = await authResponse.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: errorData.error_description || 'Refresh token inválido o expirado'
      }, { status: authResponse.status });
    }

    const authData = await authResponse.json();
    const { access_token, refresh_token: new_refresh_token, user } = authData;

    if (!access_token) {
      return NextResponse.json({
        success: false,
        error: 'Error al renovar el token'
      }, { status: 500 });
    }

    // Obtener datos actualizados del usuario
    const usuarioResponse = await fetch(`${supabaseConfig.restUrl}/usuarios?id=eq.${user.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseConfig.anonKey || '',
        'Authorization': `Bearer ${access_token}`
      }
    });

    let usuarioData = null;
    if (usuarioResponse.ok) {
      const usuarios = await usuarioResponse.json();
      if (Array.isArray(usuarios) && usuarios.length > 0) {
        usuarioData = usuarios[0];
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        access_token,
        refresh_token: new_refresh_token,
        user: {
          id: user.id,
          email: user.email,
          ...usuarioData
        }
      },
      message: 'Token renovado exitosamente'
    });

  } catch (error) {
    console.error('Error refreshing token:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error al renovar el token',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

