import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { EspacioTrabajoData } from './domain/espacio_trabajo';
import { handleResponse } from './utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

// POST /api/espacio_trabajos - Crear espacio de trabajo
export async function POST(request: NextRequest) {
  try {
    const espacioData: EspacioTrabajoData = await request.json();
    
    // Preparar los datos con valores por defecto
    const dataToSend = {
      nombre: espacioData.nombre,
      creado_por: espacioData.creado_por,
      organizacion_id: espacioData.organizacion_id
    };

    const response = await fetch(`${supabaseConfig.restUrl}/espacios_de_trabajo`, {
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
    console.error('Error creating espacio de trabajo:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al crear espacio de trabajo',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// GET /api/espacio_trabajos - Obtener todos los espacios de trabajo
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${supabaseConfig.restUrl}/espacios_de_trabajo?select=*&order=orden.asc`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener los espacios de trabajo'
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    
    return NextResponse.json({
      success: true,
      data: Array.isArray(data) ? data : []
    });

  } catch (error) {
    console.error('Error fetching espacios de trabajo:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al obtener espacios de trabajo',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}