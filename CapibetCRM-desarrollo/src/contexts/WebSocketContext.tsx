'use client';

import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useRealtimeConnection } from '@/hooks/useRealtimeConnection';
import { useNotificationsSSE } from '@/hooks/useNotificationsSSE';
import { Notification } from '@/hooks/useNotificationsSSE';
import { WebSocketEvents } from '@/lib/websocket/types';
import { useAuth } from '@/hooks/useAuth';

type EventCallback<K extends keyof WebSocketEvents> = (_data: WebSocketEvents[K]) => void;

/**
 * Contexto del WebSocket
 */
interface WebSocketContextType {
  // Estado de conexión
  isConnected: boolean;
  error: string | null;
  
  // Notificaciones
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (_notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (_notificationId: string) => void;
  clearReadNotifications: () => void;
  
  // Funciones WebSocket/SSE
  reconnect: () => void;
  on: <K extends keyof WebSocketEvents>(_eventType: K, _callback: EventCallback<K>) => void;
  off: <K extends keyof WebSocketEvents>(_eventType: K, _callback: EventCallback<K>) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

/**
 * Props del provider
 */
interface WebSocketProviderProps {
  children: ReactNode;
}

/**
 * Provider del contexto WebSocket
 */
export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { isConnected, error, reconnect, on, off } = useRealtimeConnection();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearReadNotifications
  } = useNotificationsSSE();
  const { isAuthenticated, updateNotifications } = useAuth();

  // Sincronizar notificaciones entre el contexto WebSocket y el contexto de autenticación
  useEffect(() => {
    if (isAuthenticated) {
      // Convertir Notification[] a NotificacionData[]
      const convertedNotifications = notifications.map(notif => ({
        id: notif.id,
        usuario_id: '', // Se completará cuando sea necesario
        titulo: notif.titulo,
        mensaje: notif.mensaje,
        tipo: notif.tipo,
        prioridad: 3, // Prioridad por defecto
        accion_url: undefined,
        data: notif.data,
        leida: notif.leida,
        archivada_en: undefined,
        enviada_push: false,
        enviada_email: false,
        creado_en: notif.fecha,
        actualizado_en: notif.fecha
      }));
      
      updateNotifications(convertedNotifications);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications, isAuthenticated]); // Sincronizar cuando cambien las notificaciones

  // Reconectar WebSocket automáticamente cuando el usuario esté autenticado
  useEffect(() => {
    if (isAuthenticated && !isConnected) {
      reconnect();
    }
  }, [isAuthenticated, isConnected, reconnect]);

  const value: WebSocketContextType = {
    isConnected,
    error,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearReadNotifications,
    reconnect,
    on,
    off
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

/**
 * Hook para usar el contexto WebSocket
 */
export function useWebSocketContext(): WebSocketContextType {
  const context = useContext(WebSocketContext);
  
  if (context === undefined) {
    throw new Error('useWebSocketContext debe ser usado dentro de un WebSocketProvider');
  }
  
  return context;
}
