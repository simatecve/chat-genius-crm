import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';
import { UserPermissionsData } from './domain/user_permissions';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const usuarioId = searchParams.get('usuario_id');
    let url = `${supabaseConfig.restUrl}/user_permissions`;
    const filters: string[] = [];
    if (usuarioId) filters.push(`usuario_id=eq.${usuarioId}`);
    if (filters.length > 0) url += `?${filters.join('&')}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });
    if (!response.ok) {
      return NextResponse.json({ success: false, error: 'Error al obtener permisos' }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json({ success: true, data: Array.isArray(data) ? data : [] });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error de conexión al obtener permisos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: UserPermissionsData = await request.json();
    if (!body.usuario_id) {
      return NextResponse.json({ success: false, error: 'usuario_id requerido' }, { status: 400 });
    }
    const response = await fetch(`${supabaseConfig.restUrl}/user_permissions`, {
      method: 'POST',
      headers: getSupabaseHeaders(request, { preferRepresentation: true }),
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ success: false, error: 'Error al crear permisos', details: err }, { status: response.status });
    }
    const data = await response.json();
    const item = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error de conexión al crear permisos' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const usuarioId = searchParams.get('usuario_id');
    if (!usuarioId) {
      return NextResponse.json({ success: false, error: 'usuario_id requerido' }, { status: 400 });
    }
    const body: Partial<UserPermissionsData> = await request.json();
    const response = await fetch(`${supabaseConfig.restUrl}/user_permissions?usuario_id=eq.${usuarioId}`, {
      method: 'PATCH',
      headers: getSupabaseHeaders(request, { preferRepresentation: true }),
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ success: false, error: 'Error al actualizar permisos', details: err }, { status: response.status });
    }
    const data = await response.json();
    const item = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error de conexión al actualizar permisos' }, { status: 500 });
  }
}
