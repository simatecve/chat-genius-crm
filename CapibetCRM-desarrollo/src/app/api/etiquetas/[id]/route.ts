import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { EtiquetaData, EtiquetaResponse } from '../domain/etiqueta';
import { handleResponse } from '../utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

// GET /api/etiquetas/[id] - Obtener etiqueta por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'ID de etiqueta inválido'
      }, { status: 400 });
    }

    const response = await fetch(`${supabaseConfig.restUrl}/etiquetas?id=eq.${id}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener la etiqueta'
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    
    return NextResponse.json({
      success: true,
      data: Array.isArray(data) ? data[0] : null
    });

  } catch (error) {
    console.error('Error fetching etiqueta:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al obtener etiqueta',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// PATCH /api/etiquetas/[id] - Actualizar etiqueta
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'ID de etiqueta inválido'
      }, { status: 400 });
    }

    const etiquetaData: Partial<EtiquetaData> = await request.json();

    // Filtrar campos que no deben ser modificados en una actualización
    const { creado_por, organizacion_id, ...dataToUpdate } = etiquetaData;

    const response = await fetch(`${supabaseConfig.restUrl}/etiquetas?id=eq.${id}`, {
      method: 'PATCH',
      headers: getSupabaseHeaders(request, { preferRepresentation: true }),
      body: JSON.stringify(dataToUpdate),
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
      data: data as unknown as EtiquetaResponse
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar etiqueta'
    }, { status: 500 });
  }
}

// DELETE /api/etiquetas/[id] - Eliminar etiqueta
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'ID de etiqueta inválido'
      }, { status: 400 });
    }

    const response = await fetch(`${supabaseConfig.restUrl}/etiquetas?id=eq.${id}`, {
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
      error: error instanceof Error ? error.message : 'Error al eliminar etiqueta'
    }, { status: 500 });
  }
}
