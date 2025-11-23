import { WebSocketEvents } from './types';

/**
 * Emite un evento SSE mediante POST request interno
 * Esto asegura que use la misma instancia del servidor SSE
 */
export async function emitRealtimeEvent<K extends keyof WebSocketEvents>(
  event: K,
  data: WebSocketEvents[K]
): Promise<void> {
  try {
    console.log(`🔊 Emitiendo evento ${event} mediante POST interno`);
    
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: event,
        data: data
      })
    });

    if (!response.ok) {
      console.error(`Error emitiendo evento ${event}:`, response.status, response.statusText);
      return;
    }

    const result = await response.json();
    console.log(`📈 Evento ${event} emitido:`, result);
    
    if (result.activeConnections === 0) {
      console.warn(`⚠️ No hay conexiones SSE activas para el evento ${event}`);
    }
  } catch (error) {
    console.error('Error emitiendo evento SSE:', error);
    // No lanzar error para no interrumpir el flujo principal
  }
}

/**
 * Emite un nuevo mensaje de chat a todos los usuarios conectados al chat
 */
export async function emitNewChatMessage(
  chatId: string,
  message: any,
  contact: any
): Promise<void> {
  await emitRealtimeEvent('chat:new_message', {
    chat_id: chatId,
    message: {
      id: message.id,
      content: message.content,
      creado_en: message.creado_en,
      remitente_id: message.remitente_id,
      contacto_id: message.contacto_id
    },
    contact: {
      id: contact.id,
      nombre: contact.nombre,
      telefono: contact.telefono,
      whatsapp_jid: contact.whatsapp_jid
    }
  });
}

/**
 * Emite una nueva notificación a un usuario específico
 */
export async function emitNewNotification(
  userId: string,
  notification: any
): Promise<void> {
  await emitRealtimeEvent('notification:new', {
    notification: {
      id: notification.id,
      titulo: notification.titulo,
      mensaje: notification.mensaje,
      tipo: notification.tipo,
      fecha: notification.creado_en || notification.fecha || new Date().toISOString(),
      leida: notification.leida,
      data: notification.data
    },
    user_id: userId
  });
}
