'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { clearUserSession, isUserAuthenticated, getUserData, UserData } from '@/utils/auth';
import { notificacionServices, NotificacionData } from '@/services/notificacionServices';

interface AuthState {
  isAuthenticated: boolean;
  user: UserData | null;
  isLoading: boolean;
  notifications: NotificacionData[];
  unreadNotificationsCount: number;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
    notifications: [],
    unreadNotificationsCount: 0
  });
  const router = useRouter();

  // Función para cargar notificaciones del usuario
  const loadUserNotifications = useCallback(async (userId: string) => {
    try {
      console.log('📢 Cargando notificaciones del usuario:', userId);
      const notifications = await notificacionServices.cargarNotificacionesNoLeidas();
      
      setAuthState(prev => ({
        ...prev,
        notifications,
        unreadNotificationsCount: notifications.length
      }));
      
      console.log(`📢 Cargadas ${notifications.length} notificaciones no leídas`);
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
      // No fallar el login por errores en notificaciones
    }
  }, []);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const isAuth = isUserAuthenticated();
        const userData = getUserData();
        
        if (isAuth && userData) {
          setAuthState({
            isAuthenticated: true,
            user: userData,
            isLoading: false,
            notifications: [],
            unreadNotificationsCount: 0
          });
          // Las notificaciones se cargan automáticamente desde useNotificationsSSE
        } else {
          // Si no hay autenticación válida, limpiar por seguridad
          clearUserSession();
          setAuthState({
            isAuthenticated: false,
            user: null,
            isLoading: false,
            notifications: [],
            unreadNotificationsCount: 0
          });
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        // En caso de error, limpiar todo por seguridad
        clearUserSession();
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          notifications: [],
          unreadNotificationsCount: 0
        });
      }
    };

    checkAuth();
  }, []); // Solo ejecutar una vez al montar

  const clearAuth = () => {
    // Usar la función centralizada para limpiar sesión
    clearUserSession();
    
    setAuthState({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      notifications: [],
      unreadNotificationsCount: 0
    });
  };

  const logout = () => {
    clearAuth();
    
    // Forzar recarga de la página para limpiar cualquier estado en memoria
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    } else {
      router.push('/login');
    }
  };

  const requireAuth = () => {
    if (!authState.isLoading && !authState.isAuthenticated) {
      router.push('/login');
    }
  };

  // Función para marcar una notificación como leída
  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificacionServices.marcarComoLeida(notificationId);
      
      setAuthState(prev => {
        const updatedNotifications = prev.notifications.map(notification =>
          notification.id === notificationId 
            ? { ...notification, leida: true }
            : notification
        );
        
        const unreadCount = updatedNotifications.filter(n => !n.leida).length;
        
        return {
          ...prev,
          notifications: updatedNotifications,
          unreadNotificationsCount: unreadCount
        };
      });
    } catch (error) {
      console.error('Error al marcar notificación como leída:', error);
    }
  }, []);

  // Función para marcar todas las notificaciones como leídas
  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      await notificacionServices.marcarTodasComoLeidas();
      
      setAuthState(prev => {
        const updatedNotifications = prev.notifications.map(notification => ({
          ...notification,
          leida: true,
        }));
        
        return {
          ...prev,
          notifications: updatedNotifications,
          unreadNotificationsCount: 0
        };
      });
    } catch (error) {
      console.error('Error al marcar todas las notificaciones como leídas:', error);
    }
  }, []);

  // Función para actualizar notificaciones (usado por WebSocket)
  const updateNotifications = useCallback((newNotifications: NotificacionData[]) => {
    setAuthState(prev => {
      const unreadCount = newNotifications.filter(n => !n.leida).length;
      
      return {
        ...prev,
        notifications: newNotifications,
        unreadNotificationsCount: unreadCount
      };
    });
  }, []);

  return {
    ...authState,
    logout,
    requireAuth,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    updateNotifications,
    loadUserNotifications
  };
}
