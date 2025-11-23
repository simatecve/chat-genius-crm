import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { PlantillaMensajeData } from './domain/plantilla_mensaje';
import { handleResponse } from './utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

// POST /api/plantilla_mensajes - Crear plantilla de mensaje
export async function POST(request: NextRequest) {
  try {
    const plantillaData: PlantillaMensajeData = await request.json();
    
    // Validar campos requeridos
    if (!plantillaData.nombre || !plantillaData.contenido || !plantillaData.canal) {
      return NextResponse.json({
        success: false,
        error: 'Los campos nombre, contenido y canal son requeridos'
      }, { status: 400 });
    }

    // Preparar los datos
    const dataToSend = {
      nombre: plantillaData.nombre,
      contenido: plantillaData.contenido,
      canal: plantillaData.canal,
      creado_por: plantillaData.creado_por || null,
      organizacion_id: plantillaData.organizacion_id || null
    };

    const response = await fetch(`${supabaseConfig.restUrl}/plantilla_mensajes`, {
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
    console.error('Error creating plantilla mensaje:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al crear plantilla de mensaje',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// GET /api/plantilla_mensajes - Obtener todas las plantillas de mensajes
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${supabaseConfig.restUrl}/plantilla_mensajes`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener las plantillas de mensajes'
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    
    return NextResponse.json({
      success: true,
      data: Array.isArray(data) ? data : []
    });

  } catch (error) {
    console.error('Error fetching plantillas mensajes:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al obtener plantillas de mensajes',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
