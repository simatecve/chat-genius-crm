'use client';

import { useState, useEffect } from 'react';
import { Notification } from '@/hooks/useNotificationsSSE';

interface ToastNotificationProps {
  notification: Notification;
  onClose: () => void;
  duration?: number;
}

export default function ToastNotification({ 
  notification, 
  onClose, 
  duration = 5000 
}: ToastNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [remainingTime, setRemainingTime] = useState(duration);

  // Animación de entrada
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Auto-cerrar con pausa en hover
  useEffect(() => {
    if (isExiting) return;

    const interval = setInterval(() => {
      if (!isHovered) {
        setRemainingTime(prev => {
          const newTime = prev - 100;
          if (newTime <= 0) {
            handleClose();
            return 0;
          }
          return newTime;
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isHovered, isExiting]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300); // Duración de la animación de salida
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'success':
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getTipoBorder = (tipo: string) => {
    switch (tipo) {
      case 'success':
        return 'border-l-green-500';
      case 'warning':
        return 'border-l-yellow-500';
      case 'error':
        return 'border-l-red-500';
      default:
        return 'border-l-blue-500';
    }
  };

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
      return 'Ahora';
    } else if (diffMins < 60) {
      return `Hace ${diffMins} min`;
    } else if (diffHours < 24) {
      return `Hace ${diffHours}h`;
    } else {
      return `Hace ${diffDays}d`;
    }
  };

  return (
    <div
      className={`
        relative max-w-sm w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] 
        rounded-lg shadow-lg border-l-4 ${getTipoBorder(notification.tipo)}
        transform transition-all duration-300 ease-in-out cursor-pointer
        ${isVisible && !isExiting 
          ? 'translate-x-0 opacity-100' 
          : 'translate-x-full opacity-0'
        }
        ${isExiting ? 'scale-95' : 'scale-100'}
        ${isHovered ? 'shadow-xl scale-[1.02]' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Barra de progreso */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gray-700 rounded-t-lg overflow-hidden">
        <div 
          className="h-full bg-[var(--accent-primary)] transition-all ease-linear"
          style={{
            width: `${(remainingTime / duration) * 100}%`,
            transition: isHovered ? 'none' : 'width 100ms linear'
          }}
        />
      </div>

      <div className="p-4">
        <div className="flex items-start space-x-3">
          {getTipoIcon(notification.tipo)}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                  {notification.titulo}
                </h4>
                <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                  {notification.mensaje}
                </p>
              </div>
              
              <button
                onClick={handleClose}
                className="flex-shrink-0 ml-2 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-[var(--text-muted)]">
                {formatFecha(notification.fecha)}
              </span>
              
              {!notification.leida && (
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
