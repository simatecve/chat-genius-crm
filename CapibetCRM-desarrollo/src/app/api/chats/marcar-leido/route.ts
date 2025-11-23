import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';
import { handleResponse } from '../utils';

/**
 * PATCH /api/chats/marcar-leido - Marcar un chat como leído (nuevos_mensajes = false)
 * Body: { chat_id: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { chat_id } = await request.json();
    
    if (!chat_id) {
      return NextResponse.json({
        success: false,
        error: 'chat_id es requerido'
      }, { status: 400 });
    }

    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(chat_id)) {
      return NextResponse.json({
        success: false,
        error: 'ID de chat inválido (debe ser un UUID)'
      }, { status: 400 });
    }

    const response = await fetch(
      `${supabaseConfig.restUrl}/chats?id=eq.${chat_id}`,
      {
        method: 'PATCH',
        headers: getSupabaseHeaders(request, { preferRepresentation: true }),
        body: JSON.stringify({
          nuevos_mensajes: false
        })
      }
    );

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al marcar el chat como leído'
      }, { status: response.status });
    }

    const data = await handleResponse(response);

    return NextResponse.json({
      success: true,
      data,
      message: 'Chat marcado como leído'
    });

  } catch (error) {
    console.error('Error marking chat as read:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error al marcar chat como leído',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

