import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { MensajeData, MensajeResponse } from '../domain/mensaje';
import { handleResponse } from '../utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

// GET /api/mensajes/[id] - Obtener mensaje por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID de mensaje inválido'
      }, { status: 400 });
    }

    const response = await fetch(`${supabaseConfig.restUrl}/mensajes?id=eq.${id}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener el mensaje'
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    
    return NextResponse.json({
      success: true,
      data: Array.isArray(data) ? data[0] : null
    });

  } catch (error) {
    console.error('Error fetching message:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al obtener mensaje',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// PATCH /api/mensajes/[id] - Actualizar mensaje
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID de mensaje inválido'
      }, { status: 400 });
    }

    const mensajeData: Partial<MensajeData> = await request.json();

    const response = await fetch(`${supabaseConfig.restUrl}/mensajes?id=eq.${id}`, {
      method: 'PATCH',
      headers: getSupabaseHeaders(request, { preferRepresentation: true }),
      body: JSON.stringify(mensajeData),
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
      data: data as unknown as MensajeResponse
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar mensaje'
    }, { status: 500 });
  }
}

// DELETE /api/mensajes/[id] - Eliminar mensaje
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID de mensaje inválido'
      }, { status: 400 });
    }

    const response = await fetch(`${supabaseConfig.restUrl}/mensajes?id=eq.${id}`, {
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
      error: error instanceof Error ? error.message : 'Error al eliminar mensaje'
    }, { status: 500 });
  }
}
