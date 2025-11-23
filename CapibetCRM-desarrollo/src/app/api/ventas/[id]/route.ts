import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { VentaResponse } from '../domain/venta';
import { handleResponse } from '../utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

// GET /api/ventas/[id] - Obtener una venta específica por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID de la venta es requerido'
      }, { status: 400 });
    }

    const response = await fetch(`${supabaseConfig.restUrl}/ventas?id=eq.${id}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener la venta'
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    
    // Verificar si se encontró la venta
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Venta no encontrada'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: data[0] as VentaResponse
    });

  } catch (error) {
    console.error('Error fetching sale:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al obtener venta',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// PATCH /api/ventas/[id] - Actualizar una venta específica por ID
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ventaData = await request.json();
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID de la venta es requerido'
      }, { status: 400 });
    }

    const response = await fetch(`${supabaseConfig.restUrl}/ventas?id=eq.${id}`, {
      method: 'PATCH',
      headers: getSupabaseHeaders(request, { preferRepresentation: true }),
      body: JSON.stringify(ventaData),
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
      data: data as unknown as VentaResponse
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar venta'
    }, { status: 500 });
  }
}

// DELETE /api/ventas/[id] - Eliminar una venta específica por ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID de la venta es requerido'
      }, { status: 400 });
    }

    // Verificar si la venta existe
    const ventaResponse = await fetch(`${supabaseConfig.restUrl}/ventas?id=eq.${id}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!ventaResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al verificar la existencia de la venta'
      }, { status: ventaResponse.status });
    }

    const ventaData = await handleResponse(ventaResponse);
    
    if (!Array.isArray(ventaData) || ventaData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Venta no encontrada'
      }, { status: 404 });
    }

    // Eliminar la venta
    const response = await fetch(`${supabaseConfig.restUrl}/ventas?id=eq.${id}`, {
      method: 'DELETE',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json({
        success: false,
        error: `Error del servidor al eliminar venta: ${response.status} ${response.statusText}`,
        details: errorData
      }, { status: response.status });
    }

    await handleResponse(response);
    
    return NextResponse.json({
      success: true,
      data: {
        message: 'Venta eliminada exitosamente',
        ventaEliminada: id
      }
    });
  } catch (error) {
    console.error('Error deleting sale:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar venta',
      details: error instanceof Error ? error.stack : 'Error desconocido'
    }, { status: 500 });
  }
}