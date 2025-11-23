'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRealtimeConnection } from './useRealtimeConnection';
import { NotificationNewEvent } from '@/lib/websocket/types';
import { notificacionServices, NotificacionData } from '@/services/notificacionServices';
import { isUserAuthenticated } from '@/utils/auth';

/**
 * Tipo de notificación
 */
export interface Notification {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: 'info' | 'success' | 'warning' | 'error';
  fecha: string;
  leida: boolean;
  data?: any;
}

/**
 * Hook para manejar notificaciones en tiempo real usando SSE
 */
export function useNotificationsSSE() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isConnected, on, off } = useRealtimeConnection();
  const hasLoadedRef = useRef(false);
  const listenerRegisteredRef = useRef(false);
  const handlerWrapperRef = useRef<((eventData: NotificationNewEvent) => void) | null>(null);

  // Función para cargar notificaciones existentes
  const loadExistingNotifications = useCallback(async () => {
    try {
      const existingNotifications = await notificacionServices.cargarNotificacionesNoLeidas();
      
      // Convertir NotificacionData a Notification
      const convertedNotifications: Notification[] = existingNotifications.map(notif => ({
        id: notif.id,
        titulo: notif.titulo,
        mensaje: notif.mensaje,
        tipo: notif.tipo,
        fecha: notif.creado_en,
        leida: notif.leida,
        data: notif.data
      }));
      
      setNotifications(convertedNotifications);
      setUnreadCount(convertedNotifications.filter(n => !n.leida).length);
    } catch (error) {
      console.error('Error al cargar notificaciones existentes:', error);
    }
  }, []);

  // Cargar notificaciones inmediatamente al montar si el usuario está autenticado
  useEffect(() => {
    // Solo cargar una vez al montar
    if (!hasLoadedRef.current && isUserAuthenticated()) {
      hasLoadedRef.current = true;
      loadExistingNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar al montar

  // También cargar cuando se conecte el SSE si aún no se han cargado
  useEffect(() => {
    if (isConnected && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadExistingNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]); // Solo depender de isConnected

  // Usar useRef para mantener una referencia estable al handler
  const handleNotificationRef = useRef((eventData: NotificationNewEvent) => {
    try {
      console.log('📬 Nueva notificación recibida:', eventData);
      setNotifications(prev => {
        console.log('📋 Notificaciones antes:', prev.length);
        const newNotifications = [eventData.notification, ...prev];
        console.log('📋 Notificaciones después:', newNotifications.length);
        return newNotifications;
      });
      setUnreadCount(prev => {
        console.log('🔔 Count antes:', prev, 'después:', prev + 1);
        return prev + 1;
      });
    } catch (error) {
      console.error('❌ Error procesando notificación SSE:', error);
    }
  });

  // Actualizar la referencia del handler cada vez que cambian las funciones setState
  useEffect(() => {
    handleNotificationRef.current = (eventData: NotificationNewEvent) => {
      try {
        console.log('📬 Nueva notificación recibida:', eventData);
        setNotifications(prev => {
          console.log('📋 Notificaciones antes:', prev.length);
          const newNotifications = [eventData.notification, ...prev];
          console.log('📋 Notificaciones después:', newNotifications.length);
          return newNotifications;
        });
        setUnreadCount(prev => {
          console.log('🔔 Count antes:', prev, 'después:', prev + 1);
          return prev + 1;
        });
      } catch (error) {
        console.error('❌ Error procesando notificación SSE:', error);
      }
    };
  });

  // Escuchar nuevas notificaciones - registrar solo una vez
  useEffect(() => {
    if (listenerRegisteredRef.current) {
      console.log('⏭️ Listener ya registrado, saltando');
      return;
    }

    console.log('✅ useNotificationsSSE: Registrando listener para notification:new (primera vez)');
    listenerRegisteredRef.current = true;

    // Crear un wrapper que use la referencia actual del handler (solo una vez)
    if (!handlerWrapperRef.current) {
      handlerWrapperRef.current = (eventData: NotificationNewEvent) => {
        handleNotificationRef.current(eventData);
      };
    }

    // Suscribirse al evento de nuevas notificaciones
    on('notification:new', handlerWrapperRef.current);

    return () => {
      console.log('🧹 useNotificationsSSE: Limpiando listener para notification:new');
      listenerRegisteredRef.current = false;
      if (handlerWrapperRef.current) {
        off('notification:new', handlerWrapperRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar al montar

  // Función para marcar una notificación como leída
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, leida: true }
          : notification
      )
    );
    
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Función para marcar todas las notificaciones como leídas
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, leida: true }))
    );
    setUnreadCount(0);
  }, []);

  // Función para eliminar una notificación
  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      const newNotifications = prev.filter(n => n.id !== notificationId);
      
      // Si la notificación no estaba leída, reducir el contador
      if (notification && !notification.leida) {
        setUnreadCount(prevCount => Math.max(0, prevCount - 1));
      }
      
      return newNotifications;
    });
  }, []);

  // Función para limpiar todas las notificaciones leídas
  const clearReadNotifications = useCallback(() => {
    setNotifications(prev => prev.filter(notification => !notification.leida));
  }, []);

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearReadNotifications,
    loadExistingNotifications
  };
}

