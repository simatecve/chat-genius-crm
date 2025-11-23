import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { StatusUpdatePayload, WhatsAppApiResponse } from '../../types';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

/**
 * Obtiene los headers para Supabase
 * NOTA: Este endpoint es llamado por el orquestador, no requiere autenticación de usuario
 * Idealmente debería usar serviceRoleKey, pero como no está configurado, usamos anonKey
 */
function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'apikey': supabaseConfig.anonKey || '',
    'Authorization': `Bearer ${supabaseConfig.anonKey}`,
    'Prefer': 'return=representation'
  };
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
 * POST /api/whatsapp/sessions/status-update
 * Endpoint llamado por el orquestador de WhatsApp cuando una sesión cambia de estado
 */
export async function POST(request: NextRequest) {
  try {
    const body: StatusUpdatePayload = await request.json();

    // Validaciones
    if (!body.session_id) {
      return NextResponse.json({
        success: false,
        error: 'session_id es requerido'
      }, { status: 400 });
    }

    if (!body.status) {
      return NextResponse.json({
        success: false,
        error: 'status es requerido'
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
    const updateData: any = {
      status: body.status,
      updated_at: new Date().toISOString()
    };

    // Agregar campos opcionales si están presentes
    if (body.last_seen) {
      updateData.last_seen = body.last_seen;
    }

    if (body.phone_number) {
      updateData.phone_number = body.phone_number;
    }

    if (body.whatsapp_user_id) {
      updateData.whatsapp_user_id = body.whatsapp_user_id;
    }

    if (body.auth_folder_path) {
      updateData.auth_folder_path = body.auth_folder_path;
    }

    if (body.server_port !== undefined) {
      updateData.server_port = body.server_port;
    }

    // Actualizar la sesión
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

    console.log(`[WhatsApp Status Update] Sesión ${body.session_id} actualizada a estado: ${body.status}`);

    return NextResponse.json({
      success: true,
      message: 'Estado de sesión actualizado correctamente',
      data: Array.isArray(updatedSession) ? updatedSession[0] : updatedSession
    });

  } catch (error) {
    console.error('Error inesperado en status-update:', error);
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
