'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Trash2, X, Smile } from 'lucide-react';
import { mensajesServices } from '@/services/mensajesServices';
import { ChatResponse } from '@/app/api/chats/domain/chat';
import { ContactResponse } from '@/services/contactoServices';
import ContactInfoMenu from './ContactInfoMenu';
import DeleteMessagesModal from './DeleteMessagesModal';
import MessageItem from './MessageItem';
import ChannelAvatar from './ChannelAvatar';
import { useChatSSE } from '@/hooks/useChatSSE';
import { Chat as ChatType, MensajeConUI } from '../types';
import { 
  filterMessagesByChannel, 
  isMessageFromMe
} from '../utils/messageUtils';
import { 
  isEmojiPickerAvailable, 
  getMessageEndpoint, 
  getChannelColor,
  getChannelInfo
} from '../config/channelConfig';

interface ChatProps {
  chat: ChatType | null;
  onContactUpdate?: (updatedContact: ContactResponse, updatedChat?: ChatResponse) => void;
}

export default function Chat({ chat, onContactUpdate }: ChatProps) {
  const [messages, setMessages] = useState<MensajeConUI[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [error, setError] = useState('');
  const [showLidAlert, setShowLidAlert] = useState(false);
  const [isContactInfoMenuOpen, setIsContactInfoMenuOpen] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Referencias para scroll y input
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Función para hacer scroll al final de los mensajes
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

    // Hook para actualizaciones en tiempo real del chat usando SSE
    useChatSSE({
      chatId: chat?.id || '',
      onNewMessage: useCallback((newMessage: MensajeResponse) => {
        setMessages(prev => [...prev, newMessage as MensajeConUI]);

        // Scroll automático al final cuando llega un nuevo mensaje
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }, [scrollToBottom])
    });

  // Función para verificar si un contacto tiene teléfono o whatsapp_jid
  const hasValidContactInfo = (contacto: ContactResponse): boolean => {
    return Boolean((contacto.telefono && contacto.telefono.trim() !== '') || 
                   (contacto.whatsapp_jid && contacto.whatsapp_jid.trim() !== ''));
  };

  // Emojis organizados por categorías
  const emojiCategories = {
    'Emoticonos y personas': [
      '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳',
      '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓',
      '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕',
      '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '🤲', '🤝', '🙏'
    ],
    'Corazones': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '❤️‍🔥'],
    'Símbolos': ['✅', '❌', '⭐', '🌟', '💫', '✨', '💯', '🔥', '💥', '💢', '💤', '💨', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉']
  };

  // Manejar inserción de emoji
  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    // Mantener el picker abierto para seleccionar múltiples emojis
  };

  // Cerrar emoji picker al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Función para manejar selección de mensajes
  const handleToggleMessageSelection = useCallback((messageId: string) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  }, []);

  // Función para cancelar selección
  const handleCancelSelection = useCallback(() => {
    setSelectedMessages(new Set());
  }, []);

  // Handlers para hover
  const handleMessageMouseEnter = useCallback((messageId: string) => {
    setHoveredMessageId(messageId);
  }, []);

  const handleMessageMouseLeave = useCallback(() => {
    setHoveredMessageId(null);
  }, []);

  // Función para eliminar mensajes seleccionados
  const handleDeleteSelectedMessages = async () => {
    try {
      const deletePromises = Array.from(selectedMessages).map(messageId => 
        mensajesServices.deleteMensaje(messageId)
      );
      
      await Promise.all(deletePromises);
      
      // Actualizar la lista de mensajes eliminando los mensajes seleccionados
      setMessages(prev => prev.filter(msg => !selectedMessages.has(msg.id)));
      
      // Limpiar selección y cerrar modal
      setSelectedMessages(new Set());
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error eliminando mensajes:', error);
      setError('Error al eliminar los mensajes');
      setShowDeleteModal(false);
    }
  };

  // Cargar mensajes cuando cambia el chat
  const loadMessages = useCallback(async () => {
    if (!chat) {
      setMessages([]);
      return;
    }
    
    setIsLoadingMessages(true);
    setError('');
    setShowLidAlert(false);
    setNewMessage('');
    setSelectedMessages(new Set());
    
    try {
      const mensajesResult = await mensajesServices.getMensajesByChat(chat.id);
      
      if (mensajesResult.success && mensajesResult.data) {
        // Filtrar mensajes según el tipo de canal
        const chatMessages = filterMessagesByChannel(mensajesResult.data, chat.sesion.type);
        
        // Ordenar por fecha de creación
        chatMessages.sort((a, b) => new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime());
        
        setMessages(chatMessages as MensajeConUI[]);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error cargando mensajes del chat:', error);
      setMessages([]);
      setError('Error al cargar los mensajes');
    } finally {
      setIsLoadingMessages(false);
    }
  }, [chat]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Hacer focus automático en el input al cargar el chat
  useEffect(() => {
    if (chat && inputRef.current && hasValidContactInfo(chat.contacto)) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [chat]);

  // Hacer scroll al final cuando se cargan los mensajes
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 100);
    }
  }, [messages.length]);

  // Enviar mensaje
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chat || isSendingMessage) return;

    if (!hasValidContactInfo(chat.contacto)) {
      setError('No se puede enviar mensajes a este contacto: falta información de contacto');
      return;
    }

    setIsSendingMessage(true);
    setError('');

    try {
      const endpoint = getMessageEndpoint(chat.sesion.type);
      
      const sendResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telefono: chat.contacto.telefono || chat.contacto.whatsapp_jid,
          mensaje: newMessage.trim(),
          sesion_id: chat.sesion.id
        })
      });

      const sendData = await sendResponse.json();

      if (!sendData.success) {
        console.error('Error enviando mensaje:', sendData.error);
        setError('Error al enviar mensaje: ' + sendData.error);
        setIsSendingMessage(false);
        return;
      }

      // Crear mensaje temporal para mostrar en la UI
      const message: MensajeConUI = {
        id: Date.now().toString(),
        remitente_id: '1',
        contacto_id: chat.contacto.id,
        chat_id: chat.id,
        type: chat.sesion.type as any,
        content: {
          message_content: newMessage.trim(),
          message_type: 'text'
        },
        creado_en: new Date().toISOString(),
        leido: false,
        estado: 'enviado'
      };

      setMessages([...messages, message]);
      setNewMessage('');

    } catch (error) {
      console.error('Error enviando mensaje:', error);
      setError('Error al enviar mensaje');
    }

    setIsSendingMessage(false);
    
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      if (inputRef.current && hasValidContactInfo(chat.contacto)) {
        inputRef.current.focus();
      }
    }, 100);
  };


  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--bg-primary)] overflow-hidden">
        <div className="text-center">
          <svg className="w-24 h-24 text-[var(--text-muted)] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="text-[var(--text-primary)] text-xl font-medium mb-2">Selecciona una conversación</h3>
          <p className="text-[var(--text-muted)] text-sm">
            Elige un chat de la lista para comenzar a conversar
          </p>
        </div>
      </div>
    );
  }

  return (
    <>

      {/* Header del chat */}
      <div className="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ChannelAvatar channelType={chat.sesion.type} size="medium" />
            <div>
              <h3 className="text-[var(--text-primary)] font-medium">{chat.contacto.nombre}</h3>
              <div className="flex items-center space-x-2">
                <span className="text-[var(--text-muted)] text-sm">{getChannelInfo(chat.sesion.type).name}</span>
                <span className="text-[var(--text-muted)]">•</span>
                <span className="text-[var(--text-muted)] text-sm">{chat.contacto.telefono || ''}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setIsContactInfoMenuOpen(true)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded cursor-pointer transition-colors"
              title="Información del contacto"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded cursor-pointer transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mensajes con scroll */}
      {isLoadingMessages ? (
        <div className="flex-1 flex items-center justify-center bg-[var(--bg-primary)] min-h-0">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)] mx-auto mb-4"></div>
            <h3 className="text-[var(--text-primary)] text-lg font-medium mb-2">
              Cargando mensajes...
            </h3>
            <p className="text-[var(--text-muted)] text-sm">
              Obteniendo conversación del chat
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 bg-[var(--bg-primary)] min-h-0 scrollbar-thin">
          {messages.map((message, index) => {
            const nextMessage = messages[index + 1];
            const isLastInGroup = nextMessage && isMessageFromMe(nextMessage) !== isMessageFromMe(message);
            
            return (
              <MessageItem
                key={message.id}
                message={message}
                isSelected={selectedMessages.has(message.id)}
                isHovered={hoveredMessageId === message.id}
                hasSelectedMessages={selectedMessages.size > 0}
                isLastInGroup={isLastInGroup}
                onToggleSelection={handleToggleMessageSelection}
                onMouseEnter={handleMessageMouseEnter}
                onMouseLeave={handleMessageMouseLeave}
              />
            );
          })}
          {/* Elemento invisible para hacer scroll al final */}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 text-red-400 text-sm flex-shrink-0">
          {error}
        </div>
      )}

      {/* Barra de acciones para mensajes seleccionados o Input de mensaje */}
      <div className="bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] p-4 flex-shrink-0">
        {selectedMessages.size > 0 ? (
          // Barra de acciones cuando hay mensajes seleccionados
          <div className="flex items-center justify-between">
            {/* Lado izquierdo: Contador y botón cancelar */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleCancelSelection}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded cursor-pointer transition-colors"
                title="Cancelar selección"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="text-[var(--text-primary)] font-medium">
                {selectedMessages.size} mensaje{selectedMessages.size > 1 ? 's' : ''} seleccionado{selectedMessages.size > 1 ? 's' : ''}
              </span>
            </div>

            {/* Lado derecho: Botón eliminar */}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar</span>
            </button>
          </div>
        ) : (
          // Input normal cuando no hay mensajes seleccionados
          <div className="flex items-center space-x-3">
            <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded cursor-pointer">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            
            {/* Emoji Picker */}
            {isEmojiPickerAvailable(chat.sesion.type) && (
              <div className="relative" ref={emojiPickerRef}>
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded cursor-pointer transition-colors"
                  title="Emojis"
                >
                  <Smile className="w-5 h-5" />
                </button>

                {/* Panel de Emoji Picker */}
                {showEmojiPicker && (
                  <div className="absolute bottom-full left-0 mb-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg shadow-2xl w-[320px] max-h-[400px] overflow-y-auto scrollbar-thin z-50">
                    {Object.entries(emojiCategories).map(([category, emojis]) => (
                      <div key={category} className="p-3 border-b border-[var(--border-primary)] last:border-b-0">
                        <h4 className="text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wide">
                          {category}
                        </h4>
                        <div className="grid grid-cols-8 gap-1">
                          {emojis.map((emoji, index) => (
                            <button
                              key={`${category}-${index}`}
                              onClick={() => handleEmojiSelect(emoji)}
                              className="w-8 h-8 flex items-center justify-center text-xl hover:bg-[var(--bg-primary)] rounded transition-colors cursor-pointer"
                              title={emoji}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

             <input
               ref={inputRef}
               type="text"
               value={newMessage}
               onChange={(e) => setNewMessage(e.target.value)}
               onKeyPress={(e) => e.key === 'Enter' && !isSendingMessage && handleSendMessage()}
               placeholder="Escribe un mensaje..."
               disabled={isSendingMessage}
               className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
             />
             <button
               onClick={handleSendMessage}
               disabled={!newMessage.trim() || isSendingMessage}
               style={{
                 backgroundColor: newMessage.trim() ? getChannelColor(chat.sesion.type) : undefined
               }}
               className={`${
                 !newMessage.trim() ? 'bg-gray-600' : ''
               } disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-2 rounded transition-colors cursor-pointer flex items-center justify-center min-w-[40px] hover:opacity-90`}
             >
               {isSendingMessage ? (
                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
               ) : (
                 <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="none">
                   <path d="M5.4 19.425C5.06667 19.5583 4.75 19.5291 4.45 19.3375C4.15 19.1458 4 18.8666 4 18.5V14L12 12L4 9.99997V5.49997C4 5.1333 4.15 4.85414 4.45 4.66247C4.75 4.4708 5.06667 4.44164 5.4 4.57497L20.8 11.075C21.2167 11.2583 21.425 11.5666 21.425 12C21.425 12.4333 21.2167 12.7416 20.8 12.925L5.4 19.425Z" fill="currentColor" />
                 </svg>
               )}
             </button>
          </div>
        )}
      </div>

      {/* Menú de información del contacto */}
      <ContactInfoMenu
        isOpen={isContactInfoMenuOpen}
        onClose={() => setIsContactInfoMenuOpen(false)}
        contacto={chat.contacto}
        sesion={chat.sesion}
        chatData={chat.chat_data}
        onContactUpdate={onContactUpdate}
      />

      {/* Modal de confirmación para eliminar mensajes */}
      <DeleteMessagesModal
        isOpen={showDeleteModal}
        messageCount={selectedMessages.size}
        onConfirm={handleDeleteSelectedMessages}
        onCancel={() => setShowDeleteModal(false)}
      />
    </>
  );
}

