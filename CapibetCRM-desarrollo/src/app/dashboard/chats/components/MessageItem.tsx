'use client';

import { memo } from 'react';
import { Trash2 } from 'lucide-react';
import { MensajeResponse } from '@/app/api/mensajes/domain/mensaje';

interface MensajeConUI extends MensajeResponse {
  leido?: boolean;
  estado?: 'enviado' | 'entregado' | 'leido';
}

interface MessageItemProps {
  message: MensajeConUI;
  isSelected: boolean;
  isHovered: boolean;
  hasSelectedMessages: boolean;
  isLastInGroup: boolean;
  onToggleSelection: (messageId: string) => void;
  onMouseEnter: (messageId: string) => void;
  onMouseLeave: () => void;
}

/**
 * Determina si un mensaje fue enviado por nosotros
 */
const isMessageFromMe = (message: MensajeResponse): boolean => {
  if (message.type !== 'whatsapp_qr') {
    return message.remitente_id !== null;
  }

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
 * Extrae el contenido del mensaje
 */
const getMessageContent = (message: MensajeResponse): string => {
  if (typeof message.content === 'object' && message.content) {
    if ('message_content' in message.content && typeof message.content.message_content === 'string') {
      return message.content.message_content;
    }
    
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

/**
 * Verifica si un mensaje es de tipo imagen
 */
const isImageMessage = (message: MensajeResponse): boolean => {
  if (typeof message.content === 'object' && message.content) {
    if ('message_type' in message.content && message.content.message_type === 'image') {
      return true;
    }
  }
  return false;
};

/**
 * Obtiene la imagen comprimida en base64
 */
const getImageCompressed = (message: MensajeResponse): string | null => {
  if (typeof message.content === 'object' && message.content) {
    if ('image_compressed' in message.content && typeof message.content.image_compressed === 'string') {
      return message.content.image_compressed;
    }
  }
  return null;
};

/**
 * Obtiene el MIME type de la imagen
 */
const getImageMimetype = (message: MensajeResponse): string | null => {
  if (typeof message.content === 'object' && message.content) {
    if ('image_mimetype' in message.content && typeof message.content.image_mimetype === 'string') {
      return message.content.image_mimetype;
    }
  }
  return null;
};

/**
 * Formatea la hora del mensaje
 */
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

/**
 * Maneja el click en la imagen para abrirla
 */
const handleImageClick = (imageCompressed: string, imageMimetype: string | null) => {
  const byteCharacters = atob(imageCompressed);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: imageMimetype || 'image/jpeg' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Componente individual de mensaje - Memoizado para evitar re-renders innecesarios
 */
const MessageItem = memo(function MessageItem({
  message,
  isSelected,
  isHovered,
  hasSelectedMessages,
  isLastInGroup,
  onToggleSelection,
  onMouseEnter,
  onMouseLeave
}: MessageItemProps) {
  const fromMe = isMessageFromMe(message);
  const isImage = isImageMessage(message);
  const imageCompressed = getImageCompressed(message);
  const imageMimetype = getImageMimetype(message);

  return (
    <div
      className={`w-full flex items-center gap-2 py-[2px] transition-colors ${
        isLastInGroup ? 'mb-3' : ''
      } ${
        hasSelectedMessages 
          ? `cursor-pointer hover:bg-[var(--bg-secondary)]/50 ${isSelected ? 'bg-[var(--bg-secondary)]/50' : ''}`
          : ''
      }`}
      onMouseEnter={() => onMouseEnter(message.id)}
      onMouseLeave={onMouseLeave}
      onClick={() => hasSelectedMessages && onToggleSelection(message.id)}
    >
      {/* Checkbox al inicio de la línea - solo mostrar si hay mensajes seleccionados */}
      {hasSelectedMessages && (
        <div className="flex-shrink-0 pl-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelection(message.id);
            }}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              isSelected 
                ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' 
                : 'border-[var(--text-muted)] hover:border-[var(--accent-primary)]'
            }`}
          >
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Contenedor del mensaje con alineación */}
      <div className={`flex-1 flex items-center gap-2 ${fromMe ? 'justify-end' : 'justify-start'}`}>
        {/* Icono de eliminar a la izquierda (para mensajes salientes) */}
        {fromMe && isHovered && !hasSelectedMessages && (
          <div className="flex-shrink-0">
            <button
              onClick={() => onToggleSelection(message.id)}
              className="w-6 h-6 rounded-full bg-[var(--bg-secondary)] hover:bg-red-500/20 border border-[var(--border-primary)] flex items-center justify-center transition-colors group"
              title="Eliminar mensaje"
            >
              <Trash2 className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-red-500" />
            </button>
          </div>
        )}

        {/* Mensaje */}
        <div className="flex-shrink-0 max-w-[40%]">
          <div
            className={`relative px-3 py-2 break-words ${
              fromMe
                ? 'bg-[#075E54] text-white rounded-[18px] rounded-tr-[4px]'
                : 'bg-[#3A3A3A] text-white rounded-[18px] rounded-tl-[4px]'
            }`}
          >
            {isImage && imageCompressed && (
              <div className="mb-2 max-h-[400px] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:${imageMimetype};base64,${imageCompressed}`}
                  alt="Imagen del mensaje"
                  className="rounded-lg max-w-full max-h-[400px] w-auto h-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => handleImageClick(imageCompressed, imageMimetype)}
                />
              </div>
            )}
            
            <p className="text-sm leading-relaxed">
              {getMessageContent(message)}
            </p>
            
            <div className={`flex items-center justify-end mt-1 ${
              fromMe ? 'text-white' : 'text-white'
            }`}>
              <span className="text-[10px] opacity-75">
                {formatTime(message.creado_en)}
              </span>
            </div>
          </div>
        </div>

        {/* Icono de eliminar a la derecha (para mensajes entrantes) */}
        {!fromMe && isHovered && !hasSelectedMessages && (
          <div className="flex-shrink-0">
            <button
              onClick={() => onToggleSelection(message.id)}
              className="w-6 h-6 rounded-full bg-[var(--bg-secondary)] hover:bg-red-500/20 border border-[var(--border-primary)] flex items-center justify-center transition-colors group"
              title="Eliminar mensaje"
            >
              <Trash2 className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-red-500" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default MessageItem;

