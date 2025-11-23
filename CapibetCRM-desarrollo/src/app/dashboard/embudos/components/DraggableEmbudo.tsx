'use client';

import { useDroppable } from '@dnd-kit/core';
import { Edit2, Trash2, MessageCircle, BarChart3 } from 'lucide-react';
import { EmbudoResponse } from '@/app/api/embudos/domain/embudo';
import { ContactResponse } from '@/services/contactoServices';
import { SesionResponse } from '@/app/api/sesiones/domain/sesion';
import { ChatResponse } from '@/app/api/chats/domain/chat';
import { MensajeResponse } from '@/app/api/mensajes/domain/mensaje';
import DraggableChat from './DraggableChat';

interface Chat {
  id: string;
  contacto: ContactResponse;
  ultimoMensaje?: MensajeResponse;
  sesion: SesionResponse;
  chat_data: ChatResponse;
  estado: 'activo' | 'archivado' | 'pausado';
}

interface DraggableEmbudoProps {
  embudo: EmbudoResponse;
  index: number;
  chats: Chat[];
  onEdit: (embudo: EmbudoResponse) => void;
  onDelete: (embudo: EmbudoResponse) => void;
  onChatClick: (chat: Chat) => void;
  onChatMoved?: (chatId: string, nuevoEmbudoId: string) => void;
  movingChatId?: string | null;
}

export default function DraggableEmbudo({ embudo, index, chats, onEdit, onDelete, onChatClick, onChatMoved, movingChatId }: DraggableEmbudoProps) {
  // Hacer el embudo droppable para chats
  const { setNodeRef, isOver } = useDroppable({
    id: `embudo-drop-${embudo.id}`,
  });

  const borderColor = embudo.color || '#4a4d55';

  return (
    <div
      ref={setNodeRef}
      style={{
        borderColor: isOver ? 'var(--accent-primary)' : borderColor,
      }}
      className={`bg-[var(--bg-primary)] border-2 rounded-lg p-4 transition-colors group relative flex flex-col h-full ${
        isOver ? 'bg-[var(--accent-primary)]/10' : ''
      }`}
    >
      {/* Header del embudo */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-[var(--text-primary)] text-md font-bold">
            {embudo.nombre}
          </span>
        </div>
        <div 
          className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()} // Prevenir que el drag se active al hacer click en los botones
        >
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(embudo);
            }}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs p-1 cursor-pointer" 
            title="Editar embudo"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(embudo);
            }}
            className="text-[var(--text-muted)] hover:text-[var(--error)] text-xs p-1 cursor-pointer" 
            title="Eliminar embudo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Descripción */}
      {embudo.descripcion && (
        <p className="text-[var(--text-muted)] text-xs mb-3">{embudo.descripcion}</p>
      )}

      {/* Área de contenido del embudo - Crece dinámicamente con los chats */}
      <div className={`flex-1 bg-[var(--bg-secondary)] rounded border border-[var(--border-primary)] flex flex-col relative ${
        isOver ? 'ring-2 ring-[var(--accent-primary)] ring-opacity-75' : ''
      }`}>
        {/* Indicador visual de drop zone */}
        {isOver && (
          <div className="absolute inset-0 bg-[var(--accent-primary)]/20 rounded flex items-center justify-center z-10 pointer-events-none">
            <div className="text-white text-lg font-bold">
              Soltar chat aquí
            </div>
          </div>
        )}
        
        {/* Header del área de contenido */}
        <div className="p-3 border-b border-[var(--border-primary)] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-[var(--text-muted)] text-xs"><MessageCircle className="w-4 h-4" /></span>
            <span className="text-[var(--text-secondary)] text-xs font-medium">
              {chats.length} chat{chats.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        
        {/* Área principal para chats - Con scroll interno */}
        <div className="flex-1 p-3 overflow-y-auto scrollbar-thin">
          {chats.length > 0 ? (
            <div className="space-y-2">
              {chats.map((chat) => (
                <DraggableChat
                  key={chat.id}
                  chat={chat}
                  onChatClick={onChatClick}
                  isMoving={movingChatId === chat.id}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24">
              <div className="text-center">
                <div className="text-[var(--text-muted)] text-3xl mb-3 flex justify-center"><MessageCircle className="w-4 h-4" /></div>
                <div className="text-[var(--text-muted)] text-sm mb-2">Sin chats aún</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
