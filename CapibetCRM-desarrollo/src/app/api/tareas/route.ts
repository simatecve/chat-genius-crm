import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { TareaData } from './domain/tarea';
import { handleResponse } from './utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

// POST /api/tareas - Crear tarea
export async function POST(request: NextRequest) {
  try {
    const tareaData: TareaData = await request.json();
    
    // Validar campos requeridos
    if (!tareaData.titulo) {
      return NextResponse.json({
        success: false,
        error: 'El campo titulo es requerido'
      }, { status: 400 });
    }

    // Preparar los datos
    const dataToSend = {
      titulo: tareaData.titulo,
      descripcion: tareaData.descripcion || null,
      prioridad: tareaData.prioridad || null,
      categoria: tareaData.categoria || null,
      fecha: tareaData.fecha || null,
      creado_por: tareaData.creado_por || null,
      asignado: tareaData.asignado || null,
      organizacion_id: tareaData.organizacion_id || null
    };

    const response = await fetch(`${supabaseConfig.restUrl}/tareas`, {
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
    console.error('Error creating task:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al crear tarea',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// GET /api/tareas - Obtener todas las tareas
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${supabaseConfig.restUrl}/tareas`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener las tareas'
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    
    return NextResponse.json({
      success: true,
      data: Array.isArray(data) ? data : []
    });

  } catch (error) {
    console.error('Error fetching tasks:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al obtener tareas',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
