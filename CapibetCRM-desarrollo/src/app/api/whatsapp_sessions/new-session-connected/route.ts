import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { supabaseConfig } from '@/config/supabase';
import {
  NewSessionConnectedData,
  UpdateWhatsAppSessionData
} from '../domain/whatsapp_session';
import { handleResponse } from '../utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

// Directorio temporal para archivos JSON
const TEMP_DIR = path.join(process.cwd(), 'temp-sessions');

/**
 * POST /api/whatsapp_sessions/new-session-connected
 * Endpoint que recibe las notificaciones del orquestador cuando se conecta una nueva sesión
 */
export async function POST(request: NextRequest) {
  try {
    const body: NewSessionConnectedData = await request.json();

    console.log('📱 Nueva sesión de WhatsApp conectada:', body);

    // Validaciones
    if (!body.session_id) {
      return NextResponse.json({
        success: false,
        error: 'session_id es requerido'
      }, { status: 400 });
    }

    if (!body.phone_number) {
      return NextResponse.json({
        success: false,
        error: 'phone_number es requerido'
      }, { status: 400 });
    }

    if (!body.whatsapp_user_id) {
      return NextResponse.json({
        success: false,
        error: 'whatsapp_user_id es requerido'
      }, { status: 400 });
    }

    // Leer los datos temporales del archivo JSON para obtener el access_token
    const filePath = path.join(TEMP_DIR, `${body.session_id}.json`);
    let tempData = null;
    let userAccessToken = null;

    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(fileContent);
      tempData = data;
      userAccessToken = data.access_token;
    } catch {
      console.error('Temp data not found for session_id:', body.session_id);
      return NextResponse.json({
        success: false,
        error: 'Datos temporales de sesión no encontrados',
        details: `Los datos del formulario para session_id ${body.session_id} no fueron encontrados o expiraron. Reintenta el proceso de vinculación.`
      }, { status: 404 });
    }

    // Usar el access_token del usuario para las peticiones
    const headers = {
      'Content-Type': 'application/json',
      'apikey': supabaseConfig.anonKey || '',
      'Authorization': `Bearer ${userAccessToken}`,
      'Prefer': 'return=representation'
    };

    // Buscar si ya existe una whatsapp_session con este session_id
    const fetchResponse = await fetch(`${supabaseConfig.restUrl}/whatsapp_sessions?session_id=eq.${body.session_id}`, {
      method: 'GET',
      headers
    });

    let whatsappSession = null;
    let sesionId = null;

    if (fetchResponse.ok) {
      const whatsappSessions = await handleResponse(fetchResponse);
      whatsappSession = Array.isArray(whatsappSessions) ? whatsappSessions[0] : null;

      if (whatsappSession) {
        sesionId = whatsappSession.sesion_id;
        console.log('✅ WhatsApp session encontrada existente:', whatsappSession.id);
      }
    }

    // Si no encontramos la whatsapp_session, necesitamos crearla junto con la sesión principal
    if (!whatsappSession) {
      console.log('🔧 No se encontró WhatsApp session existente, creando nueva...');

      // Primero crear la whatsapp_session con los datos del body
      const whatsappSessionData = {
        session_id: body.session_id,
        phone_number: body.phone_number || '',
        status: 'connected',
        last_seen: body.last_seen || new Date().toISOString(),
        auth_folder_path: body.auth_folder_path || '',
        whatsapp_user_id: body.whatsapp_user_id || '',
        created_at: body.created_at || new Date().toISOString(),
        updated_at: body.updated_at || new Date().toISOString()
      };

      const createWhatsAppSessionResponse = await fetch(`${supabaseConfig.restUrl}/whatsapp_sessions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(whatsappSessionData)
      });

      if (!createWhatsAppSessionResponse.ok) {
        console.error('Error creating whatsapp_session:', createWhatsAppSessionResponse.status, createWhatsAppSessionResponse.statusText);
        console.log(await createWhatsAppSessionResponse.json());

        return NextResponse.json({
          success: false,
          error: 'Error al crear WhatsApp session',
          details: `Could not create whatsapp_session for session_id: ${body.session_id}`
        }, { status: 500 });
      }

      const createdWhatsAppSessions = await handleResponse(createWhatsAppSessionResponse);
      console.log('✅ Nueva WhatsApp session creada:', createdWhatsAppSessions);

      // Hacer una consulta adicional para obtener el registro completo con el ID generado
      const fetchNewSessionResponse = await fetch(`${supabaseConfig.restUrl}/whatsapp_sessions?session_id=eq.${body.session_id}`, {
        method: 'GET',
        headers
      });

      if (!fetchNewSessionResponse.ok) {
        console.error('Error fetching new whatsapp_session:', fetchNewSessionResponse.status, fetchNewSessionResponse.statusText);
        return NextResponse.json({
          success: false,
          error: 'Error al obtener la nueva sesión de WhatsApp',
          details: `Could not fetch created whatsapp_session for session_id: ${body.session_id}`
        }, { status: 500 });
      }

      const newWhatsAppSessions = await handleResponse(fetchNewSessionResponse);
      const newWhatsAppSession = Array.isArray(newWhatsAppSessions) ? newWhatsAppSessions[0] : newWhatsAppSessions;

      if (!newWhatsAppSession || !newWhatsAppSession.id) {
        console.error('No se pudo obtener el ID de la nueva whatsapp_session');
        return NextResponse.json({
          success: false,
          error: 'Error al obtener ID de la nueva sesión de WhatsApp',
          details: `Created whatsapp_session not found for session_id: ${body.session_id}`
        }, { status: 500 });
      }

      // Ahora crear la sesión principal usando el ID de la whatsapp_session
      const newSesionData = {
        nombre: tempData.nombre,
        description: tempData.descripcion,
        embudo_id: tempData.embudo_id,
        type: tempData.type,
        estado: 'activo',
        whatsapp_session: newWhatsAppSession.id,
        usuario_id: tempData.usuario_id,
        organizacion_id: tempData.organizacion_id,
        creado_por: tempData.creado_por,
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString()
      };

      const createSesionResponse = await fetch(`${supabaseConfig.restUrl}/sesiones`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newSesionData)
      });

      if (!createSesionResponse.ok) {
        console.error('Error creating new sesion:', createSesionResponse.status, createSesionResponse.statusText);
        console.log(createSesionResponse);
        return NextResponse.json({
          success: false,
          error: 'Error al crear nueva sesión',
          details: `Could not create sesion for session_id: ${body.session_id}`
        }, { status: 500 });
      }

      console.log('✅ Nueva sesión principal creada');

      // Limpiar archivo temporal
      try {
        await fs.unlink(filePath);
        console.log('🗑️ Archivo temporal eliminado');
      } catch {
        // Ignorar si el archivo ya no existe
      }

    } else {
      // Si la whatsapp_session ya existe, actualizarla con los nuevos datos de conexión
      console.log('🔄 Actualizando WhatsApp session existente...');

      const updateData: UpdateWhatsAppSessionData = {
        status: 'connected',
        updated_at: new Date().toISOString(),
      };

      // Solo actualizar campos que vienen en el body
      if (body.phone_number !== undefined) {
        updateData.phone_number = body.phone_number;
      }
      if (body.last_seen !== undefined) {
        updateData.last_seen = body.last_seen;
      }
      if (body.auth_folder_path !== undefined) {
        updateData.auth_folder_path = body.auth_folder_path;
      }
      if (body.whatsapp_user_id !== undefined) {
        updateData.whatsapp_user_id = body.whatsapp_user_id;
      }

      const updateResponse = await fetch(`${supabaseConfig.restUrl}/whatsapp_sessions?session_id=eq.${body.session_id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updateData)
      });

      if (!updateResponse.ok) {
        console.error('Error updating whatsapp session:', updateResponse.status, updateResponse.statusText);
        return NextResponse.json({
          success: false,
          error: 'Error al actualizar sesión de WhatsApp',
          details: updateResponse.statusText
        }, { status: 500 });
      }

      const updatedSessions = await handleResponse(updateResponse);
      whatsappSession = Array.isArray(updatedSessions) ? updatedSessions[0] : updatedSessions;

      // Actualizar el estado de la sesión principal a 'activo'
      const sesionUpdateResponse = await fetch(`${supabaseConfig.restUrl}/sesiones?id=eq.${sesionId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          estado: 'activo',
          actualizado_en: new Date().toISOString()
        })
      });

      if (!sesionUpdateResponse.ok) {
        console.error('Error updating sesion status:', sesionUpdateResponse.status, sesionUpdateResponse.statusText);
      }
    }

    console.log('✅ Sesión de WhatsApp procesada exitosamente:', whatsappSession);

    // TODO: Aquí deberíamos notificar al frontend que la conexión fue exitosa
    // Esto podría ser via WebSocket, Server-Sent Events, o algún mecanismo de notificación

    return NextResponse.json({
      success: true,
      data: {
        message: 'Sesión de WhatsApp conectada exitosamente'
      }
    });

  } catch (error) {
    console.error('Unexpected error in POST new-session-connected:', error);
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
