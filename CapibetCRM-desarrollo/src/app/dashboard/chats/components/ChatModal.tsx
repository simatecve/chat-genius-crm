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
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-primary)] rounded-lg w-full max-w-6xl h-[85vh] border border-[var(--border-primary)] relative flex flex-col overflow-hidden">
        {/* Componente de Chat - ocupa todo el espacio disponible */}
        <div className="flex-1 min-h-0 w-full h-full">
          <Chat chat={chat} onContactUpdate={onContactUpdate} />
        </div>
        
        {/* Botón de cerrar - posicionado sobre el contenido */}
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 z-[70] text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded-lg cursor-pointer transition-colors bg-[var(--bg-secondary)]/95 border border-[var(--border-primary)] shadow-lg hover:bg-[var(--bg-secondary)]"
          title="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
