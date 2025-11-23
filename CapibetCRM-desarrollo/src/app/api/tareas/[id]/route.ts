import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { TareaData, TareaResponse } from '../domain/tarea';
import { handleResponse } from '../utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

// GET /api/tareas/[id] - Obtener tarea por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return NextResponse.json({
        success: false,
        error: 'ID de tarea inválido (debe ser un UUID)'
      }, { status: 400 });
    }

    const response = await fetch(`${supabaseConfig.restUrl}/tareas?id=eq.${id}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener la tarea'
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    
    return NextResponse.json({
      success: true,
      data: Array.isArray(data) ? data[0] : null
    });

  } catch (error) {
    console.error('Error fetching task:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al obtener tarea',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// PATCH /api/tareas/[id] - Actualizar tarea
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return NextResponse.json({
        success: false,
        error: 'ID de tarea inválido (debe ser un UUID)'
      }, { status: 400 });
    }

    const tareaData: Partial<TareaData> = await request.json();

    // Preparar solo los campos permitidos para actualizar
    const allowedFields: Partial<TareaData> = {};
    if (tareaData.titulo !== undefined) allowedFields.titulo = tareaData.titulo;
    if (tareaData.descripcion !== undefined) allowedFields.descripcion = tareaData.descripcion;
    if (tareaData.prioridad !== undefined) allowedFields.prioridad = tareaData.prioridad;
    if (tareaData.categoria !== undefined) allowedFields.categoria = tareaData.categoria;
    if (tareaData.fecha !== undefined) allowedFields.fecha = tareaData.fecha;
    if (tareaData.asignado !== undefined) allowedFields.asignado = tareaData.asignado;

    const response = await fetch(`${supabaseConfig.restUrl}/tareas?id=eq.${id}`, {
      method: 'PATCH',
      headers: getSupabaseHeaders(request, { preferRepresentation: true }),
      body: JSON.stringify(allowedFields),
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
      data: data as unknown as TareaResponse
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar tarea'
    }, { status: 500 });
  }
}

// DELETE /api/tareas/[id] - Eliminar tarea
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return NextResponse.json({
        success: false,
        error: 'ID de tarea inválido (debe ser un UUID)'
      }, { status: 400 });
    }

    const response = await fetch(`${supabaseConfig.restUrl}/tareas?id=eq.${id}`, {
      method: 'DELETE',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json({
        success: false,
        error: `Error del servidor: ${response.status} ${response.statusText}`,
        details: errorData
      }, { status: response.status });
    }

    await handleResponse(response);
    
    return NextResponse.json({
      success: true,
      data: undefined
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar tarea'
    }, { status: 500 });
  }
}
