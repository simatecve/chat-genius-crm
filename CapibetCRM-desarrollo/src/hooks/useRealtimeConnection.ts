'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketEvents } from '@/lib/websocket/types';
import { isUserAuthenticated } from '@/utils/auth';

type EventCallback<K extends keyof WebSocketEvents> = (data: WebSocketEvents[K]) => void;
type EventListeners = Map<keyof WebSocketEvents, Set<EventCallback<any>>>;

// Singleton para la conexión SSE - se comparte entre todas las instancias
let globalEventSource: EventSource | null = null;
const globalListeners: EventListeners = new Map();
let connectionCount = 0;
let isConnecting = false;

/**
 * Hook unificado para manejar todas las conexiones en tiempo real usando SSE
 * Reemplaza useWebSocket, useServerSentEvents y simplifica useChatSSE y useNotificationsSSE
 */
export function useRealtimeConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Función para conectar SSE
  const connectSSE = useCallback(() => {
    // Si ya existe una conexión global activa, no crear otra
    if (globalEventSource && globalEventSource.readyState === EventSource.OPEN) {
      setIsConnected(true);
      setError(null);
      return;
    }

    // Si ya se está intentando conectar, no crear múltiples intentos
    if (isConnecting) {
      return;
    }

    isConnecting = true;

    // Crear nueva conexión SSE
    const eventSource = new EventSource('/api/events');
    globalEventSource = eventSource;

    // Event listeners
    eventSource.onopen = () => {
      isConnecting = false;
      if (mountedRef.current) {
        setIsConnected(true);
        setError(null);
        console.log('🔌 Conexión SSE establecida');
      }
    };

    eventSource.onerror = (error) => {
      isConnecting = false;
      console.error('❌ Error en SSE:', error);
      if (mountedRef.current) {
        setError('Error de conexión');
        setIsConnected(false);
      }
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 SSE Mensaje recibido:', data);
        
        // Manejar evento de conexión
        if (data.type === 'connected') {
          if (mountedRef.current) {
            setIsConnected(true);
            setError(null);
          }
          return;
        }

        // Notificar a los listeners suscritos a este tipo de evento
        const listeners = globalListeners.get(data.type);
        console.log(`🔍 Listeners para ${data.type}:`, listeners?.size || 0);
        
        if (listeners && listeners.size > 0) {
          listeners.forEach(callback => {
            try {
              console.log(`🔔 Ejecutando callback para ${data.type}`);
              callback(data.data);
            } catch (error) {
              console.error(`❌ Error ejecutando listener para ${data.type}:`, error);
            }
          });
        } else {
          console.warn(`⚠️ No hay listeners registrados para el evento: ${data.type}`);
        }
      } catch (error) {
        console.error('❌ Error parseando evento SSE:', error);
      }
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connectionCount++;

    // Verificar si el usuario está autenticado al montar
    if (isUserAuthenticated()) {
      connectSSE();
    }

    // Escuchar el evento de login para conectar automáticamente
    const handleUserLogin = () => {
      connectSSE();
    };

    window.addEventListener('userLoggedIn', handleUserLogin);

    // Cleanup
    return () => {
      connectionCount--;
      mountedRef.current = false;
      
      // Remover el event listener
      window.removeEventListener('userLoggedIn', handleUserLogin);
      
      // Solo cerrar la conexión cuando no hay más instancias del hook
      if (connectionCount === 0 && globalEventSource) {
        globalEventSource.close();
        globalEventSource = null;
        globalListeners.clear();
        isConnecting = false;
        console.log('🔌 Conexión SSE cerrada (última instancia)');
      }
    };
  }, [connectSSE]);

  /**
   * Suscribirse a un tipo de evento específico
   */
  const on = useCallback(<K extends keyof WebSocketEvents>(
    eventType: K,
    callback: EventCallback<K>
  ) => {
    if (!globalListeners.has(eventType)) {
      globalListeners.set(eventType, new Set());
    }
    globalListeners.get(eventType)!.add(callback);
    console.log(`➕ Listener registrado para ${eventType}. Total: ${globalListeners.get(eventType)!.size}`);
  }, []);

  /**
   * Desuscribirse de un tipo de evento
   */
  const off = useCallback(<K extends keyof WebSocketEvents>(
    eventType: K,
    callback: EventCallback<K>
  ) => {
    const listeners = globalListeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
      console.log(`➖ Listener eliminado para ${eventType}. Total restante: ${listeners.size}`);
    }
  }, []);

  // Función para reconectar manualmente
  const reconnect = useCallback(() => {
    if (globalEventSource) {
      globalEventSource.close();
      globalEventSource = null;
    }
    
    setIsConnected(false);
    setError(null);
    isConnecting = false;
    
    // Crear nueva conexión
    connectSSE();
  }, [connectSSE]);

  return {
    isConnected,
    error,
    reconnect,
    on,
    off
  };
}
