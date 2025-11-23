import { supabaseConfig } from '@/config/supabase';
import { getSupabaseHeaders } from '@/utils/supabaseHeaders';
import { emitNewNotification } from '@/lib/websocket/emitter';

/**
 * Tipos de notificaciones
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

/**
 * Datos para crear una notificación
 */
export interface CreateNotificationData {
  user_id: string;
  titulo: string;
  mensaje: string;
  tipo: NotificationType;
  prioridad?: number;
  accion_url?: string;
  data?: any;
}

/**
 * Obtiene todos los usuarios de una organización
 */
async function getUsersByOrganizacion(organizacion_id: string): Promise<Array<{ id: string }>> {
  try {
    const response = await fetch(
      `${supabaseConfig.restUrl}/usuarios?organizacion_id=eq.${organizacion_id}&select=id`,
      {
        method: 'GET',
        headers: getSupabaseHeaders(null)
      }
    );

    if (!response.ok) {
      console.error('Error obteniendo usuarios de la organización:', response.status);
      return [];
    }

    const users = await response.json();
    return Array.isArray(users) ? users : [];
  } catch (error) {
    console.error('Error obteniendo usuarios de la organización:', error);
    return [];
  }
}

/**
 * Crea una notificación en la base de datos y la emite por WebSocket
 */
export async function createNotification(data: CreateNotificationData): Promise<void> {
  try {
    // Crear la notificación en la base de datos
    const notificationData = {
      usuario_id: data.user_id,
      titulo: data.titulo,
      mensaje: data.mensaje,
      tipo: data.tipo,
      prioridad: data.prioridad || 3,
      accion_url: data.accion_url || null,
      data: data.data || null,
      leida: false,
      enviada_push: false,
      enviada_email: false,
      creado_en: new Date().toISOString()
    };

    const response = await fetch(`${supabaseConfig.restUrl}/notificaciones`, {
      method: 'POST',
      headers: getSupabaseHeaders(null, { preferRepresentation: true }),
      body: JSON.stringify(notificationData)
    });

    if (!response.ok) {
      console.error('Error creando notificación:', response.status, response.statusText);
      return;
    }

    const savedNotification = await response.json();
    const notification = Array.isArray(savedNotification) ? savedNotification[0] : savedNotification;

    // Emitir la notificación por WebSocket
    await emitNewNotification(data.user_id, notification);

    console.log(`📢 Notificación creada: ${data.titulo} para usuario ${data.user_id}`);

  } catch (error) {
    console.error('Error creando notificación:', error);
  }
}

/**
 * Crea notificaciones para todos los usuarios de una organización
 */
export async function createNotificationForOrganization(
  organizacion_id: string,
  notificationData: Omit<CreateNotificationData, 'user_id'>
): Promise<void> {
  try {
    // Obtener todos los usuarios de la organización
    const users = await getUsersByOrganizacion(organizacion_id);

    if (users.length === 0) {
      console.warn(`No se encontraron usuarios en la organización ${organizacion_id}`);
      return;
    }

    console.log(`📢 Creando notificación para ${users.length} usuarios de la organización ${organizacion_id}`);

    // Crear notificación para cada usuario
    const promises = users.map(user => 
      createNotification({
        ...notificationData,
        user_id: user.id
      })
    );

    await Promise.all(promises);

    console.log(`✅ Notificaciones creadas exitosamente para todos los usuarios`);

  } catch (error) {
    console.error('Error creando notificaciones para la organización:', error);
  }
}

/**
 * Crea notificaciones para nuevo mensaje en toda la organización
 */
export async function createNewMessageNotification(
  organizacion_id: string,
  contactName: string,
  messageContent: string,
  chatId: string,
  contactId: string,
  messageId: string
): Promise<void> {
  // Truncar el mensaje si es muy largo
  const truncatedMessage = messageContent.length > 100 
    ? messageContent.substring(0, 100) + '...' 
    : messageContent;

  await createNotificationForOrganization(organizacion_id, {
    titulo: `Nuevo mensaje de ${contactName}`,
    mensaje: truncatedMessage,
    tipo: 'info',
    prioridad: 3,
    accion_url: `/dashboard/chats?chat_id=${chatId}`,
    data: {
      chat_id: chatId,
      contact_id: contactId,
      message_id: messageId,
      type: 'new_message'
    }
  });
}

/**
 * Crea notificaciones para nueva sesión de WhatsApp conectada en toda la organización
 */
export async function createNewSessionNotification(
  organizacion_id: string,
  phoneNumber: string
): Promise<void> {
  await createNotificationForOrganization(organizacion_id, {
    titulo: 'Nueva sesión de WhatsApp conectada',
    mensaje: `La sesión ${phoneNumber} se ha conectado exitosamente`,
    tipo: 'success',
    prioridad: 4,
    accion_url: '/dashboard/configuracion?tab=canales',
    data: {
      type: 'new_session',
      phone_number: phoneNumber
    }
  });
}
