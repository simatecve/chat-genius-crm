import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { EmbudoData } from './domain/embudo';
import { handleResponse } from './utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

// POST /api/embudos - Crear embudo
export async function POST(request: NextRequest) {
  try {
    const embudoData: EmbudoData = await request.json();
    
    // Validar datos requeridos
    if (!embudoData.nombre || !embudoData.creado_por || !embudoData.espacio_id) {
      return NextResponse.json({
        success: false,
        error: 'Faltan campos requeridos: nombre, creado_por, espacio_id'
      }, { status: 400 });
    }

    // Preparar los datos con valores por defecto
    const dataToSend = {
      nombre: embudoData.nombre,
      descripcion: embudoData.descripcion || null,
      creado_por: embudoData.creado_por,
      espacio_id: embudoData.espacio_id,
      orden: embudoData.orden || 0
    };

    const response = await fetch(`${supabaseConfig.restUrl}/embudos`, {
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
      data: Array.isArray(data) ? data[0] : data
    });

  } catch (error) {
    console.error('Error creating embudo:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al crear embudo',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// GET /api/embudos - Obtener todos los embudos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const espacioId = searchParams.get('espacio_id');

    let url = `${supabaseConfig.restUrl}/embudos`;
    
    // Si se especifica espacio_id, filtrar por ese espacio
    if (espacioId) {
      url += `?espacio_id=eq.${espacioId}&order=orden.asc`;
    } else {
      url += `?order=orden.asc`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener los embudos'
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    
    return NextResponse.json({
      success: true,
      data: Array.isArray(data) ? data : []
    });

  } catch (error) {
    console.error('Error fetching embudos:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al obtener embudos',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
