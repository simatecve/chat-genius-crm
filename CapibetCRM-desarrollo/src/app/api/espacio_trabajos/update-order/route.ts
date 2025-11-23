import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { handleResponse } from '../utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

// PATCH /api/espacio_trabajos/update-order - Actualizar el orden de múltiples espacios de trabajo
export async function PATCH(request: NextRequest) {
  try {
    const espaciosData: Array<{ id: string; orden: number }> = await request.json();
    
    if (!Array.isArray(espaciosData) || espaciosData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Datos inválidos. Se espera un array de espacios con id y orden.'
      }, { status: 400 });
    }

    // Validar que todos los elementos tengan id y orden
    for (const espacio of espaciosData) {
      if (!espacio.id || typeof espacio.orden !== 'number') {
        return NextResponse.json({
          success: false,
          error: 'Cada espacio debe tener un id válido y un orden numérico.'
        }, { status: 400 });
      }
    }

    // Actualizar cada espacio de trabajo con su nuevo orden
    const updatePromises = espaciosData.map(async (espacio) => {
      const response = await fetch(`${supabaseConfig.restUrl}/espacios_de_trabajo?id=eq.${espacio.id}`, {
        method: 'PATCH',
        headers: getSupabaseHeaders(request, { preferRepresentation: true }),
        body: JSON.stringify({ orden: espacio.orden })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error actualizando espacio ${espacio.id}: ${response.status} ${response.statusText} - ${errorData}`);
      }

      return handleResponse(response);
    });

    // Ejecutar todas las actualizaciones en paralelo
    const results = await Promise.all(updatePromises);
    
    return NextResponse.json({
      success: true,
      data: results,
      message: `Orden actualizado para ${espaciosData.length} espacio(s) de trabajo`
    });

  } catch (error) {
    console.error('Error updating espacios de trabajo order:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al actualizar el orden de espacios de trabajo',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
