import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { SesionData, SesionResponse } from '../domain/sesion';
import { handleResponse } from '../utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';
import { whatsAppApiService } from '@/config/whatsapp_api';

// GET /api/sesiones/[id] - Obtener sesión por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID de sesión inválido'
      }, { status: 400 });
    }

    const response = await fetch(`${supabaseConfig.restUrl}/sesiones?id=eq.${id}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener la sesión'
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    
    return NextResponse.json({
      success: true,
      data: Array.isArray(data) ? data[0] : null
    });

  } catch (error) {
    console.error('Error fetching sesion:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al obtener sesión',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// PATCH /api/sesiones/[id] - Actualizar sesión
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID de sesión inválido'
      }, { status: 400 });
    }

    const sesionData: Partial<SesionData> = await request.json();

    const response = await fetch(`${supabaseConfig.restUrl}/sesiones?id=eq.${id}`, {
      method: 'PATCH',
      headers: getSupabaseHeaders(request, { preferRepresentation: true }),
      body: JSON.stringify(sesionData),
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
      data: data as unknown as SesionResponse
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar sesión'
    }, { status: 500 });
  }
}

// DELETE /api/sesiones/[id] - Eliminar sesión con eliminación en cascada
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID de sesión inválido'
      }, { status: 400 });
    }

    const sesionId = id;

    // 0. Obtener la sesión para verificar su tipo y whatsapp_session
    const sesionResponse = await fetch(`${supabaseConfig.restUrl}/sesiones?id=eq.${sesionId}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!sesionResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener la sesión'
      }, { status: sesionResponse.status });
    }

    const sesionData = await handleResponse(sesionResponse);
    const sesion = Array.isArray(sesionData) ? sesionData[0] : sesionData;

    if (!sesion) {
      return NextResponse.json({
        success: false,
        error: 'Sesión no encontrada'
      }, { status: 404 });
    }

    // 1. Obtener todos los chats de la sesión
    const chatsResponse = await fetch(`${supabaseConfig.restUrl}/chats?sesion_id=eq.${sesionId}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!chatsResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener los chats de la sesión'
      }, { status: chatsResponse.status });
    }

    const chats = await handleResponse(chatsResponse);
    const chatsArray = Array.isArray(chats) ? chats : [];

    // 2. Para cada chat, eliminar todos sus mensajes
    for (const chat of chatsArray) {
      const mensajesResponse = await fetch(`${supabaseConfig.restUrl}/mensajes?chat_id=eq.${chat.id}`, {
        method: 'DELETE',
        headers: getSupabaseHeaders(request, { preferRepresentation: true })
      });

      if (!mensajesResponse.ok) {
        console.warn(`Error al eliminar mensajes del chat ${chat.id}:`, await mensajesResponse.text());
        // Continuamos con la eliminación aunque falle la eliminación de mensajes
      }
    }

    // 3. Eliminar todos los chats de la sesión
    if (chatsArray.length > 0) {
      const deleteChatsResponse = await fetch(`${supabaseConfig.restUrl}/chats?sesion_id=eq.${sesionId}`, {
        method: 'DELETE',
        headers: getSupabaseHeaders(request, { preferRepresentation: true })
      });

      if (!deleteChatsResponse.ok) {
        return NextResponse.json({
          success: false,
          error: 'Error al eliminar los chats de la sesión'
        }, { status: deleteChatsResponse.status });
      }
    }

    // 4. Si es whatsapp_qr, desconectar y eliminar la whatsapp_session
    let deletedWhatsAppSession = false;
    let disconnectResult = null;
    
    if (sesion.type === 'whatsapp_qr' && sesion.whatsapp_session) {
      try {
        // 4.1. Obtener la whatsapp_session para acceder al session_id del orquestador
        const whatsappSessionResponse = await fetch(`${supabaseConfig.restUrl}/whatsapp_sessions?id=eq.${sesion.whatsapp_session}`, {
          method: 'GET',
          headers: getSupabaseHeaders(request, { preferRepresentation: true })
        });

        if (whatsappSessionResponse.ok) {
          const whatsappSessionData = await handleResponse(whatsappSessionResponse);
          const whatsappSession = Array.isArray(whatsappSessionData) ? whatsappSessionData[0] : whatsappSessionData;

          if (whatsappSession && whatsappSession.session_id && whatsappSession.status === 'connected') {
            // 4.2. Desconectar la sesión en el orquestador
            try {
              disconnectResult = await whatsAppApiService.disconnectSession(whatsappSession.session_id);
              console.log(`✅ Sesión ${whatsappSession.session_id} desconectada del orquestador:`, disconnectResult);
            } catch (disconnectError) {
              console.warn(`⚠️ Error al desconectar sesión ${whatsappSession.session_id} del orquestador:`, disconnectError);
              // Continuamos con la eliminación aunque falle la desconexión
            }
          } else {
            console.log(`ℹ️ Sesión WhatsApp ${sesion.whatsapp_session} no está conectada o no tiene session_id, omitiendo desconexión`);
          }
        } else {
          console.warn(`Error al obtener WhatsApp session ${sesion.whatsapp_session}:`, await whatsappSessionResponse.text());
        }

        // 4.3. Eliminar la whatsapp_session de la base de datos
        const deleteWhatsAppSessionResponse = await fetch(`${supabaseConfig.restUrl}/whatsapp_sessions?id=eq.${sesion.whatsapp_session}`, {
          method: 'DELETE',
          headers: getSupabaseHeaders(request, { preferRepresentation: true })
        });

        if (deleteWhatsAppSessionResponse.ok) {
          deletedWhatsAppSession = true;
          console.log(`✅ WhatsApp session ${sesion.whatsapp_session} eliminada de la base de datos`);
        } else {
          console.warn(`Error al eliminar WhatsApp session ${sesion.whatsapp_session}:`, await deleteWhatsAppSessionResponse.text());
          // Continuamos con la eliminación aunque falle la eliminación de whatsapp_session
        }

      } catch (error) {
        console.error(`Error procesando WhatsApp session ${sesion.whatsapp_session}:`, error);
        // Continuamos con la eliminación aunque falle el procesamiento de whatsapp_session
      }
    }

    // 5. Finalmente, eliminar la sesión
    const response = await fetch(`${supabaseConfig.restUrl}/sesiones?id=eq.${sesionId}`, {
      method: 'DELETE',
      headers: getSupabaseHeaders(request, { preferRepresentation: true })
    });

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json({
        success: false,
        error: `Error del servidor: ${response.status} ${response.statusText}`,
        details: errorData
      }, { status: response.status });
    }

    await handleResponse(response);
    
    return NextResponse.json({
      success: true,
      data: {
        message: `Sesión ${sesionId} eliminada exitosamente`,
        deletedChats: chatsArray.length,
        deletedMessages: 'Todos los mensajes de los chats fueron eliminados',
        deletedWhatsAppSession: deletedWhatsAppSession,
        sessionType: sesion.type,
        orchestratorDisconnect: disconnectResult ? {
          success: disconnectResult.success,
          message: disconnectResult.message
        } : null
      }
    });

  } catch (error) {
    console.error('Error eliminando sesión:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar sesión'
    }, { status: 500 });
  }
}
