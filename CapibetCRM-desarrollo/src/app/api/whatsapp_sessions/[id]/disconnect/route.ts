import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { whatsAppApiService } from '@/config/whatsapp_api';
import { handleResponse } from '../../utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

/**
 * POST /api/whatsapp_sessions/[id]/disconnect
 * Desconecta una sesión de WhatsApp QR enviando petición al orquestador
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json({
        success: false,
        error: 'ID inválido'
      }, { status: 400 });
    }

    // Obtener la sesión de WhatsApp para verificar que existe y obtener el session_id
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

    // Verificar que la sesión esté conectada
    if (existingSession.status !== 'connected') {
      return NextResponse.json({
        success: false,
        error: 'La sesión no está conectada',
        details: `Estado actual: ${existingSession.status}`
      }, { status: 400 });
    }

    // Verificar que tenga session_id del orquestador
    if (!existingSession.session_id) {
      return NextResponse.json({
        success: false,
        error: 'La sesión no tiene session_id del orquestador'
      }, { status: 400 });
    }

    try {
      // Enviar petición de desconexión al orquestador
      const disconnectResult = await whatsAppApiService.disconnectSession(existingSession.session_id);
      
      if (!disconnectResult.success) {
        return NextResponse.json({
          success: false,
          error: 'Error al desconectar sesión en el orquestador',
          details: disconnectResult.message
        }, { status: 500 });
      }

      // Actualizar el estado de la sesión en la base de datos
      const updateResponse = await fetch(`${supabaseConfig.restUrl}/whatsapp_sessions?id=eq.${id}`, {
        method: 'PATCH',
        headers: getSupabaseHeaders(request, { preferRepresentation: true }),
        body: JSON.stringify({
          status: 'disconnected',
          updated_at: new Date().toISOString()
        })
      });

      if (!updateResponse.ok) {
        console.error('Error updating session status after disconnect:', updateResponse.status, updateResponse.statusText);
        // Aunque falló la actualización en BD, la desconexión en el orquestador fue exitosa
        return NextResponse.json({
          success: true,
          message: 'Sesión desconectada exitosamente en el orquestador, pero hubo un error al actualizar el estado en la base de datos',
          data: {
            session_id: existingSession.session_id,
            orchestrator_disconnect: disconnectResult
          }
        });
      }

      const updatedSessionData = await handleResponse(updateResponse);
      const updatedSession = Array.isArray(updatedSessionData) ? updatedSessionData[0] : updatedSessionData;

      return NextResponse.json({
        success: true,
        message: 'Sesión desconectada exitosamente',
        data: {
          session_id: existingSession.session_id,
          orchestrator_disconnect: disconnectResult,
          updated_session: updatedSession
        }
      });

    } catch (orchestratorError) {
      console.error('Error communicating with orchestrator:', orchestratorError);
      
      return NextResponse.json({
        success: false,
        error: 'Error al comunicarse con el orquestador de WhatsApp',
        details: orchestratorError instanceof Error ? orchestratorError.message : 'Error desconocido del orquestador'
      }, { status: 502 });
    }

  } catch (error) {
    console.error('Unexpected error in POST whatsapp_sessions/[id]/disconnect:', error);
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
export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'Método no permitido'
  }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({
    success: false,
    error: 'Método no permitido'
  }, { status: 405 });
}

export async function PATCH() {
  return NextResponse.json({
    success: false,
    error: 'Método no permitido'
  }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({
    success: false,
    error: 'Método no permitido'
  }, { status: 405 });
}
