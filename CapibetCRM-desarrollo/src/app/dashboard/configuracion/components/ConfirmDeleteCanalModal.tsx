'use client';

import { Canal } from '@/types/common';

interface ConfirmDeleteCanalModalProps {
  isOpen: boolean;
  canal: Canal | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

export default function ConfirmDeleteCanalModal({
  isOpen,
  canal,
  onConfirm,
  onCancel,
  isLoading
}: ConfirmDeleteCanalModalProps) {
  if (!isOpen || !canal) return null;

  const getCanalIcon = (tipo: Canal['tipo']) => {
    const iconMap = {
      whatsapp: '📱',
      whatsapp_api: '📱',
      instagram: '📷',
      messenger: '💬',
      telegram: '✈️',
      telegram_bot: '🤖',
      web_chat: '💬',
      email: '✉️',
    };
    return iconMap[tipo] || '📱';
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
            <h3 className="text-white text-lg font-medium">Eliminar Canal</h3>
            <p className="text-gray-400 text-sm">Esta acción no se puede deshacer</p>
          </div>
        </div>

        {/* Canal Info */}
        <div className="bg-[#1a1d23] rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getCanalIcon(canal.tipo)}</span>
            <div>
              <div className="text-white font-medium">{canal.descripcion}</div>
              <div className="text-gray-400 text-sm">
                {canal.tipo} • ID: {canal.id}
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
                ¿Estás seguro de que deseas eliminar este canal?
              </p>
              <p className="text-red-300 text-xs">
                • Se perderán todas las configuraciones del canal<br/>
                • Las sesiones asociadas podrían verse afectadas<br/>
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
              'Eliminar Canal'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
