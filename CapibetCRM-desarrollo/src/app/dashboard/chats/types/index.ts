/**
 * Tipos compartidos para el módulo de chats
 */

import { ContactResponse } from '@/services/contactoServices';
import { SesionResponse } from '@/app/api/sesiones/domain/sesion';
import { ChatResponse } from '@/app/api/chats/domain/chat';
import { MensajeResponse } from '@/app/api/mensajes/domain/mensaje';

/**
 * Interfaz para un chat completo con toda su información
 */
export interface Chat {
  id: string;
  contacto: ContactResponse;
  ultimoMensaje?: MensajeResponse;
  sesion: SesionResponse;
  chat_data: ChatResponse;
  estado: 'activo' | 'archivado' | 'pausado';
}

/**
 * Mensaje con información adicional de UI
 */
export interface MensajeConUI extends MensajeResponse {
  leido?: boolean;
  estado?: 'enviado' | 'entregado' | 'leido';
}

/**
 * Información del menú contextual
 */
export interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  chatId: string | null;
  chatName: string;
}

