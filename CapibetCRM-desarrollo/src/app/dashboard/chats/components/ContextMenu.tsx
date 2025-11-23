'use client';

import { useState, useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import DeleteConfirmModal from './DeleteConfirmModal';

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onDelete: () => void;
  chatName: string;
}

export default function ContextMenu({ isOpen, position, onClose, onDelete, chatName }: ContextMenuProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Ajustar posición si el menú se sale de la pantalla
      let adjustedX = position.x;
      let adjustedY = position.y;

      if (position.x + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 10;
      }

      if (position.y + rect.height > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 10;
      }

      if (adjustedX !== position.x || adjustedY !== position.y) {
        menu.style.left = `${adjustedX}px`;
        menu.style.top = `${adjustedY}px`;
      }
    }
  }, [isOpen, position]);

  // Resetear el modal solo cuando el componente se desmonta completamente
  useEffect(() => {
    return () => {
      setShowDeleteModal(false);
    };
  }, []);

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
    onClose();
  };

  const handleConfirmDelete = async () => {
    await onDelete();
    setShowDeleteModal(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  // Mostrar el modal incluso si el menú está cerrado pero el modal está abierto
  if (!isOpen && !showDeleteModal) return null;

  return (
    <>
      {isOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg shadow-lg py-2 min-w-[160px]"
          style={{
            left: position.x,
            top: position.y,
          }}
        >
          <button
            onClick={handleDeleteClick}
            className="w-full px-4 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-primary)] flex items-center space-x-3 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
            <span>Eliminar chat</span>
          </button>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        chatName={chatName}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
}
