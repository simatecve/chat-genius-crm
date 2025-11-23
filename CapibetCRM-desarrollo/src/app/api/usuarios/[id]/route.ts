import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { UsuarioData, UsuarioResponse } from '../domain/usuario';
import { handleResponse } from '../utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

// GET /api/usuarios/[id] - Obtener usuario por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return NextResponse.json({
        success: false,
        error: 'ID de usuario inválido (debe ser un UUID)'
      }, { status: 400 });
    }

    const response = await fetch(`${supabaseConfig.restUrl}/usuarios?id=eq.${id}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener el usuario'
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    
    return NextResponse.json({
      success: true,
      data: Array.isArray(data) ? data[0] : null
    });

  } catch (error) {
    console.error('Error fetching user:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al obtener usuario',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// PATCH /api/usuarios/[id] - Actualizar usuario
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return NextResponse.json({
        success: false,
        error: 'ID de usuario inválido (debe ser un UUID)'
      }, { status: 400 });
    }

    const userData: Partial<UsuarioData> = await request.json();

    // Preparar solo los campos permitidos para actualizar
    const allowedFields: Partial<UsuarioData> = {};
    if (userData.nombre !== undefined) allowedFields.nombre = userData.nombre;
    if (userData.telefono !== undefined) allowedFields.telefono = userData.telefono;
    if (userData.codigo_pais !== undefined) allowedFields.codigo_pais = userData.codigo_pais;
    if (userData.rol !== undefined) allowedFields.rol = userData.rol;
    if (userData.activo !== undefined) allowedFields.activo = userData.activo;

    const response = await fetch(`${supabaseConfig.restUrl}/usuarios?id=eq.${id}`, {
      method: 'PATCH',
      headers: getSupabaseHeaders(request, { preferRepresentation: true }),
      body: JSON.stringify(allowedFields),
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
      data: data as unknown as UsuarioResponse
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar usuario'
    }, { status: 500 });
  }
}

// DELETE /api/usuarios/[id] - Eliminar usuario
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return NextResponse.json({
        success: false,
        error: 'ID de usuario inválido (debe ser un UUID)'
      }, { status: 400 });
    }

    const response = await fetch(`${supabaseConfig.restUrl}/usuarios?id=eq.${id}`, {
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
      error: error instanceof Error ? error.message : 'Error al eliminar usuario'
    }, { status: 500 });
  }
}
