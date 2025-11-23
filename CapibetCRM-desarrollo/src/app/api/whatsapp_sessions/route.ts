import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import {
  WhatsAppSessionData,
  WhatsAppSessionResponse,
  CreateWhatsAppSessionData
} from './domain/whatsapp_session';
import { handleResponse } from './utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

/**
 * GET /api/whatsapp_sessions
 * Obtiene todas las sesiones de WhatsApp
 */
export async function GET(request: NextRequest) {
  try {
    // Extraer query parameters de la URL
    const { searchParams } = new URL(request.url);

    // Construir query string para Supabase
    let queryString = 'order=created_at.desc';

    // Pasar todos los query parameters a Supabase
    searchParams.forEach((value, key) => {
      queryString += `&${key}=${encodeURIComponent(value)}`;
    });

    const response = await fetch(`${supabaseConfig.restUrl}/whatsapp_sessions?${queryString}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      console.error('Error fetching whatsapp sessions:', response.status, response.statusText);
      return NextResponse.json({
        success: false,
        error: 'Error al obtener sesiones de WhatsApp',
        details: response.statusText
      }, { status: response.status });
    }

    const data = await handleResponse(response);

    return NextResponse.json({
      success: true,
      data: Array.isArray(data) ? data : []
    });

  } catch (error) {
    console.error('Unexpected error in GET whatsapp_sessions:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp_sessions
 * Crea una nueva sesión de WhatsApp (estado pending)
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateWhatsAppSessionData = await request.json();

    // Validaciones
    if (!body.session_id) {
      return NextResponse.json({
        success: false,
        error: 'session_id es requerido'
      }, { status: 400 });
    }

    if (!body.sesion_id) {
      return NextResponse.json({
        success: false,
        error: 'sesion_id es requerido'
      }, { status: 400 });
    }

    // Verificar que la sesión existe
    const sesionResponse = await fetch(`${supabaseConfig.restUrl}/sesiones?id=eq.${body.sesion_id}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!sesionResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al verificar la sesión',
        details: sesionResponse.statusText
      }, { status: sesionResponse.status });
    }

    const sesionData = await handleResponse(sesionResponse);
    const sesionExists = Array.isArray(sesionData) ? sesionData[0] : sesionData;

    if (!sesionExists) {
      return NextResponse.json({
        success: false,
        error: 'La sesión especificada no existe'
      }, { status: 400 });
    }

    // Verificar que no existe ya una whatsapp_session con este session_id
    const existingSessionResponse = await fetch(`${supabaseConfig.restUrl}/whatsapp_sessions?session_id=eq.${body.session_id}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (existingSessionResponse.ok) {
      const existingSessionData = await handleResponse(existingSessionResponse);
      const existingSession = Array.isArray(existingSessionData) ? existingSessionData[0] : existingSessionData;

      if (existingSession) {
        return NextResponse.json({
          success: false,
          error: 'Ya existe una sesión de WhatsApp con este session_id'
        }, { status: 400 });
      }
    }

    // Crear la nueva sesión de WhatsApp
    const newSession: WhatsAppSessionData = {
      session_id: body.session_id,
      sesion_id: body.sesion_id,
      phone_number: '', // Campo requerido, inicializar vacío
      status: 'pending',
      last_seen: new Date().toISOString(), // Campo requerido, usar timestamp actual
      auth_folder_path: '', // Campo requerido, inicializar vacío
      whatsapp_user_id: '', // Campo requerido, inicializar vacío
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const response = await fetch(`${supabaseConfig.restUrl}/whatsapp_sessions`, {
      method: 'POST',
      headers: getSupabaseHeaders(request, { preferRepresentation: true }),
      body: JSON.stringify(newSession)
    });

    if (!response.ok) {
      console.error('Error creating whatsapp session:', response.status, response.statusText);
      return NextResponse.json({
        success: false,
        error: 'Error al crear sesión de WhatsApp',
        details: response.statusText
      }, { status: response.status });
    }

    const data = await handleResponse(response);

    return NextResponse.json({
      success: true,
      data: Array.isArray(data) ? data[0] : data
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in POST whatsapp_sessions:', error);
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
