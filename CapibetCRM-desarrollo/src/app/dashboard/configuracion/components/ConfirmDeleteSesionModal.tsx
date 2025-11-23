'use client';

import { Sesion, Canal } from '@/types/common';

interface ConfirmDeleteSesionModalProps {
  isOpen: boolean;
  sesion: Sesion | null;
  canal: Canal | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

export default function ConfirmDeleteSesionModal({
  isOpen,
  sesion,
  canal,
  onConfirm,
  onCancel,
  isLoading
}: ConfirmDeleteSesionModalProps) {
  if (!isOpen || !sesion) return null;

  const getSesionIcon = (estado: Sesion['estado']) => {
    const iconMap = {
      activo: '🟢',
      desconectado: '🔴',
      expirado: '🟡',
    };
    return iconMap[estado] || '🔴';
  };

  const getCanalIcon = (canal: Canal | null) => {
    if (!canal) return '📱';
    
    const iconMap = {
      whatsapp: '📱',
      whatsappApi: '📱',
      instagram: '📷',
      messenger: '💬',
      telegram: '✈️',
      telegramBot: '🤖',
      webChat: '💬',
      email: '✉️',
    };
    return iconMap[canal.tipo] || '📱';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#2a2d35] rounded-lg p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-red-600 text-xl">⚠️</span>
          </div>
          <div>
            <h3 className="text-white text-lg font-medium">Eliminar Sesión</h3>
            <p className="text-gray-400 text-sm">Esta acción no se puede deshacer</p>
          </div>
        </div>

        {/* Sesión Info */}
        <div className="bg-[#1a1d23] rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{getCanalIcon(canal)}</span>
              <span className="text-lg">{getSesionIcon(sesion.estado)}</span>
            </div>
            <div className="flex-1">
              <div className="text-white font-medium">{sesion.nombre}</div>
              <div className="text-gray-400 text-sm">
                {canal?.descripcion || 'Canal desconocido'} • Estado: {sesion.estado}
              </div>
              <div className="text-gray-500 text-xs">
                ID: {sesion.id}
              </div>
            </div>
          </div>
        </div>

        {/* Warning Message */}
        <div className="bg-red-900 bg-opacity-20 border border-red-500 border-opacity-30 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <span className="text-red-400 text-lg mt-0.5">⚠️</span>
            <div>
              <p className="text-red-400 text-sm font-medium mb-1">
                ¿Estás seguro de que deseas eliminar esta sesión?
              </p>
              <p className="text-red-300 text-xs">
                • Se perderán todas las configuraciones de la sesión<br/>
                • Las conversaciones asociadas podrían verse afectadas<br/>
                • Esta acción es permanente e irreversible
              </p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 bg-[#3a3d45] hover:bg-[#4a4d55] disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Eliminando...
              </>
            ) : (
              'Eliminar Sesión'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
