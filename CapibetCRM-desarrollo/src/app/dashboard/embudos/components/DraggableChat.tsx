'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import Image from 'next/image';
import { ContactResponse } from '@/services/contactoServices';
import { SesionResponse } from '@/app/api/sesiones/domain/sesion';
import { ChatResponse } from '@/app/api/chats/domain/chat';
import { MensajeResponse } from '@/app/api/mensajes/domain/mensaje';

interface Chat {
  id: string;
  contacto: ContactResponse;
  ultimoMensaje?: MensajeResponse;
  sesion: SesionResponse;
  chat_data: ChatResponse;
  estado: 'activo' | 'archivado' | 'pausado';
}

interface DraggableChatProps {
  chat: Chat;
  onChatClick: (chat: Chat) => void;
  isMoving?: boolean;
}

// Función helper para extraer el contenido del mensaje
const getMessageContent = (message: MensajeResponse): string => {
  if (typeof message.content === 'object' && message.content) {
    // Para mensajes de WhatsApp API y WhatsApp QR
    if ('message_content' in message.content && typeof message.content.message_content === 'string') {
      return message.content.message_content;
    }
    
    // Para mensajes de WhatsApp QR, también verificar en raw_message
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
  }
  return 'Mensaje multimedia o no disponible';
};

const formatTime = (dateString: string) => {
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

export default function DraggableChat({ chat, onChatClick, isMoving = false }: DraggableChatProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `chat-${chat.id}`,
    data: {
      type: 'chat',
      chat: chat
    }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onChatClick(chat)}
      className={`p-3 border border-[var(--border-primary)] rounded-lg cursor-pointer hover:bg-[var(--bg-primary)] transition-colors bg-[var(--bg-secondary)] ${
        isDragging ? 'opacity-50 z-50' : ''
      } ${
        isMoving ? 'opacity-75 animate-pulse' : ''
      }`}
    >
      <div className="flex items-center space-x-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
          {chat.sesion.type === 'whatsapp_qr' || chat.sesion.type === 'whatsapp_api' ? (
            <Image 
              src="/wpp_logo.svg" 
              alt="WhatsApp" 
              width={32} 
              height={32} 
            />
          ) : (
            <div className="w-10 h-10 bg-[#F29A1F] rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
          )}
        </div>

        {/* Información del chat */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <h3 className="text-[var(--text-primary)] font-medium truncate text-sm">{chat.contacto.nombre}</h3>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[var(--text-muted)] text-xs">
                {chat.ultimoMensaje ? formatTime(chat.ultimoMensaje.creado_en) : formatTime(chat.chat_data.created_at || '')}
              </span>
              {chat.chat_data.nuevos_mensajes && (
                <span className="bg-[var(--accent-primary)] rounded-full w-2.5 h-2.5"></span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[var(--text-muted)] text-xs truncate flex-1">
              {chat.ultimoMensaje ? getMessageContent(chat.ultimoMensaje) : 'Sin mensajes'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
