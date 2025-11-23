import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { ContactData, ContactResponse } from './domain/contacto';
import { handleResponse } from './utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

// GET /api/contactos - Obtener todos los contactos
export async function GET(request: NextRequest) {
  try {

    console.log('Entro a petición')
    const response = await fetch(`${supabaseConfig.restUrl}/contactos`, {
      method: 'GET',
      headers: getSupabaseHeaders(request)
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener los contactos'
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    
    return NextResponse.json({
      success: true,
      data: Array.isArray(data) ? data : []
    });

  } catch (error) {
    console.error('Error fetching contacts:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al obtener contactos',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// POST /api/contactos - Crear nuevo contacto
export async function POST(request: NextRequest) {
  try {
    const contactData: ContactData = await request.json();
    
    const response = await fetch(`${supabaseConfig.restUrl}/contactos`, {
      method: 'POST',
      headers: getSupabaseHeaders(request, { preferRepresentation: true }),
      body: JSON.stringify(contactData)
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
      data: data as unknown as ContactResponse
    });

  } catch (error) {
    console.error('Error creating contact:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// PATCH /api/contactos - Actualizar contacto existente
export async function PATCH(request: NextRequest) {
  try {
    const { id, ...contactData } = await request.json();
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID del contacto es requerido'
      }, { status: 400 });
    }

    const response = await fetch(`${supabaseConfig.restUrl}/contactos?id=eq.${id}`, {
      method: 'PATCH',
      headers: getSupabaseHeaders(request, { preferRepresentation: true }),
      body: JSON.stringify(contactData),
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
      data: data as unknown as ContactResponse
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar contacto'
    }, { status: 500 });
  }
}