'use client';

import { useState } from 'react';
import { Trash2, X } from 'lucide-react';

interface DeleteMessagesModalProps {
  isOpen: boolean;
  messageCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteMessagesModal({ 
  isOpen, 
  messageCount, 
  onConfirm, 
  onCancel 
}: DeleteMessagesModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-[var(--text-primary)] text-lg font-semibold">
              Eliminar mensaje{messageCount > 1 ? 's' : ''}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-[var(--text-primary)] mb-2">
            ¿Estás seguro de que querés eliminar {messageCount} mensaje{messageCount > 1 ? 's' : ''}?
          </p>
          <p className="text-[var(--text-muted)] text-sm">
            Esta acción no se puede deshacer.
          </p>
        </div>

        <div className="flex space-x-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-[var(--text-primary)] border border-[var(--border-primary)] rounded-lg hover:bg-[var(--bg-primary)] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Eliminando...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Eliminar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

