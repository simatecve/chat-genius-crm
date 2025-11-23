import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';
import { handleResponse } from '../utils';
import { extractAccessToken } from '@/utils/supabaseHeaders';

/**
 * POST /api/notificaciones/marcar-todas-leidas - Marcar todas las notificaciones del usuario como leídas
 * Requiere autenticación - el usuario_id se obtiene del token
 */
export async function POST(request: NextRequest) {
  try {
    // Extraer el token del usuario autenticado
    const token = extractAccessToken(request);
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'No autorizado'
      }, { status: 401 });
    }

    // Obtener información del usuario desde el token
    const userResponse = await fetch(`${supabaseConfig.url}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseConfig.anonKey || ''
      }
    });

    if (!userResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'No se pudo verificar el usuario'
      }, { status: 401 });
    }

    const userData = await userResponse.json();
    const usuario_id = userData.id;

    if (!usuario_id) {
      return NextResponse.json({
        success: false,
        error: 'Usuario no identificado'
      }, { status: 401 });
    }

    // Marcar todas las notificaciones no leídas del usuario como leídas
    const response = await fetch(
      `${supabaseConfig.restUrl}/notificaciones?usuario_id=eq.${usuario_id}&leida=eq.false`,
      {
        method: 'PATCH',
        headers: getSupabaseHeaders(request, { preferRepresentation: true }),
        body: JSON.stringify({
          leida: true,
        })
      }
    );

    if (!response.ok) {
      console.error('Error al marcar las notificaciones como leídas:', await response.json());
      return NextResponse.json({
        success: false,
        error: 'Error al marcar las notificaciones como leídas'
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    const updatedCount = Array.isArray(data) ? data.length : 0;

    return NextResponse.json({
      success: true,
      data: {
        updated_count: updatedCount
      },
      message: `${updatedCount} notificaciones marcadas como leídas`
    });

  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error al marcar todas las notificaciones como leídas',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

