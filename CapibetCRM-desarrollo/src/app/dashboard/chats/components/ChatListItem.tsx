/**
 * Componente para un item individual en la lista de chats
 * Soporta todos los canales configurados
 */

import { Chat } from '../types';
import { formatMessageTime } from '../utils/messageUtils';
import ChannelAvatar from './ChannelAvatar';
import MessagePreview from './MessagePreview';

interface ChatListItemProps {
  chat: Chat;
  isSelected: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export default function ChatListItem({ 
  chat, 
  isSelected, 
  onClick, 
  onContextMenu 
}: ChatListItemProps) {
  const lastMessageTime = chat.ultimoMensaje 
    ? formatMessageTime(chat.ultimoMensaje.creado_en) 
    : formatMessageTime(chat.chat_data.created_at || '');

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`p-4 border-b border-[var(--border-primary)] cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors ${
        isSelected ? 'bg-[var(--bg-secondary)] border-l-4 border-l-[var(--accent-primary)]' : ''
      }`}
    >
      <div className="flex items-center space-x-3">
        {/* Avatar del canal */}
        <ChannelAvatar channelType={chat.sesion.type} size="large" />

        {/* Información del chat */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <h3 className="text-[var(--text-primary)] font-medium truncate">
                {chat.contacto.nombre}
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[var(--text-muted)] text-xs">
                {lastMessageTime}
              </span>
              {chat.chat_data.nuevos_mensajes && (
                <span className="bg-[var(--accent-primary)] rounded-full w-2.5 h-2.5"></span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            {chat.ultimoMensaje ? (
              <MessagePreview 
                message={chat.ultimoMensaje} 
                channelType={chat.sesion.type} 
              />
            ) : (
              <p className="text-[var(--text-muted)] text-sm truncate flex-1 max-w-[400px]"></p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

