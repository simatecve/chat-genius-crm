import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { UsuarioData } from './domain/usuario';
import { handleResponse } from './utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

// POST /api/usuarios - Crear usuario
export async function POST(request: NextRequest) {
  try {
    const userData: UsuarioData = await request.json();
    
    // Validar campos requeridos
    if (!userData.nombre) {
      return NextResponse.json({
        success: false,
        error: 'El campo nombre es requerido'
      }, { status: 400 });
    }

    // Preparar los datos
    const dataToSend = {
      nombre: userData.nombre,
      telefono: userData.telefono || null,
      codigo_pais: userData.codigo_pais || null,
      rol: userData.rol || 'usuario',
      activo: userData.activo !== undefined ? userData.activo : true,
      organizacion_id: userData.organizacion_id || null
    };

    const response = await fetch(`${supabaseConfig.restUrl}/usuarios`, {
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
    console.error('Error creating user:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al crear usuario',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// GET /api/usuarios - Obtener todos los usuarios
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${supabaseConfig.restUrl}/usuarios`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener los usuarios'
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    
    return NextResponse.json({
      success: true,
      data: Array.isArray(data) ? data : []
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al obtener usuarios',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
