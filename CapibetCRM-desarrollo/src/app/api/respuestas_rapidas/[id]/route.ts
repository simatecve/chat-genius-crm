import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { RespuestaRapidaData, RespuestaRapidaResponse } from '../domain/respuesta_rapida';
import { handleResponse } from '../utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

// GET /api/respuestas-rapidas/[id] - Obtener respuesta rápida por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID de respuesta rápida requerido'
      }, { status: 400 });
    }

    const response = await fetch(`${supabaseConfig.restUrl}/respuestas_rapidas?id=eq.${id}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener la respuesta rápida'
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    
    return NextResponse.json({
      success: true,
      data: Array.isArray(data) ? data[0] : null
    });

  } catch (error) {
    console.error('Error fetching respuesta rapida:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al obtener respuesta rápida',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// PATCH /api/respuestas-rapidas/[id] - Actualizar respuesta rápida
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID de respuesta rápida requerido'
      }, { status: 400 });
    }

    const respuestaData: Partial<RespuestaRapidaData> = await request.json();

    const response = await fetch(`${supabaseConfig.restUrl}/respuestas_rapidas?id=eq.${id}`, {
      method: 'PATCH',
      headers: getSupabaseHeaders(request, { preferRepresentation: true }),
      body: JSON.stringify(respuestaData),
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
      data: data as unknown as RespuestaRapidaResponse
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar respuesta rápida'
    }, { status: 500 });
  }
}

// DELETE /api/respuestas-rapidas/[id] - Eliminar respuesta rápida
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID de respuesta rápida requerido'
      }, { status: 400 });
    }

    const response = await fetch(`${supabaseConfig.restUrl}/respuestas_rapidas?id=eq.${id}`, {
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
      error: error instanceof Error ? error.message : 'Error al eliminar respuesta rápida'
    }, { status: 500 });
  }
}
