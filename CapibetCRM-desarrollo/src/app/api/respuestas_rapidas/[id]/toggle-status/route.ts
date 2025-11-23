import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { ToggleStatusRequest } from '../../domain/respuesta_rapida';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

// PATCH /api/respuestas-rapidas/[id]/toggle-status - Cambiar estado de la respuesta rápida (activa/inactiva)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID de respuesta rápida requerido'
      }, { status: 400 });
    }

    const { activa }: ToggleStatusRequest = await request.json();

    if (typeof activa !== 'boolean') {
      return NextResponse.json({
        success: false,
        error: 'El campo "activa" debe ser un valor booleano'
      }, { status: 400 });
    }

    const response = await fetch(`${supabaseConfig.restUrl}/respuestas_rapidas?id=eq.${id}`, {
      method: 'PATCH',
      headers: getSupabaseHeaders(request, { preferRepresentation: true }),
      body: JSON.stringify({ activa }),
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Error ${response.status}: ${response.statusText}`
      }, { status: response.status });
    }

    return NextResponse.json({ 
      success: true,
      message: activa ? 'Respuesta rápida activada exitosamente' : 'Respuesta rápida desactivada exitosamente'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al cambiar estado de la respuesta rápida'
    }, { status: 500 });
  }
}
