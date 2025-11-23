/**
 * Tipos para el sistema de conexiones en tiempo real (SSE)
 */

// Eventos de Chat
export interface ChatNewMessageEvent {
  chat_id: string;
  message: {
    id: string;
    content: any;
    creado_en: string;
    remitente_id?: string | null;
    contacto_id: string;
  };
  contact: {
    id: string;
    nombre: string;
    telefono?: string;
    whatsapp_jid?: string;
  };
}

// Eventos de Notificaciones
export interface NotificationNewEvent {
  notification: {
    id: string;
    titulo: string;
    mensaje: string;
    tipo: 'info' | 'success' | 'warning' | 'error';
    fecha: string;
    leida: boolean;
    data?: any;
  };
  user_id: string;
}

// Tipos de eventos en tiempo real
export type WebSocketEvents = {
  'chat:new_message': ChatNewMessageEvent;
  'notification:new': NotificationNewEvent;
};