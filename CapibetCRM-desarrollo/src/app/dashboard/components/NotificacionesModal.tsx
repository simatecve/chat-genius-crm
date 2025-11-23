'use client';

import { useState } from 'react';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { notificacionServices } from '@/services/notificacionServices';

interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
  tipo: 'info' | 'success' | 'warning' | 'error';
}

interface NotificacionesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificacionesModal({ isOpen, onClose }: NotificacionesModalProps) {
  const [filtro, setFiltro] = useState<'todas' | 'no-leidas'>('todas');
  
  // Usar el contexto WebSocket para obtener notificaciones
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead 
  } = useWebSocketContext();

  // Convertir Notification a Notificacion para el modal
  const notificaciones: Notificacion[] = notifications.map(notif => ({
    id: notif.id,
    titulo: notif.titulo,
    mensaje: notif.mensaje,
    fecha: notif.fecha,
    leida: notif.leida,
    tipo: notif.tipo
  }));

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'success':
        return 'border-l-green-500 bg-green-50/5';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50/5';
      case 'error':
        return 'border-l-red-500 bg-red-50/5';
      default:
        return 'border-l-blue-500 bg-blue-50/5';
    }
  };

  const marcarComoLeida = async (id: string) => {
    // Llamar al servicio para marcar como leída en el backend
    await notificacionServices.marcarComoLeida(id);
    // Actualizar el estado local
    markAsRead(id);
  };

  const marcarTodasComoLeidas = async () => {
    // Llamar al servicio para marcar todas como leídas en el backend
    await notificacionServices.marcarTodasComoLeidas();
    // Actualizar el estado local
    markAllAsRead();
  };

  const eliminarNotificacion = (id: string) => {
    // Por ahora no implementamos eliminación, solo marcado como leída
    console.log('Eliminar notificación:', id);
  };

  const notificacionesFiltradas = notificaciones.filter(notif => 
    filtro === 'todas' || !notif.leida
  );

  const notificacionesNoLeidas = unreadCount;

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `Hace ${diffMins} min`;
    } else if (diffHours < 24) {
      return `Hace ${diffHours}h`;
    } else {
      return `Hace ${diffDays}d`;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(42, 45, 53, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(107, 114, 128, 0.8);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 1);
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(107, 114, 128, 0.8) rgba(42, 45, 53, 0.5);
        }
      `}</style>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)]">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <h2 className="text-[var(--text-primary)] text-xl font-semibold">Notificaciones</h2>
            </div>
            {notificacionesNoLeidas > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {notificacionesNoLeidas}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {/* Filtros */}
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as 'todas' | 'no-leidas')}
              className="bg-[#2a2d35] border border-[#3a3d45] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F29A1F]"
            >
              <option value="todas">Todas</option>
              <option value="no-leidas">No leídas</option>
            </select>
            
            {/* Marcar todas como leídas */}
            {notificacionesNoLeidas > 0 && (
              <button
                onClick={marcarTodasComoLeidas}
                className="text-[#F29A1F] hover:text-[#F29A1F] text-sm font-medium transition-colors"
              >
                Marcar todas como leídas
              </button>
            )}
            
            {/* Cerrar */}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content - Con scroll mejorado */}
        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
          {notificacionesFiltradas.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-gray-400 text-6xl mb-4">🔔</div>
                <h3 className="text-white text-lg font-medium mb-2">
                  {filtro === 'no-leidas' ? 'No hay notificaciones sin leer' : 'No hay notificaciones'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {filtro === 'no-leidas' 
                    ? 'Todas las notificaciones han sido leídas' 
                    : 'No se encontraron notificaciones'
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#3a3d45]">
              {notificacionesFiltradas.map((notificacion) => (
                  <div
                    key={notificacion.id}
                    className={`p-4 hover:bg-[#2a2d35] transition-colors border-l-4 ${getTipoColor(notificacion.tipo)} ${
                      !notificacion.leida ? 'bg-[#2a2d35]/30' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <span className="text-lg">{getTipoIcon(notificacion.tipo)}</span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-sm font-medium ${!notificacion.leida ? 'text-white' : 'text-gray-300'}`}>
                            {notificacion.titulo}
                            {!notificacion.leida && (
                              <span className="ml-2 w-2 h-2 bg-red-500 rounded-full inline-block"></span>
                            )}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-400">
                              {formatFecha(notificacion.fecha)}
                            </span>
                            <button
                              onClick={() => eliminarNotificacion(notificacion.id)}
                              className="text-gray-400 hover:text-red-400 transition-colors"
                              title="Eliminar notificación"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        
                        <p className="mt-1 text-sm text-gray-400">
                          {notificacion.mensaje}
                        </p>
                        
                        {!notificacion.leida && (
                          <button
                            onClick={() => marcarComoLeida(notificacion.id)}
                            className="mt-2 text-xs text-[#F29A1F] hover:text-[#F29A1F] transition-colors"
                          >
                            Marcar como leída
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#3a3d45] bg-[#1a1d23]">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>
              {notificacionesFiltradas.length} notificación{notificacionesFiltradas.length !== 1 ? 'es' : ''}
              {filtro === 'no-leidas' && notificacionesNoLeidas > 0 && (
                <span className="ml-1">({notificacionesNoLeidas} sin leer)</span>
              )}
            </span>
            <button
              onClick={onClose}
              className="text-[#F29A1F] hover:text-[#F29A1F] font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
