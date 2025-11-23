'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { Notification } from './useNotificationsSSE';

interface ToastSettings {
  enabled: boolean;
  duration: number;
  maxToasts: number;
  soundEnabled: boolean;
}

const defaultSettings: ToastSettings = {
  enabled: true,
  duration: 5000,
  maxToasts: 5,
  soundEnabled: true
};

/**
 * Hook para manejar notificaciones toast en tiempo real
 * Integra con el sistema de notificaciones SSE existente
 */
export function useToastNotifications() {
  const { notifications, isConnected } = useWebSocketContext();
  const [settings, setSettings] = useState<ToastSettings>(defaultSettings);
  const [toastQueue, setToastQueue] = useState<Notification[]>([]);
  const [processedNotifications, setProcessedNotifications] = useState<Set<string>>(new Set());
  const [hasInitialized, setHasInitialized] = useState(false);
  const [initialNotificationsCount, setInitialNotificationsCount] = useState(0);

  // Reproducir sonido de notificación
  const playNotificationSound = useCallback(() => {
    if (!settings.soundEnabled) return;

    try {
      const audio = new Audio('/52pj7t0b7w3-notification-sfx-10.mp3');
      audio.volume = 0.7; // Volumen moderado
      audio.play().catch(error => {
        console.warn('No se pudo reproducir el sonido de notificación:', error);
      });
    } catch (error) {
      console.warn('Error al crear el audio:', error);
    }
  }, [settings.soundEnabled]);

  // Inicializar el contador de notificaciones cuando se conecta por primera vez
  useEffect(() => {
    if (isConnected && !hasInitialized && notifications.length > 0) {
      setInitialNotificationsCount(notifications.length);
      setHasInitialized(true);
      console.log('🔔 Toast system initialized with', notifications.length, 'existing notifications');
    }
  }, [isConnected, hasInitialized, notifications.length]);

  // Detectar nuevas notificaciones (solo eventos SSE nuevos)
  useEffect(() => {
    if (!settings.enabled || !isConnected || !hasInitialized) return;

    // Solo procesar si hay más notificaciones que al inicializar (nuevas notificaciones SSE)
    if (notifications.length > initialNotificationsCount) {
      // Obtener las notificaciones nuevas (las que se agregaron después de la inicialización)
      const newNotifications = notifications.slice(0, notifications.length - initialNotificationsCount);
      
      // Procesar cada nueva notificación
      newNotifications.forEach(notification => {
        // Verificar si ya hemos procesado esta notificación
        const isNewNotification = !processedNotifications.has(notification.id);

        if (isNewNotification) {
          // Marcar como procesada
          setProcessedNotifications(prev => new Set(prev).add(notification.id));
          
          // Agregar a la cola de toasts
          setToastQueue(prev => {
            const newQueue = [notification, ...prev];
            // Mantener solo el número máximo de toasts
            return newQueue.slice(0, settings.maxToasts);
          });

          // Reproducir sonido si está habilitado
          playNotificationSound();
        }
      });

      // Actualizar el contador de notificaciones iniciales
      setInitialNotificationsCount(notifications.length);
    }
  }, [notifications, settings.enabled, settings.maxToasts, isConnected, processedNotifications, playNotificationSound, hasInitialized, initialNotificationsCount]);

  // Remover notificación de la cola
  const removeToast = useCallback((notificationId: string) => {
    setToastQueue(prev => prev.filter(toast => toast.id !== notificationId));
  }, []);

  // Limpiar todas las notificaciones
  const clearAllToasts = useCallback(() => {
    setToastQueue([]);
    // También limpiar las notificaciones procesadas para liberar memoria
    setProcessedNotifications(new Set());
    // Resetear el contador para que el sistema se reinicialice
    setInitialNotificationsCount(notifications.length);
  }, [notifications.length]);

  // Actualizar configuraciones
  const updateSettings = useCallback((newSettings: Partial<ToastSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Obtener configuraciones desde localStorage al montar
  useEffect(() => {
    const savedSettings = localStorage.getItem('toast-notifications-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.warn('Error al cargar configuraciones de toast:', error);
      }
    }
  }, []);

  // Guardar configuraciones en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('toast-notifications-settings', JSON.stringify(settings));
  }, [settings]);

  // Limpiar periódicamente las notificaciones procesadas para evitar acumulación de memoria
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setProcessedNotifications(prev => {
        // Mantener solo las últimas 100 notificaciones procesadas
        if (prev.size > 100) {
          const notificationsArray = Array.from(prev);
          return new Set(notificationsArray.slice(-50)); // Mantener las últimas 50
        }
        return prev;
      });
    }, 60000); // Cada minuto

    return () => clearInterval(cleanupInterval);
  }, []);

  return {
    toasts: toastQueue,
    settings,
    isConnected,
    removeToast,
    clearAllToasts,
    updateSettings,
    playNotificationSound
  };
}
