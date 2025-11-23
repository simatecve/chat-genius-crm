import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { UpdateOrderRequest } from '../domain/embudo';
import { handleResponse } from '../utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

// PATCH /api/embudos/update-order - Actualizar orden de múltiples embudos
export async function PATCH(request: NextRequest) {
  try {
    const { embudos }: UpdateOrderRequest = await request.json();
    
    // Validar datos requeridos
    if (!embudos || !Array.isArray(embudos) || embudos.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Se requiere un array de embudos con id y orden'
      }, { status: 400 });
    }

    // Validar que cada embudo tenga id y orden
    for (const embudo of embudos) {
      if (!embudo.id || !embudo.hasOwnProperty('orden')) {
        return NextResponse.json({
          success: false,
          error: 'Cada embudo debe tener id y orden válidos'
        }, { status: 400 });
      }
    }

    // Hacer múltiples PATCH requests para actualizar el orden
    const updatePromises = embudos.map(async ({ id, orden }) => {
      const response = await fetch(`${supabaseConfig.restUrl}/embudos?id=eq.${id}`, {
        method: 'PATCH',
        headers: getSupabaseHeaders(request, { preferRepresentation: true }),
        body: JSON.stringify({ orden })
      });

      if (!response.ok) {
        throw new Error(`Error updating embudo ${id}: ${response.status} ${response.statusText}`);
      }

      return handleResponse(response);
    });

    await Promise.all(updatePromises);
    
    return NextResponse.json({
      success: true,
      data: undefined,
      message: 'Orden de embudos actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error updating embudos order:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al actualizar orden de embudos',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
