import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import generateCSV from '../utils/generateCSV';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

export async function GET(request: NextRequest) {
  try {
    const headers = getSupabaseHeaders(request);

    const response = await fetch(`${supabaseConfig.restUrl}/contactos?order=nombre.asc`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Error al obtener los contactos para exportar' },
        { status: response.status }
      );
    }

    const contactos = await response.json();
    
    if (contactos.length === 0) {
      return NextResponse.json(
        { error: 'No hay contactos para exportar' },
        { status: 404 }
      );
    }

    const csvContent = generateCSV(contactos);
    const filename = `contactos_${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error exporting contacts:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor durante la exportación' },
      { status: 500 }
    );
  }
}
