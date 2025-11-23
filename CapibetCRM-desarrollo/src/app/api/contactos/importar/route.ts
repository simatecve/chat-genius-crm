import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import parseCSV from '../utils/parseCSV';

// POST /api/contactos/importar - Importar contactos desde CSV
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'El archivo debe ser un CSV' },
        { status: 400 }
      );
    }

    const csvContent = await file.text();
    const contactos = parseCSV(csvContent);

    if (contactos.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron contactos válidos en el archivo' },
        { status: 400 }
      );
    }

    const headers = {
      'Content-Type': 'application/json',
      'apikey': supabaseConfig.anonKey,
      'Authorization': `Bearer ${supabaseConfig.serviceRoleKey}`,
    };

    const batchSize = 50;
    const resultados = {
      exitosos: 0,
      fallidos: 0,
      errores: [] as string[]
    };

    for (let i = 0; i < contactos.length; i += batchSize) {
      const batch = contactos.slice(i, i + batchSize);

      try {
        const response = await fetch(`${supabaseConfig.restUrl}/contactos`, {
          method: 'POST',
          headers,
          body: JSON.stringify(batch)
        });

        if (response.ok) {
          resultados.exitosos += batch.length;
        } else {
          resultados.fallidos += batch.length;
          const errorData = await response.text();
          resultados.errores.push(`Lote ${Math.floor(i/batchSize) + 1}: ${errorData}`);
        }
      } catch (error) {
        resultados.fallidos += batch.length;
        resultados.errores.push(`Lote ${Math.floor(i/batchSize) + 1}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }

    return NextResponse.json({
      message: `Importación completada: ${resultados.exitosos} exitosos, ${resultados.fallidos} fallidos`,
      errores: resultados.errores
    }, { status: 200 });

  } catch (error) {
    console.error('Error importing contacts:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor durante la importación' },
      { status: 500 }
    );
  }
}
