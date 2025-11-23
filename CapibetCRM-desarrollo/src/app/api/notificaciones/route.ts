import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { NotificacionData, NotificacionResponse } from './domain/notificacion';
import { handleResponse } from './utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

/**
 * GET /api/notificaciones - Obtener notificaciones del usuario autenticado
 * Query params opcionales:
 * - leida: boolean (filtrar por estado de lectura)
 * - tipo: string (filtrar por tipo)
 * - limit: number (limitar resultados)
 * - offset: number (paginación)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Construir query string con filtros
    const filters = [];
    
    // Filtro por estado de lectura
    const leida = searchParams.get('leida');
    if (leida !== null) {
      filters.push(`leida=eq.${leida === 'true'}`);
    }
    
    // Filtro por tipo
    const tipo = searchParams.get('tipo');
    if (tipo) {
      filters.push(`tipo=eq.${tipo}`);
    }
    
    // Filtro por archivada (por defecto solo las no archivadas)
    const incluirArchivadas = searchParams.get('incluir_archivadas');
    if (incluirArchivadas !== 'true') {
      filters.push('archivada_en=is.null');
    }
    
    // Ordenamiento (por defecto: más recientes primero)
    const orden = searchParams.get('orden') || 'creado_en.desc';
    
    // Límite de resultados
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    
    // Construir URL con filtros
    let queryString = filters.length > 0 ? `?${filters.join('&')}` : '';
    queryString += `${queryString ? '&' : '?'}order=${orden}`;
    
    if (limit) {
      queryString += `&limit=${limit}`;
    }
    if (offset) {
      queryString += `&offset=${offset}`;
    }
    
    const response = await fetch(
      `${supabaseConfig.restUrl}/notificaciones${queryString}`,
      {
        method: 'GET',
        headers: getSupabaseHeaders(request)
      }
    );

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener las notificaciones'
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    
    return NextResponse.json({
      success: true,
      data: Array.isArray(data) ? data : []
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al obtener notificaciones',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

/**
 * POST /api/notificaciones - Crear nueva notificación
 */
export async function POST(request: NextRequest) {
  try {
    const notificacionData: NotificacionData = await request.json();
    
    // Validaciones básicas
    if (!notificacionData.usuario_id) {
      return NextResponse.json({
        success: false,
        error: 'usuario_id es requerido'
      }, { status: 400 });
    }
    
    if (!notificacionData.titulo || !notificacionData.mensaje) {
      return NextResponse.json({
        success: false,
        error: 'titulo y mensaje son requeridos'
      }, { status: 400 });
    }
    
    // Preparar datos para inserción
    const dataToInsert = {
      usuario_id: notificacionData.usuario_id,
      titulo: notificacionData.titulo,
      mensaje: notificacionData.mensaje,
      tipo: notificacionData.tipo || 'info',
      prioridad: notificacionData.prioridad || 3,
      accion_url: notificacionData.accion_url || null,
      data: notificacionData.data || null,
      leida: false,
      enviada_push: notificacionData.enviar_push || false,
      enviada_email: notificacionData.enviar_email || false,
      creado_en: new Date().toISOString()
    };
    
    const response = await fetch(`${supabaseConfig.restUrl}/notificaciones`, {
      method: 'POST',
      headers: getSupabaseHeaders(request, { preferRepresentation: true }),
      body: JSON.stringify(dataToInsert)
    });

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
      data: data as unknown as NotificacionResponse
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

/**
 * PATCH /api/notificaciones - Actualizar notificación existente
 */
export async function PATCH(request: NextRequest) {
  try {
    const { id, ...notificacionData } = await request.json();
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID de la notificación es requerido'
      }, { status: 400 });
    }

    const response = await fetch(
      `${supabaseConfig.restUrl}/notificaciones?id=eq.${id}`,
      {
        method: 'PATCH',
        headers: getSupabaseHeaders(request, { preferRepresentation: true }),
        body: JSON.stringify(notificacionData),
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
      data: data as unknown as NotificacionResponse
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar notificación'
    }, { status: 500 });
  }
}

