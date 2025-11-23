import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { NotificacionData, NotificacionResponse } from '../domain/notificacion';
import { handleResponse } from '../utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

/**
 * GET /api/notificaciones/[id] - Obtener notificación por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return NextResponse.json({
        success: false,
        error: 'ID de notificación inválido (debe ser un UUID)'
      }, { status: 400 });
    }

    const response = await fetch(
      `${supabaseConfig.restUrl}/notificaciones?id=eq.${id}`,
      {
        method: 'GET',
        headers: getSupabaseHeaders(request, { preferRepresentation: true })
      }
    );

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener la notificación'
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    
    return NextResponse.json({
      success: true,
      data: Array.isArray(data) ? data[0] : null
    });

  } catch (error) {
    console.error('Error fetching notification:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al obtener notificación',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

/**
 * PATCH /api/notificaciones/[id] - Actualizar notificación
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const notificacionData: Partial<NotificacionData> = await request.json();
    
    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return NextResponse.json({
        success: false,
        error: 'ID de notificación inválido (debe ser un UUID)'
      }, { status: 400 });
    }

    const response = await fetch(
      `${supabaseConfig.restUrl}/notificaciones?id=eq.${id}`,
      {
        method: 'PATCH',
        headers: getSupabaseHeaders(request, { preferRepresentation: true }),
        body: JSON.stringify(notificacionData)
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json({
        success: false,
        error: `Error del servidor: ${response.status} ${response.statusText}`,
        details: errorData
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    
    return NextResponse.json({
      success: true,
      data: data as unknown as NotificacionResponse,
      message: 'Notificación actualizada correctamente'
    });

  } catch (error) {
    console.error('Error updating notification:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error al actualizar notificación',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/notificaciones/[id] - Eliminar notificación (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return NextResponse.json({
        success: false,
        error: 'ID de notificación inválido (debe ser un UUID)'
      }, { status: 400 });
    }

    // Realizar soft delete (archivar)
    const response = await fetch(
      `${supabaseConfig.restUrl}/notificaciones?id=eq.${id}`,
      {
        method: 'PATCH',
        headers: getSupabaseHeaders(request, { preferRepresentation: true }),
        body: JSON.stringify({
          archivada_en: new Date().toISOString()
        })
      }
    );

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al eliminar la notificación'
      }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      message: 'Notificación eliminada correctamente'
    });

  } catch (error) {
    console.error('Error deleting notification:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error al eliminar notificación',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

