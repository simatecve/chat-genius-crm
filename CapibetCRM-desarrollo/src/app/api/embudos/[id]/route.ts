import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { EmbudoData } from '../domain/embudo';
import { handleResponse } from '../utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

// GET /api/embudos/[id] - Obtener embudo por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID de embudo inválido'
      }, { status: 400 });
    }

    const response = await fetch(`${supabaseConfig.restUrl}/embudos?id=eq.${id}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener el embudo'
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    const embudo = Array.isArray(data) ? data[0] : data;
    
    if (!embudo) {
      return NextResponse.json({
        success: true,
        data: null
      });
    }

    return NextResponse.json({
      success: true,
      data: embudo
    });

  } catch (error) {
    console.error('Error fetching embudo:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al obtener embudo',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// PATCH /api/embudos/[id] - Actualizar embudo
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const embudoData: Partial<EmbudoData> = await request.json();

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID de embudo inválido'
      }, { status: 400 });
    }

    // Filtrar campos undefined para evitar enviar datos innecesarios
    const dataToSend = Object.fromEntries(
      Object.entries(embudoData).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(dataToSend).length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No hay datos para actualizar'
      }, { status: 400 });
    }

    const response = await fetch(`${supabaseConfig.restUrl}/embudos?id=eq.${id}`, {
      method: 'PATCH',
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
    const updatedEmbudo = Array.isArray(data) ? data[0] : data;
    
    return NextResponse.json({
      success: true,
      data: updatedEmbudo
    });

  } catch (error) {
    console.error('Error updating embudo:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al actualizar embudo',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// DELETE /api/embudos/[id] - Eliminar embudo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID de embudo inválido'
      }, { status: 400 });
    }

    const response = await fetch(`${supabaseConfig.restUrl}/embudos?id=eq.${id}`, {
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
    console.error('Error deleting embudo:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al eliminar embudo',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
