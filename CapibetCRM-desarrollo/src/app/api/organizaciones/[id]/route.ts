import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }
    const response = await fetch(`${supabaseConfig.restUrl}/organizaciones?id=eq.${id}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });
    if (!response.ok) {
      return NextResponse.json({ success: false, error: 'Error al obtener organización' }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json({ success: true, data: Array.isArray(data) ? data[0] : data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error de conexión' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }
    const body = await request.json();
    const response = await fetch(`${supabaseConfig.restUrl}/organizaciones?id=eq.${id}`, {
      method: 'PATCH',
      headers: getSupabaseHeaders(request, { preferRepresentation: true }),
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ success: false, error: 'Error al actualizar organización', details: err }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json({ success: true, data: Array.isArray(data) ? data[0] : data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error de conexión' }, { status: 500 });
  }
}
