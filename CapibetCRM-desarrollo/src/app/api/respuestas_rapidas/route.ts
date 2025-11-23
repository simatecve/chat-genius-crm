import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { RespuestaRapidaFormData } from './domain/respuesta_rapida';
import { handleResponse } from './utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

// POST /api/respuestas-rapidas - Crear respuesta rápida
export async function POST(request: NextRequest) {
  try {
    const respuestaData: RespuestaRapidaFormData = await request.json();
    
    // Validar datos requeridos
    if (!respuestaData.titulo || !respuestaData.contenido) {
      return NextResponse.json({
        success: false,
        error: 'Título y contenido son campos requeridos'
      }, { status: 400 });
    }
    
    // Preparar los datos con valores por defecto
    const dataToSend = {
      titulo: respuestaData.titulo,
      contenido: respuestaData.contenido,
      categoria: respuestaData.categoria || 'General',
      activa: true
    };

    const response = await fetch(`${supabaseConfig.restUrl}/respuestas_rapidas`, {
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
    console.error('Error creating respuesta rapida:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al crear respuesta rápida',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// GET /api/respuestas-rapidas - Obtener todas las respuestas rápidas
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${supabaseConfig.restUrl}/respuestas_rapidas?order=created_at.desc`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener las respuestas rápidas'
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    
    return NextResponse.json({
      success: true,
      data: Array.isArray(data) ? data : []
    });

  } catch (error) {
    console.error('Error fetching respuestas rapidas:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al obtener respuestas rápidas',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
