import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { 
  WhatsAppSessionResponse,
  WhatsAppSessionData
} from '../domain/whatsapp_session';
import { handleResponse } from '../utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

/**
 * GET /api/whatsapp_sessions/[id]
 * Obtiene una sesión de WhatsApp por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('id', id);
    const response = await fetch(`${supabaseConfig.restUrl}/whatsapp_sessions?id=eq.${id}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      console.error('Error fetching whatsapp session:', response.status, response.statusText);
      return NextResponse.json({
        success: false,
        error: 'Error al obtener sesión de WhatsApp',
        details: response.statusText
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    const session = Array.isArray(data) ? data[0] : data;

    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Sesión de WhatsApp no encontrada'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: session
    });

  } catch (error) {
    console.error('Unexpected error in GET whatsapp_sessions/[id]:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

/**
 * PATCH /api/whatsapp_sessions/[id]
 * Actualiza una sesión de WhatsApp
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    
    if (isNaN(id)) {
      return NextResponse.json({
        success: false,
        error: 'ID inválido'
      }, { status: 400 });
    }

    const body: Partial<WhatsAppSessionData> = await request.json();

    // Validar que la sesión existe
    const fetchResponse = await fetch(`${supabaseConfig.restUrl}/whatsapp_sessions?id=eq.${id}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!fetchResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al verificar la sesión',
        details: fetchResponse.statusText
      }, { status: fetchResponse.status });
    }

    const existingSessionData = await handleResponse(fetchResponse);
    const existingSession = Array.isArray(existingSessionData) ? existingSessionData[0] : existingSessionData;

    if (!existingSession) {
      return NextResponse.json({
        success: false,
        error: 'Sesión de WhatsApp no encontrada'
      }, { status: 404 });
    }

    // Preparar datos para actualización
    const updateData = {
      ...body,
      updated_at: new Date().toISOString(),
    };

    // Remover campos que no deben ser actualizados directamente
    delete updateData.id;
    delete updateData.created_at;

    const response = await fetch(`${supabaseConfig.restUrl}/whatsapp_sessions?id=eq.${id}`, {
      method: 'PATCH',
      headers: getSupabaseHeaders(request, { preferRepresentation: true }),
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      console.error('Error updating whatsapp session:', response.status, response.statusText);
      return NextResponse.json({
        success: false,
        error: 'Error al actualizar sesión de WhatsApp',
        details: response.statusText
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    const updatedSession = Array.isArray(data) ? data[0] : data;

    return NextResponse.json({
      success: true,
      data: updatedSession
    });

  } catch (error) {
    console.error('Unexpected error in PATCH whatsapp_sessions/[id]:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/whatsapp_sessions/[id]
 * Elimina una sesión de WhatsApp
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    
    if (isNaN(id)) {
      return NextResponse.json({
        success: false,
        error: 'ID inválido'
      }, { status: 400 });
    }

    // Verificar que la sesión existe
    const fetchResponse = await fetch(`${supabaseConfig.restUrl}/whatsapp_sessions?id=eq.${id}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!fetchResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al verificar la sesión',
        details: fetchResponse.statusText
      }, { status: fetchResponse.status });
    }

    const existingSessionData = await handleResponse(fetchResponse);
    const existingSession = Array.isArray(existingSessionData) ? existingSessionData[0] : existingSessionData;

    if (!existingSession) {
      return NextResponse.json({
        success: false,
        error: 'Sesión de WhatsApp no encontrada'
      }, { status: 404 });
    }

    const response = await fetch(`${supabaseConfig.restUrl}/whatsapp_sessions?id=eq.${id}`, {
      method: 'DELETE',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      console.error('Error deleting whatsapp session:', response.status, response.statusText);
      return NextResponse.json({
        success: false,
        error: 'Error al eliminar sesión de WhatsApp',
        details: response.statusText
      }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Sesión de WhatsApp eliminada correctamente' }
    });

  } catch (error) {
    console.error('Unexpected error in DELETE whatsapp_sessions/[id]:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

/**
 * Maneja métodos no soportados
 */
export async function PUT() {
  return NextResponse.json({
    success: false,
    error: 'Método no permitido'
  }, { status: 405 });
}

export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'Método no permitido'
  }, { status: 405 });
}
