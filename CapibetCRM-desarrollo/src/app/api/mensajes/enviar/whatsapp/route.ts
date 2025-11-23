import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/config/supabase';
import { WHATSAPP_CONFIG } from '@/config/whatsapp_api';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';

/**
 * Obtiene los headers para Supabase usando el token del usuario
 */
function getHeaders(request: NextRequest): HeadersInit {
  return getSupabaseHeaders(request, { preferRepresentation: true });
}

/**
 * Maneja la respuesta de Supabase
 */
async function handleResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;
  
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * POST /api/mensajes/enviar/whatsapp
 * Endpoint para enviar mensajes de WhatsApp a través del orquestador
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validaciones
    if (!body.telefono || !body.mensaje || !body.sesion_id) {
      return NextResponse.json({
        success: false,
        error: 'Faltan campos requeridos: telefono (o whatsapp_jid), mensaje, sesion_id'
      }, { status: 400 });
    }

    const { telefono, mensaje, sesion_id } = body;

    // Buscar la sesión y popular whatsapp_session
    const sesionResponse = await fetch(`${supabaseConfig.restUrl}/sesiones?id=eq.${sesion_id}&select=*,whatsapp_session:whatsapp_sessions(*)`, {
      method: 'GET',
      headers: getHeaders(request)
    });

    if (!sesionResponse.ok) {
      console.error('Error obteniendo sesión:', sesionResponse.status);
      return NextResponse.json({
        success: false,
        error: 'Error al obtener la sesión'
      }, { status: sesionResponse.status });
    }

    const sesiones = await handleResponse(sesionResponse);
    const sesion = Array.isArray(sesiones) ? sesiones[0] : sesiones;

    if (!sesion) {
      console.error('Sesión no encontrada');
      return NextResponse.json({
        success: false,
        error: 'Sesión no encontrada'
      }, { status: 404 });
    }

    if (!sesion.whatsapp_session) {
      console.error('La sesión no tiene whatsapp_session asociado');
      return NextResponse.json({
        success: false,
        error: 'La sesión no tiene una sesión de WhatsApp asociada'
      }, { status: 404 });
    }

    const whatsappSession = Array.isArray(sesion.whatsapp_session) ? sesion.whatsapp_session[0] : sesion.whatsapp_session;

    if (!whatsappSession || !whatsappSession.session_id) {
      console.error('Sesión de WhatsApp inválida');
      return NextResponse.json({
        success: false,
        error: 'Sesión de WhatsApp no configurada correctamente'
      }, { status: 404 });
    }

    // Buscar o crear contacto
    const cleanPhoneNumber = telefono.replace(/[\s-]/g, '');
    
    // Verificar si el número contiene @lid (formato especial de WhatsApp)
    const isWhatsAppJid = cleanPhoneNumber.includes('@lid');
    
    let findContactResponse: Response;
    
    if (isWhatsAppJid) {
      // Si contiene @lid, buscar por whatsapp_jid
      console.log(`Buscando contacto por whatsapp_jid: ${cleanPhoneNumber}`);
      findContactResponse = await fetch(`${supabaseConfig.restUrl}/contactos?whatsapp_jid=eq.${cleanPhoneNumber}`, {
        method: 'GET',
        headers: getHeaders(request)
      });
    } else {
      // Si no contiene @lid, buscar por teléfono normal
      console.log(`Buscando contacto por teléfono: ${cleanPhoneNumber}`);
      findContactResponse = await fetch(`${supabaseConfig.restUrl}/contactos?telefono=eq.${cleanPhoneNumber}`, {
        method: 'GET',
        headers: getHeaders(request)
      });
    }

    let contactId: number;
    
    if (findContactResponse.ok) {
      const contacts = await handleResponse(findContactResponse);
      if (Array.isArray(contacts) && contacts.length > 0) {
        contactId = contacts[0].id;
      } else {
        // Crear nuevo contacto
        const newContactData: {
          nombre: string;
          correo: null;
          creado_por: number;
          nombre_completo: string;
          telefono?: string;
          whatsapp_jid?: string;
        } = {
          nombre: `Usuario ${cleanPhoneNumber}`,
          correo: null,
          creado_por: sesion.usuario_id,
          nombre_completo: `Usuario ${cleanPhoneNumber}`
        };

        if (isWhatsAppJid) {
          // Si es un JID de WhatsApp, guardarlo en whatsapp_jid y no en telefono
          newContactData.whatsapp_jid = cleanPhoneNumber;
          console.log(`Creando nuevo contacto con whatsapp_jid: ${cleanPhoneNumber}`);
        } else {
          // Si es un teléfono normal, guardarlo en telefono
          newContactData.telefono = cleanPhoneNumber;
          console.log(`Creando nuevo contacto con teléfono: ${cleanPhoneNumber}`);
        }

        const createContactResponse = await fetch(`${supabaseConfig.restUrl}/contactos`, {
          method: 'POST',
          headers: getHeaders(request),
          body: JSON.stringify(newContactData)
        });

        if (createContactResponse.ok) {
          const newContact = await handleResponse(createContactResponse);
          const contact = Array.isArray(newContact) ? newContact[0] : newContact;
          contactId = contact?.id;
        } else {
          console.error('Error al crear contacto');
          return NextResponse.json({
            success: false,
            error: 'Error al crear contacto'
          }, { status: 500 });
        }
      }
    } else {
      console.error('Error buscando contacto');
      return NextResponse.json({
        success: false,
        error: 'Error al buscar contacto'
      }, { status: 500 });
    }

    // Buscar o crear chat
    const findChatResponse = await fetch(`${supabaseConfig.restUrl}/chats?sesion_id=eq.${sesion.id}&contact_id=eq.${contactId}`, {
      method: 'GET',
      headers: getHeaders(request)
    });

    let chatId: string;

    if (findChatResponse.ok) {
      const chats = await handleResponse(findChatResponse);
      if (Array.isArray(chats) && chats.length > 0) {
        chatId = chats[0].id;
      } else {
        // Crear nuevo chat
        const newChatData = {
          sesion_id: sesion.id,
          contact_id: contactId,
          embudo_id: sesion.embudo_id
        };

        const createChatResponse = await fetch(`${supabaseConfig.restUrl}/chats`, {
          method: 'POST',
          headers: getHeaders(request),
          body: JSON.stringify(newChatData)
        });

        if (createChatResponse.ok) {
          const newChat = await handleResponse(createChatResponse);
          const chat = Array.isArray(newChat) ? newChat[0] : newChat;
          chatId = chat?.id;
        } else {
          console.error('Error al crear chat');
          return NextResponse.json({
            success: false,
            error: 'Error al crear chat'
          }, { status: 500 });
        }
      }
    } else {
      console.error('Error buscando chat');
      return NextResponse.json({
        success: false,
        error: 'Error al buscar chat'
      }, { status: 500 });
    }

    // Enviar mensaje al orquestador de WhatsApp
    const orchestratorUrl = `${WHATSAPP_CONFIG.ORCHESTRATOR_BASE_URL}/sessions/${whatsappSession.session_id}/send-message`;
    
    const orchestratorPayload = {
      number: telefono,
      message: mensaje
    };

    const orchestratorResponse = await fetch(orchestratorUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orchestratorPayload)
    });

    if (!orchestratorResponse.ok) {
      const errorText = await orchestratorResponse.text();
      console.error('Error del orquestador:', orchestratorResponse.status, errorText);
      return NextResponse.json({
        success: false,
        error: 'Error al enviar mensaje al orquestador',
        details: errorText
      }, { status: orchestratorResponse.status });
    }

    const orchestratorData = await orchestratorResponse.json();
    console.log('Respuesta del orquestador:', orchestratorData);

    // Crear el mensaje en nuestra base de datos con fromMe: true
    const messageContent = {
      whatsapp_message_id: orchestratorData.messageId || `temp_${Date.now()}`,
      sender_name: 'Usuario', // Nombre del usuario que envía
      sender_phone_number: whatsappSession.phone_number || 'unknown',
      recipient_name: `Usuario ${cleanPhoneNumber}`,
      recipient_phone_number: cleanPhoneNumber,
      message_content: mensaje,
      message_type: 'text',
      media_info: {},
      raw_message: {
        key: {
          remoteJid: `${cleanPhoneNumber}@s.whatsapp.net`,
          fromMe: true, // Importante: marcamos como enviado por nosotros
          id: orchestratorData.messageId || `temp_${Date.now()}`
        },
        messageTimestamp: Date.now(),
        pushName: 'Usuario',
        broadcast: false,
        message: {
          conversation: mensaje
        }
      },
      received_at: new Date().toISOString(),
      phone_number_session: whatsappSession.phone_number || 'unknown'
    };

    const newMessageData = {
      remitente_id: sesion.usuario_id, // El usuario que envía el mensaje
      contacto_id: contactId,
      chat_id: chatId,
      type: 'whatsapp_api',
      content: messageContent,
      creado_en: new Date().toISOString()
    };

    const createMessageResponse = await fetch(`${supabaseConfig.restUrl}/mensajes`, {
      method: 'POST',
      headers: getHeaders(request),
      body: JSON.stringify(newMessageData)
    });

    if (!createMessageResponse.ok) {
      console.error('Error creando mensaje:', createMessageResponse.status, createMessageResponse.statusText);
      return NextResponse.json({
        success: false,
        error: 'Error al guardar el mensaje',
        details: createMessageResponse.statusText
      }, { status: createMessageResponse.status });
    }

    const savedMessage = await handleResponse(createMessageResponse);
    
    return NextResponse.json({
      success: true,
      message: 'Mensaje enviado correctamente',
      data: {
        message: Array.isArray(savedMessage) ? savedMessage[0] : savedMessage,
        contact_id: contactId,
        chat_id: chatId,
        orchestrator_response: orchestratorData
      }
    });

  } catch (error) {
    console.error('Error inesperado en mensajes/enviar/whatsapp:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

/**
 * Maneja métodos no soportados
 */
export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'Método no permitido'
  }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({
    success: false,
    error: 'Método no permitido'
  }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({
    success: false,
    error: 'Método no permitido'
  }, { status: 405 });
}

export async function PATCH() {
  return NextResponse.json({
    success: false,
    error: 'Método no permitido'
  }, { status: 405 });
}
