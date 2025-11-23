'use client';

import { useEffect } from 'react';
import { useRealtimeConnection } from './useRealtimeConnection';
import { MensajeResponse } from '@/app/api/mensajes/domain/mensaje';
import { ChatNewMessageEvent } from '@/lib/websocket/types';

/**
 * Props para el hook de chat con SSE
 */
interface UseChatSSEProps {
  chatId: string;
  onNewMessage: (message: MensajeResponse) => void;
}

/**
 * Hook para manejar actualizaciones en tiempo real de un chat específico usando SSE
 */
export function useChatSSE({ 
  chatId, 
  onNewMessage 
}: UseChatSSEProps) {
  const { isConnected, on, off } = useRealtimeConnection();

  // Escuchar nuevos mensajes del chat
  useEffect(() => {
    if (!isConnected || !chatId) return;

    const handleNewMessage = (eventData: ChatNewMessageEvent) => {
      try {
        // Solo procesar eventos de nuevos mensajes del chat actual
        if (eventData.chat_id === chatId) {
          // Convertir el mensaje al formato esperado por MensajeResponse
          const messageResponse: MensajeResponse = {
            id: eventData.message.id,
            content: eventData.message.content,
            creado_en: eventData.message.creado_en,
            remitente_id: eventData.message.remitente_id || null,
            contacto_id: eventData.message.contacto_id,
            chat_id: chatId,
            type: 'whatsapp_api'
          };

          onNewMessage(messageResponse);
        }
      } catch (error) {
        console.error('Error procesando mensaje SSE:', error);
      }
    };

    // Suscribirse al evento de nuevos mensajes
    on('chat:new_message', handleNewMessage);

    // Cleanup
    return () => {
      off('chat:new_message', handleNewMessage);
    };
  }, [isConnected, chatId, onNewMessage, on, off]);

  return {
    isConnected
  };
}
