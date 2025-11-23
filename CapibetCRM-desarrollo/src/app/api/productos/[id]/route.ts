import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { ProductResponse } from '../domain/producto';
import { handleResponse } from '../utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

// GET /api/productos/[id] - Obtener producto por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID de producto inválido'
      }, { status: 400 });
    }

    const response = await fetch(`${supabaseConfig.restUrl}/productos?id=eq.${id}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener el producto'
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    
    return NextResponse.json({
      success: true,
      data: data as unknown as ProductResponse
    });

  } catch (error) {
    console.error('Error fetching product:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al obtener producto',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// DELETE /api/productos/[id] - Eliminar producto
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID de producto inválido'
      }, { status: 400 });
    }

    const response = await fetch(`${supabaseConfig.restUrl}/productos?id=eq.${id}`, {
      method: 'DELETE',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al eliminar el producto'
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    
    return NextResponse.json({
      success: true,
      data: data,
      message: 'Producto eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error deleting product:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al eliminar producto',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}