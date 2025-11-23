'use client';

import { useState } from 'react';

interface ConfirmarEliminarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  contactName: string;
}

export default function ConfirmarEliminarModal({ isOpen, onClose, onConfirm, contactName }: ConfirmarEliminarModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error al eliminar contacto:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-[#1a1d23] rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#3a3d45]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">🗑️</span>
            </div>
            <div>
              <h2 className="text-white text-lg font-semibold">Confirmar Eliminación</h2>
              <p className="text-gray-400 text-sm">¿Estás seguro de que quieres eliminar este contacto?</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            {/* Warning Message */}
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <div className="text-red-400 font-medium">Acción irreversible</div>
                  <div className="text-red-300 text-sm">Esta acción no se puede deshacer</div>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-[#2a2d35] rounded-lg p-4">
              <div className="text-gray-300 text-sm mb-2">Contacto a eliminar:</div>
              <div className="text-white font-medium">{contactName}</div>
            </div>

            {/* Buttons */}
            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {loading ? 'Eliminando...' : 'Eliminar Contacto'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
