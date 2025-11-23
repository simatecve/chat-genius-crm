// Tipos compartidos para los endpoints de WhatsApp

/**
 * Estados posibles de una sesión de WhatsApp
 */
export type WhatsAppSessionStatus = 'connected' | 'disconnected' | 'expired' | 'pending';

/**
 * Tipos de mensajes de WhatsApp soportados
 */
export type WhatsAppMessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact' | 'sticker';

/**
 * Payload para actualización de estado de sesión
 */
export interface StatusUpdatePayload {
  session_id: string;
  status: WhatsAppSessionStatus;
  last_seen?: string;
  phone_number?: string;
  whatsapp_user_id?: string;
  auth_folder_path?: string;
  server_port?: number | null;
}

/**
 * Estructura de un mensaje de WhatsApp
 */
export interface WhatsAppMessage {
  type: WhatsAppMessageType;
  text?: string;
  image?: {
    id: string;
    url?: string;
    caption?: string;
  };
  video?: {
    id: string;
    url?: string;
    caption?: string;
  };
  audio?: {
    id: string;
    url?: string;
  };
  document?: {
    id: string;
    url?: string;
    filename?: string;
    caption?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  contact?: {
    name: string;
    phones: string[];
  };
  sticker?: {
    id: string;
    url?: string;
  };
}

/**
 * Estructura del mensaje raw de WhatsApp (del orquestador)
 */
export interface WhatsAppRawMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  messageTimestamp: number;
  pushName: string;
  broadcast: boolean;
  message: {
    conversation?: string;
    messageContextInfo?: any;
    [key: string]: any;
  };
}

/**
 * Información de medios (imágenes, videos, etc.)
 */
export interface WhatsAppMediaInfo {
  id?: string;
  url?: string;
  filename?: string;
  caption?: string;
  mimetype?: string;
  size?: number;
}

/**
 * Payload para mensaje recibido de WhatsApp (estructura real)
 */
export interface WhatsAppMessagePayload {
  session_id: string;
  sender_name: string;
  sender_phone_number: string;
  sender_account_type: string;
  sender_jid: string;
  sender_participant: string;
  recipient_name: string;
  recipient_phone_number: string;
  recipient_whatsapp_id: string;
  recipient_account_type: string;
  recipient_session_id?: string | null;
  chat_jid: string;
  message_content: string;
  message_type: WhatsAppMessageType;
  media_info: WhatsAppMediaInfo;
  raw_message: WhatsAppRawMessage;
  received_at: string;
  phone_number_session: string;
  image_compressed?: string;
  image_mimetype?: string;
}

/**
 * Payload para actualización de QR
 */
export interface QRUpdatePayload {
  session_id: string;
  qr_code: string;
  qr_url?: string;
  timestamp: string;
}

/**
 * Respuesta estándar de los endpoints de WhatsApp
 */
export interface WhatsAppApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: string;
}

/**
 * Datos de respuesta para mensaje procesado
 */
export interface ProcessedMessageData {
  message: any; // MensajeResponse
  contact_id: number;
  chat_id: number;
}

/**
 * Datos de respuesta para QR actualizado
 */
export interface QRUpdateData {
  session: any; // WhatsAppSessionResponse
  qr_code: string;
  qr_url?: string;
  timestamp: string;
}
