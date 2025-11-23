import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { PlantillaMensajeData, PlantillaMensajeResponse } from '../domain/plantilla_mensaje';
import { handleResponse } from '../utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

// GET /api/plantilla_mensajes/[id] - Obtener plantilla de mensaje por ID
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
        error: 'ID de plantilla de mensaje inválido (debe ser un UUID)'
      }, { status: 400 });
    }

    const response = await fetch(`${supabaseConfig.restUrl}/plantilla_mensajes?id=eq.${id}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener la plantilla de mensaje'
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    
    return NextResponse.json({
      success: true,
      data: Array.isArray(data) ? data[0] : null
    });

  } catch (error) {
    console.error('Error fetching plantilla mensaje:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al obtener plantilla de mensaje',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// PATCH /api/plantilla_mensajes/[id] - Actualizar plantilla de mensaje
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
        error: 'ID de plantilla de mensaje inválido (debe ser un UUID)'
      }, { status: 400 });
    }

    const plantillaData: Partial<PlantillaMensajeData> = await request.json();

    // Preparar solo los campos permitidos para actualizar
    const allowedFields: Partial<PlantillaMensajeData> = {};
    if (plantillaData.nombre !== undefined) allowedFields.nombre = plantillaData.nombre;
    if (plantillaData.contenido !== undefined) allowedFields.contenido = plantillaData.contenido;
    if (plantillaData.canal !== undefined) allowedFields.canal = plantillaData.canal;
    if (plantillaData.creado_por !== undefined) allowedFields.creado_por = plantillaData.creado_por;
    if (plantillaData.organizacion_id !== undefined) allowedFields.organizacion_id = plantillaData.organizacion_id;

    const response = await fetch(`${supabaseConfig.restUrl}/plantilla_mensajes?id=eq.${id}`, {
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
      data: data as unknown as PlantillaMensajeResponse
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar plantilla de mensaje'
    }, { status: 500 });
  }
}

// DELETE /api/plantilla_mensajes/[id] - Eliminar plantilla de mensaje
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
        error: 'ID de plantilla de mensaje inválido (debe ser un UUID)'
      }, { status: 400 });
    }

    const response = await fetch(`${supabaseConfig.restUrl}/plantilla_mensajes?id=eq.${id}`, {
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
      error: error instanceof Error ? error.message : 'Error al eliminar plantilla de mensaje'
    }, { status: 500 });
  }
}
