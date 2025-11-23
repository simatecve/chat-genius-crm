'use client';

import { X } from 'lucide-react';
import { ChatResponse } from '@/app/api/chats/domain/chat';
import { ContactResponse } from '@/services/contactoServices';
import { SesionResponse } from '@/app/api/sesiones/domain/sesion';
import { MensajeResponse } from '@/app/api/mensajes/domain/mensaje';
import Chat from './Chat';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat | null;
  onContactUpdate?: (updatedContact: ContactResponse, updatedChat?: ChatResponse) => void;
}

interface Chat {
  id: string;
  contacto: ContactResponse;
  ultimoMensaje?: MensajeResponse;
  sesion: SesionResponse;
  chat_data: ChatResponse;
  estado: 'activo' | 'archivado' | 'pausado';
}

export default function ChatModal({ 
  isOpen, 
  onClose, 
  chat,
  onContactUpdate 
}: ChatModalProps) {

  if (!isOpen || !chat) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-primary)] rounded-lg w-full max-w-6xl h-[80vh] flex flex-col border border-[var(--border-primary)] relative">
        {/* Botón de cerrar */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-[70] text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded cursor-pointer transition-colors bg-[var(--bg-secondary)] border border-[var(--border-primary)]"
          title="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Componente de Chat */}
        <Chat chat={chat} onContactUpdate={onContactUpdate} />
      </div>
    </div>
  );
}
