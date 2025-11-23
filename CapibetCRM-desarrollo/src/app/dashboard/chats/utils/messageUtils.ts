/**
 * Utilidades para manejo de mensajes multi-canal
 * Abstrae las diferencias entre formatos de mensajes de diferentes canales
 */

import { MensajeResponse } from '@/app/api/mensajes/domain/mensaje';

/**
 * Extrae el contenido de texto de un mensaje según su canal
 */
export const getMessageContent = (message: MensajeResponse): string => {
  if (typeof message.content === 'object' && message.content) {
    // Formato estándar con message_content
    if ('message_content' in message.content && typeof message.content.message_content === 'string') {
      return message.content.message_content;
    }
    
    // Formato WhatsApp QR con raw_message
    if (message.type === 'whatsapp_qr' && 
        'raw_message' in message.content &&
        typeof message.content.raw_message === 'object' &&
        message.content.raw_message &&
        'message' in message.content.raw_message &&
        typeof message.content.raw_message.message === 'object' &&
        message.content.raw_message.message &&
        'conversation' in message.content.raw_message.message &&
        typeof message.content.raw_message.message.conversation === 'string') {
      return message.content.raw_message.message.conversation;
    }

    // Formato Messenger
    if (message.type === 'messenger' && 
        'text' in message.content && 
        typeof message.content.text === 'string') {
      return message.content.text;
    }

    // Formato Telegram
    if ((message.type === 'telegram' || message.type === 'telegram_bot') && 
        'text' in message.content && 
        typeof message.content.text === 'string') {
      return message.content.text;
    }
  }
  
  return 'Mensaje multimedia o no disponible';
};

/**
 * Verifica si un mensaje es de tipo imagen
 */
export const isImageMessage = (message: MensajeResponse): boolean => {
  if (typeof message.content === 'object' && message.content) {
    if ('message_type' in message.content && message.content.message_type === 'image') {
      return true;
    }

    // WhatsApp QR formato
    if (message.type === 'whatsapp_qr' &&
        'raw_message' in message.content &&
        typeof message.content.raw_message === 'object' &&
        message.content.raw_message &&
        'message' in message.content.raw_message &&
        typeof message.content.raw_message.message === 'object' &&
        message.content.raw_message.message &&
        'imageMessage' in message.content.raw_message.message) {
      return true;
    }

    // Messenger formato
    if (message.type === 'messenger' &&
        'attachments' in message.content &&
        Array.isArray(message.content.attachments) &&
        message.content.attachments.some((att: any) => att.type === 'image')) {
      return true;
    }

    // Telegram formato
    if ((message.type === 'telegram' || message.type === 'telegram_bot') &&
        'photo' in message.content) {
      return true;
    }
  }
  
  return false;
};

/**
 * Verifica si un mensaje es de tipo video
 */
export const isVideoMessage = (message: MensajeResponse): boolean => {
  if (typeof message.content === 'object' && message.content) {
    if ('message_type' in message.content && message.content.message_type === 'video') {
      return true;
    }

    // WhatsApp QR formato
    if (message.type === 'whatsapp_qr' &&
        'raw_message' in message.content &&
        typeof message.content.raw_message === 'object' &&
        message.content.raw_message &&
        'message' in message.content.raw_message &&
        typeof message.content.raw_message.message === 'object' &&
        message.content.raw_message.message &&
        'videoMessage' in message.content.raw_message.message) {
      return true;
    }

    // Messenger y Telegram formatos similares
    if ((message.type === 'messenger' || message.type === 'telegram' || message.type === 'telegram_bot') &&
        'video' in message.content) {
      return true;
    }
  }
  
  return false;
};

/**
 * Verifica si un mensaje es de tipo archivo
 */
export const isFileMessage = (message: MensajeResponse): boolean => {
  if (typeof message.content === 'object' && message.content) {
    if ('message_type' in message.content && 
        (message.content.message_type === 'document' || message.content.message_type === 'file')) {
      return true;
    }

    // WhatsApp QR formato
    if (message.type === 'whatsapp_qr' &&
        'raw_message' in message.content &&
        typeof message.content.raw_message === 'object' &&
        message.content.raw_message &&
        'message' in message.content.raw_message &&
        typeof message.content.raw_message.message === 'object' &&
        message.content.raw_message.message &&
        'documentMessage' in message.content.raw_message.message) {
      return true;
    }
  }
  
  return false;
};

/**
 * Determina si un mensaje fue enviado por el usuario actual
 */
export const isMessageFromMe = (message: MensajeResponse): boolean => {
  // Para canales que no sean WhatsApp QR, usar remitente_id
  if (message.type !== 'whatsapp_qr') {
    return message.remitente_id !== null;
  }

  // Para WhatsApp QR, verificar el campo fromMe en raw_message
  if (typeof message.content === 'object' && 
      message.content &&
      'raw_message' in message.content &&
      typeof message.content.raw_message === 'object' &&
      message.content.raw_message &&
      'key' in message.content.raw_message &&
      typeof message.content.raw_message.key === 'object' &&
      message.content.raw_message.key &&
      'fromMe' in message.content.raw_message.key) {
    return Boolean(message.content.raw_message.key.fromMe);
  }

  return message.remitente_id !== null;
};

/**
 * Filtra mensajes según el tipo de canal
 */
export const filterMessagesByChannel = (messages: MensajeResponse[], channelType: string): MensajeResponse[] => {
  // WhatsApp QR acepta ambos tipos de mensajes de WhatsApp
  if (channelType === 'whatsapp_qr') {
    return messages.filter(mensaje => 
      mensaje.type === 'whatsapp_qr' || mensaje.type === 'whatsapp_api'
    );
  }

  // Otros canales filtran por coincidencia exacta
  return messages.filter(mensaje => mensaje.type === channelType);
};

/**
 * Formatea un timestamp para mostrar en la UI
 */
export const formatMessageTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch {
    return '';
  }
};

/**
 * Obtiene el tipo de contenido multimedia de un mensaje
 */
export const getMediaType = (message: MensajeResponse): 'text' | 'image' | 'video' | 'file' | 'audio' | 'unknown' => {
  if (isImageMessage(message)) return 'image';
  if (isVideoMessage(message)) return 'video';
  if (isFileMessage(message)) return 'file';
  
  if (typeof message.content === 'object' && message.content) {
    if ('message_type' in message.content) {
      const type = message.content.message_type as string;
      if (['audio', 'voice', 'ptt'].includes(type)) return 'audio';
      if (type === 'text') return 'text';
    }
  }
  
  const content = getMessageContent(message);
  return content !== 'Mensaje multimedia o no disponible' ? 'text' : 'unknown';
};

