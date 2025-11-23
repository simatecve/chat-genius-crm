import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { ContactResponse } from '../domain/contacto';
import { handleResponse } from '../utils';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

// GET /api/contactos/[id] - Obtener un contacto específico por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID del contacto inválido'
      }, { status: 400 });
    }

    const response = await fetch(`${supabaseConfig.restUrl}/contactos?id=eq.${id}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request)
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al obtener el contacto'
      }, { status: response.status });
    }

    const data = await handleResponse(response);
    
    // Verificar si se encontró el contacto
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Contacto no encontrado'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: data[0] as ContactResponse
    });

  } catch (error) {
    console.error('Error fetching contact:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión al obtener contacto',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// PATCH /api/contactos/[id] - Actualizar un contacto específico por ID
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contactData = await request.json();
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID del contacto inválido'
      }, { status: 400 });
    }

    const response = await fetch(`${supabaseConfig.restUrl}/contactos?id=eq.${id}`, {
      method: 'PATCH',
      headers: getSupabaseHeaders(request),
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

// DELETE /api/contactos/[id] - Eliminar un contacto específico por ID con eliminación en cascada
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID del contacto inválido'
      }, { status: 400 });
    }

    const contactId = id;
    let deletedMessages = 0;
    let deletedChats = 0;
    let deletedDeals = 0;
    let deletedActivities = 0;

    // 1. Verificar si el contacto existe
    const contactResponse = await fetch(`${supabaseConfig.restUrl}/contactos?id=eq.${contactId}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request)
    });

    if (!contactResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al verificar la existencia del contacto'
      }, { status: contactResponse.status });
    }

    const contactData = await handleResponse(contactResponse);
    
    if (!Array.isArray(contactData) || contactData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Contacto no encontrado'
      }, { status: 404 });
    }

    // 2. Eliminar actividades relacionadas con el contacto
    const activitiesResponse = await fetch(`${supabaseConfig.restUrl}/actividades?contacto_id=eq.${contactId}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request)
    });

    if (activitiesResponse.ok) {
      const activitiesData = await handleResponse(activitiesResponse);
      const activities = Array.isArray(activitiesData) ? activitiesData : [];

      if (activities.length > 0) {
        const deleteActivitiesResponse = await fetch(`${supabaseConfig.restUrl}/actividades?contacto_id=eq.${contactId}`, {
          method: 'DELETE',
          headers: getSupabaseHeaders(request)
        });

        if (deleteActivitiesResponse.ok) {
          deletedActivities = activities.length;
          console.log(`Eliminadas ${activities.length} actividades del contacto ${contactId}`);
        }
      }
    }

    // 3. Eliminar deals relacionados con el contacto
    const dealsResponse = await fetch(`${supabaseConfig.restUrl}/deals?contacto_id=eq.${contactId}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request)
    });

    if (dealsResponse.ok) {
      const dealsData = await handleResponse(dealsResponse);
      const deals = Array.isArray(dealsData) ? dealsData : [];

      if (deals.length > 0) {
        const deleteDealsResponse = await fetch(`${supabaseConfig.restUrl}/deals?contacto_id=eq.${contactId}`, {
          method: 'DELETE',
          headers: getSupabaseHeaders(request)
        });

        if (deleteDealsResponse.ok) {
          deletedDeals = deals.length;
          console.log(`Eliminados ${deals.length} deals del contacto ${contactId}`);
        }
      }
    }

    // 4. Buscar chats relacionados con el contacto
    const chatsResponse = await fetch(`${supabaseConfig.restUrl}/chats?contact_id=eq.${contactId}`, {
      method: 'GET',
      headers: getSupabaseHeaders(request)
    });

    if (!chatsResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error al buscar chats del contacto'
      }, { status: chatsResponse.status });
    }

    const chatsData = await handleResponse(chatsResponse);
    const chats = Array.isArray(chatsData) ? chatsData : [];

    // 5. Eliminar TODOS los mensajes relacionados con el contacto (tanto por chat_id como por contacto_id)
    // Primero eliminar mensajes por chat_id
    for (const chat of chats) {
      const mensajesResponse = await fetch(`${supabaseConfig.restUrl}/mensajes?chat_id=eq.${chat.id}`, {
        method: 'DELETE',
        headers: getSupabaseHeaders(request)
      });

      if (mensajesResponse.ok) {
        const mensajesData = await handleResponse(mensajesResponse);
        if (Array.isArray(mensajesData)) {
          deletedMessages += mensajesData.length;
          console.log(`Eliminados ${mensajesData.length} mensajes del chat ${chat.id}`);
        }
      } else {
        console.error(`Error al eliminar mensajes del chat ${chat.id}`);
      }
    }

    // Luego eliminar mensajes directos del contacto
    const directMessagesResponse = await fetch(`${supabaseConfig.restUrl}/mensajes?contacto_id=eq.${contactId}`, {
      method: 'DELETE',
      headers: getSupabaseHeaders(request)
    });

    if (directMessagesResponse.ok) {
      const directMessagesData = await handleResponse(directMessagesResponse);
      if (Array.isArray(directMessagesData)) {
        deletedMessages += directMessagesData.length;
        console.log(`Eliminados ${directMessagesData.length} mensajes directos del contacto ${contactId}`);
      }
    }

    // 6. Ahora eliminar los chats (ya sin mensajes dependientes)
    for (const chat of chats) {
      const deleteChatResponse = await fetch(`${supabaseConfig.restUrl}/chats?id=eq.${chat.id}`, {
        method: 'DELETE',
        headers: getSupabaseHeaders(request)
      });

      if (deleteChatResponse.ok) {
        deletedChats++;
        console.log(`Chat ${chat.id} eliminado exitosamente`);
      } else {
        console.error(`Error al eliminar chat ${chat.id}`);
      }
    }

    // 7. Finalmente, eliminar el contacto
    const response = await fetch(`${supabaseConfig.restUrl}/contactos?id=eq.${contactId}`, {
      method: 'DELETE',
      headers: getSupabaseHeaders(request)
    });

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json({
        success: false,
        error: `Error del servidor al eliminar contacto: ${response.status} ${response.statusText}`,
        details: errorData
      }, { status: response.status });
    }

    await handleResponse(response);
    
    return NextResponse.json({
      success: true,
      data: {
        message: 'Contacto eliminado exitosamente con eliminación en cascada',
        resumen: {
          mensajesEliminados: deletedMessages,
          chatsEliminados: deletedChats,
          dealsEliminados: deletedDeals,
          actividadesEliminadas: deletedActivities,
          contactoEliminado: contactId
        }
      }
    });
  } catch (error) {
    console.error('Error deleting contact with cascade:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar contacto',
      details: error instanceof Error ? error.stack : 'Error desconocido'
    }, { status: 500 });
  }
}
