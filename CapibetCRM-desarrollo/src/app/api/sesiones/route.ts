import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { SesionData } from './domain/sesion';
import { handleResponse } from './utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

// POST /api/sesiones - Crear sesión
export async function POST(request: NextRequest) {
  try {
    const sesionData: SesionData = await request.json();
    
    // Preparar los datos con valores por defecto
    const dataToSend = {
      usuario_id: sesionData.usuario_id,
      nombre: sesionData.nombre,
      type: sesionData.type,
      embudo_id: sesionData.embudo_id,
      organizacion_id: sesionData.organizacion_id,
      description: sesionData.description,
      email: sesionData.email,
      given_name: sesionData.given_name,
      picture: sesionData.picture,
      whatsapp_session: sesionData.whatsapp_session,
      estado: sesionData.estado || 'activo'
    };

    const response = await fetch(`${supabaseConfig.restUrl}/sesiones`, {
      method: 'POST',
      headers: getSupabaseHeaders(request, { preferRepresentation: true }),
      body: JSON.stringify(dataToSend)
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
      data
    });

  } catch (error) {
    console.error('Error creating sesion:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al crear sesión',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// GET /api/sesiones - Obtener todas las sesiones con filtros opcionales
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Construir la URL con filtros de Supabase
    let url = `${supabaseConfig.restUrl}/sesiones`;
    const filters = [];
    
    // Procesar filtros de query parameters
    for (const [key, value] of searchParams.entries()) {
      if (key && value) {
        filters.push(`${key}=${value}`);
      }
    }
    
    // Agregar filtros a la URL si existen
    if (filters.length > 0) {
      url += `?${filters.join('&')}`;
    }
    
    console.log('🔍 Buscando sesiones con URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener las sesiones'
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    
    return NextResponse.json({
      success: true,
      data: Array.isArray(data) ? data : []
    });

  } catch (error) {
    console.error('Error fetching sesiones:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al obtener sesiones',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
