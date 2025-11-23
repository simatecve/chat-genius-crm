import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { QRUpdatePayload, WhatsAppApiResponse, QRUpdateData } from '../../types';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

/**
 * Obtiene los headers para Supabase usando serviceRoleKey (webhook del orquestador)
 */
function getHeaders(): HeadersInit {
  return getSupabaseHeaders(null, { preferRepresentation: true });
}

/**
 * Maneja la respuesta de Supabase
 */
async function handleResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;
  
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * POST /api/whatsapp/sessions/qr-update
 * Endpoint llamado por el orquestador cuando se genera un nuevo QR para una sesión
 */
export async function POST(request: NextRequest) {
  try {
    const body: QRUpdatePayload = await request.json();
    
    // Validaciones
    if (!body.session_id) {
      return NextResponse.json({
        success: false,
        error: 'session_id es requerido'
      }, { status: 400 });
    }

    if (!body.qr_code) {
      return NextResponse.json({
        success: false,
        error: 'qr_code es requerido'
      }, { status: 400 });
    }

    // Buscar la sesión existente por session_id
    const findResponse = await fetch(`${supabaseConfig.restUrl}/whatsapp_sessions?session_id=eq.${body.session_id}`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!findResponse.ok) {
      console.error('Error buscando sesión de WhatsApp:', findResponse.status, findResponse.statusText);
      return NextResponse.json({
        success: false,
        error: 'Error al buscar la sesión de WhatsApp',
        details: findResponse.statusText
      }, { status: findResponse.status });
    }

    const existingSessions = await handleResponse(findResponse);
    const existingSession = Array.isArray(existingSessions) ? existingSessions[0] : existingSessions;

    if (!existingSession) {
      return NextResponse.json({
        success: false,
        error: 'Sesión de WhatsApp no encontrada'
      }, { status: 404 });
    }

    // Preparar los datos de actualización
    const updateData = {
      status: 'pending', // Cuando se genera un nuevo QR, la sesión vuelve a pending
      updated_at: new Date().toISOString()
    };

    // Actualizar la sesión en la base de datos
    const updateResponse = await fetch(`${supabaseConfig.restUrl}/whatsapp_sessions?id=eq.${existingSession.id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      console.error('Error actualizando sesión de WhatsApp:', updateResponse.status, updateResponse.statusText);
      return NextResponse.json({
        success: false,
        error: 'Error al actualizar la sesión de WhatsApp',
        details: updateResponse.statusText
      }, { status: updateResponse.status });
    }

    const updatedSession = await handleResponse(updateResponse);
    
    console.log(`[WhatsApp QR Update] QR actualizado para sesión ${body.session_id}`);
    
    // Aquí podrías implementar notificación al frontend via WebSocket o Server-Sent Events
    // Por ejemplo, notificar a todos los clientes conectados que hay un nuevo QR disponible
    
    return NextResponse.json({
      success: true,
      message: 'QR actualizado correctamente',
      data: {
        session: Array.isArray(updatedSession) ? updatedSession[0] : updatedSession,
        qr_code: body.qr_code,
        qr_url: body.qr_url,
        timestamp: body.timestamp
      }
    });

  } catch (error) {
    console.error('Error inesperado en qr-update:', error);
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

export async function DELETE() {
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
