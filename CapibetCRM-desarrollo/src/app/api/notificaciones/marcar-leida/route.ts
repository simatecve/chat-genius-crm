import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';
import { handleResponse } from '../utils';

/**
 * POST /api/notificaciones/marcar-leida - Marcar una notificación como leída
 * Body: { notificacion_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { notificacion_id } = await request.json();
    
    if (!notificacion_id) {
      return NextResponse.json({
        success: false,
        error: 'notificacion_id es requerido'
      }, { status: 400 });
    }

    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(notificacion_id)) {
      return NextResponse.json({
        success: false,
        error: 'ID de notificación inválido (debe ser un UUID)'
      }, { status: 400 });
    }

    const response = await fetch(
      `${supabaseConfig.restUrl}/notificaciones?id=eq.${notificacion_id}`,
      {
        method: 'PATCH',
        headers: getSupabaseHeaders(request, { preferRepresentation: true }),
        body: JSON.stringify({
          leida: true,
        })
      }
    );

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al marcar la notificación como leída'
      }, { status: response.status });
    }

    const data = await handleResponse(response);

    return NextResponse.json({
      success: true,
      data,
      message: 'Notificación marcada como leída'
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error al marcar notificación como leída',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

