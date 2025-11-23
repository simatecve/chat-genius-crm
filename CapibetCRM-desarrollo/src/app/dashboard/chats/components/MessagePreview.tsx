/**
 * Preview del último mensaje en la lista de chats
 * Soporta diferentes tipos de contenido según el canal
 */

import { ImageIcon } from 'lucide-react';
import { MensajeResponse } from '@/app/api/mensajes/domain/mensaje';
import { getMessageContent, isImageMessage, getMediaType } from '../utils/messageUtils';

interface MessagePreviewProps {
  message: MensajeResponse;
  channelType: string;
}

export default function MessagePreview({ message, channelType }: MessagePreviewProps) {
  const mediaType = getMediaType(message);

  // Renderizar preview según el tipo de contenido
  switch (mediaType) {
    case 'image':
      return (
        <div className="flex items-center space-x-2 text-[var(--text-muted)] text-sm">
          <ImageIcon className="w-4 h-4" />
          <span>Foto</span>
        </div>
      );
    
    case 'video':
      return (
        <div className="flex items-center space-x-2 text-[var(--text-muted)] text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Video</span>
        </div>
      );
    
    case 'file':
      return (
        <div className="flex items-center space-x-2 text-[var(--text-muted)] text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Archivo</span>
        </div>
      );
    
    case 'audio':
      return (
        <div className="flex items-center space-x-2 text-[var(--text-muted)] text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <span>Audio</span>
        </div>
      );
    
    case 'text':
    default:
      return (
        <p className="text-[var(--text-muted)] text-sm truncate flex-1 max-w-[400px]">
          {getMessageContent(message)}
        </p>
      );
  }
}

