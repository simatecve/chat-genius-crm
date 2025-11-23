import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { EtiquetaData } from './domain/etiqueta';
import { handleResponse } from './utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

// POST /api/etiquetas - Crear etiqueta
export async function POST(request: NextRequest) {
  try {
    const etiquetaData: EtiquetaData = await request.json();
    
    // Validar campos requeridos
    if (!etiquetaData.nombre || !etiquetaData.color || !etiquetaData.organizacion_id || !etiquetaData.creado_por) {
      return NextResponse.json({
        success: false,
        error: 'Faltan campos requeridos'
      }, { status: 400 });
    }

    // Preparar los datos
    const dataToSend: Record<string, unknown> = {
      nombre: etiquetaData.nombre,
      color: etiquetaData.color,
      descripcion: etiquetaData.descripcion,
      organizacion_id: etiquetaData.organizacion_id,
      creado_por: etiquetaData.creado_por
    };

    const response = await fetch(`${supabaseConfig.restUrl}/etiquetas`, {
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
    console.error('Error creating etiqueta:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al crear etiqueta',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// GET /api/etiquetas - Obtener todas las etiquetas
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${supabaseConfig.restUrl}/etiquetas`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener las etiquetas'
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    
    return NextResponse.json({
      success: true,
      data: Array.isArray(data) ? data : []
    });

  } catch (error) {
    console.error('Error fetching etiquetas:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al obtener etiquetas',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
