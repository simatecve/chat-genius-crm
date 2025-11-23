import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { MensajeData } from './domain/mensaje';
import { handleResponse } from './utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

// POST /api/mensajes - Crear mensaje
export async function POST(request: NextRequest) {
  try {
    const mensajeData: MensajeData = await request.json();
    
    // Validar campos requeridos
    if (!mensajeData.remitente_id || !mensajeData.contacto_id || 
        !mensajeData.chat_id || !mensajeData.type || !mensajeData.content) {
      return NextResponse.json({
        success: false,
        error: 'Faltan campos requeridos: remitente_id, contacto_id, chat_id, type, content'
      }, { status: 400 });
    }

    // Validar que el tipo sea válido
    const tiposValidos = ['whatsapp_qr', 'whatsapp_api', 'messenger', 'instagram', 'telegram', 'telegram_bot', 'gmail', 'outlook'];
    if (!tiposValidos.includes(mensajeData.type)) {
      return NextResponse.json({
        success: false,
        error: `Tipo inválido. Debe ser uno de: ${tiposValidos.join(', ')}`
      }, { status: 400 });
    }

    // Validar que el contenido sea un objeto válido
    if (!mensajeData.content || typeof mensajeData.content !== 'object') {
      return NextResponse.json({
        success: false,
        error: 'El campo content debe ser un objeto válido'
      }, { status: 400 });
    }

    // Preparar los datos
    const dataToSend = {
      remitente_id: mensajeData.remitente_id,
      contacto_id: mensajeData.contacto_id,
      chat_id: mensajeData.chat_id,
      type: mensajeData.type,
      content: mensajeData.content,
      creado_en: mensajeData.creado_en || new Date().toISOString()
    };

    const response = await fetch(`${supabaseConfig.restUrl}/mensajes`, {
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
    console.error('Error creating message:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al crear mensaje',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// GET /api/mensajes - Obtener todos los mensajes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chat_id');
    const contactoId = searchParams.get('contacto_id');
    const remitenteId = searchParams.get('remitente_id');
    const type = searchParams.get('type');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const lastPerChat = searchParams.get('last_per_chat'); // Nuevo parámetro para obtener solo el último mensaje por chat

    // Si se solicita solo el último mensaje por chat, usamos una consulta optimizada
    // Esta consulta utiliza una función RPC en Supabase que ejecuta DISTINCT ON a nivel de DB
    if (lastPerChat === 'true') {
      const response = await fetch(`${supabaseConfig.restUrl}/rpc/get_last_messages_per_chat`, {
        method: 'POST',
        headers: getSupabaseHeaders(request, { preferRepresentation: true }),
        body: JSON.stringify({})
      });

      if (!response.ok) {
        return NextResponse.json({
          success: false,
          error: 'Error al obtener los últimos mensajes por chat'
        }, { status: response.status });
      }

      const data = await handleResponse(response);
      
      return NextResponse.json({
        success: true,
        data: Array.isArray(data) ? data : []
      });
    }

    // Consulta normal con filtros
    let queryString = '';
    const filters = [];
    
    if (chatId) filters.push(`chat_id=eq.${chatId}`);
    if (contactoId) filters.push(`contacto_id=eq.${contactoId}`);
    if (remitenteId) filters.push(`remitente_id=eq.${remitenteId}`);
    if (type) filters.push(`type=eq.${type}`);
    
    if (filters.length > 0) {
      queryString = '?' + filters.join('&');
    }
    
    // Agregar paginación
    if (limit) {
      queryString += (queryString ? '&' : '?') + `limit=${limit}`;
    }
    if (offset) {
      queryString += (queryString ? '&' : '?') + `offset=${offset}`;
    }

    // Ordenar por fecha de creación descendente
    queryString += (queryString ? '&' : '?') + 'order=creado_en.desc';

    const response = await fetch(`${supabaseConfig.restUrl}/mensajes${queryString}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener los mensajes'
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    
    return NextResponse.json({
      success: true,
      data: Array.isArray(data) ? data : []
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al obtener mensajes',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
