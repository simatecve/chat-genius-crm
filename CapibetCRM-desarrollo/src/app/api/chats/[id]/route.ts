import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { ChatResponse } from '../domain/chat';
import { handleResponse } from '../utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

// GET /api/chats/[id] - Obtener un chat específico por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID del chat inválido'
      }, { status: 400 });
    }

    const response = await fetch(`${supabaseConfig.restUrl}/chats?id=eq.${id}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener el chat'
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    
    // Verificar si se encontró el chat
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Chat no encontrado'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: data[0] as ChatResponse
    });

  } catch (error) {
    console.error('Error fetching chat:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al obtener chat',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// PATCH /api/chats/[id] - Actualizar un chat específico por ID
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const chatData = await request.json();
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID del chat inválido'
      }, { status: 400 });
    }

    const response = await fetch(`${supabaseConfig.restUrl}/chats?id=eq.${id}`, {
      method: 'PATCH',
      headers: getSupabaseHeaders(request, { preferRepresentation: true }),
      body: JSON.stringify(chatData),
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
      data: data as unknown as ChatResponse
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar chat'
    }, { status: 500 });
  }
}

// DELETE /api/chats/[id] - Eliminar un chat específico por ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID del chat inválido'
      }, { status: 400 });
    }

    // Primero verificar si el chat existe
    const chatResponse = await fetch(`${supabaseConfig.restUrl}/chats?id=eq.${id}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!chatResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al verificar la existencia del chat'
      }, { status: chatResponse.status });
    }

    const chatData = await handleResponse(chatResponse);
    
    if (!Array.isArray(chatData) || chatData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Chat no encontrado'
      }, { status: 404 });
    }

    // Verificar si el chat tiene mensajes relacionados
    const mensajesResponse = await fetch(`${supabaseConfig.restUrl}/mensajes?chat_id=eq.${id}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!mensajesResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al verificar mensajes del chat'
      }, { status: mensajesResponse.status });
    }

    const mensajesData = await handleResponse(mensajesResponse);
    
    // Si hay mensajes, eliminarlos primero
    if (Array.isArray(mensajesData) && mensajesData.length > 0) {
      console.log(`Eliminando ${mensajesData.length} mensajes del chat ${id}`);
      
      const deleteMensajesResponse = await fetch(`${supabaseConfig.restUrl}/mensajes?chat_id=eq.${id}`, {
        method: 'DELETE',
        headers: getSupabaseHeaders(request, { preferRepresentation: true })
      });

      if (!deleteMensajesResponse.ok) {
        const errorData = await deleteMensajesResponse.text();
        return NextResponse.json({
          success: false,
          error: `Error al eliminar mensajes del chat: ${deleteMensajesResponse.status} ${deleteMensajesResponse.statusText}`,
          details: errorData
        }, { status: deleteMensajesResponse.status });
      }

      console.log(`Mensajes eliminados exitosamente del chat ${id}`);
    }

    // Ahora eliminar el chat
    const response = await fetch(`${supabaseConfig.restUrl}/chats?id=eq.${id}`, {
      method: 'DELETE',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json({
        success: false,
        error: `Error del servidor al eliminar chat: ${response.status} ${response.statusText}`,
        details: errorData
      }, { status: response.status });
    }

    await handleResponse(response);
    
    return NextResponse.json({
      success: true,
      data: {
        message: 'Chat eliminado exitosamente',
        mensajesEliminados: Array.isArray(mensajesData) ? mensajesData.length : 0
      }
    });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar chat',
      details: error instanceof Error ? error.stack : 'Error desconocido'
    }, { status: 500 });
  }
}
