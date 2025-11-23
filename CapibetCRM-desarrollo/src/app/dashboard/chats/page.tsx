'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, MessageCircle } from 'lucide-react';
import { isUserAuthenticated } from '@/utils/auth';
import { mensajesServices } from '@/services/mensajesServices';
import { MensajeResponse } from '@/app/api/mensajes/domain/mensaje';
import { chatServices } from '@/services/chatServices';
import { ChatResponse } from '@/app/api/chats/domain/chat';
import { espacioTrabajoServices } from '@/services/espacioTrabajoServices';
import { EspacioTrabajoResponse } from '@/app/api/espacio_trabajos/domain/espacio_trabajo';
import { contactoServices, ContactResponse } from '@/services/contactoServices';
import { embudoServices } from '@/services/embudoServices';
import { EmbudoResponse } from '@/app/api/embudos/domain/embudo';
import { sesionesServices } from '@/services/sesionesServices';
import { SesionResponse } from '@/app/api/sesiones/domain/sesion';
import EmbudosFilter from './components/EmbudosFilter';
import ContextMenu from './components/ContextMenu';
import Chat from './components/Chat';
import ChatListHeader from './components/ChatListHeader';
import ChatListItem from './components/ChatListItem';
import SearchBar from './components/SearchBar';
import LoadingState from './components/LoadingState';
import EmptyState from './components/EmptyState';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { ChatNewMessageEvent } from '@/lib/websocket/types';
import { Chat as ChatType, ContextMenuState } from './types';
import { getMessageContent } from './utils/messageUtils';

export default function ChatsPage() {
  // Estados para datos reales
  const [espaciosTrabajo, setEspaciosTrabajo] = useState<EspacioTrabajoResponse[]>([]);
  const [selectedEspacio, setSelectedEspacio] = useState<EspacioTrabajoResponse | null>(null);
  const [allChats, setAllChats] = useState<ChatType[]>([]);
  const [chats, setChats] = useState<ChatType[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [lastLoadedEspacioId, setLastLoadedEspacioId] = useState<string | null>(null);
  
  // Estados para embudos y sesiones
  const [embudos, setEmbudos] = useState<EmbudoResponse[]>([]);
  const [sesiones, setSesiones] = useState<SesionResponse[]>([]);
  const [selectedEmbudo, setSelectedEmbudo] = useState<EmbudoResponse | null>(null);
  
  // Estado para el menú contextual
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    chatId: null,
    chatName: ''
  });

  const router = useRouter();
  const { on, off } = useWebSocketContext();

  // Función para cargar datos cuando se selecciona un espacio
  const loadDataForEspacio = useCallback(async (espacioId: string) => {
    try {
      // Cargar embudos, sesiones, chats y contactos del espacio en paralelo
      const [embudosResult, sesionesResult, chatsResult, mensajesResult, contactosResult] = await Promise.all([
        embudoServices.getEmbudosByEspacio(espacioId),
        sesionesServices.getAllSesiones(),
        chatServices.getAllChats(espacioId),
        mensajesServices.getLastMessagePerChat(),
        contactoServices.getAllContactos()
      ]);
      
      // Procesar embudos
      setEmbudos(embudosResult.success && embudosResult.data ? embudosResult.data : []);
      
      // Procesar sesiones (filtradas por embudos del espacio)
      if (sesionesResult.success && sesionesResult.data && embudosResult.data) {
        const embudosIds = embudosResult.data.map(e => e.id);
        const sesionesDelEspacio = sesionesResult.data.filter(sesion => 
          embudosIds.includes(String(sesion.embudo_id))
        );
        setSesiones(sesionesDelEspacio);
      } else {
        setSesiones([]);
      }

      // Procesar chats del espacio
      if (chatsResult.success && chatsResult.data && sesionesResult.success && sesionesResult.data) {
        const mensajesPorChat = new Map<string, MensajeResponse>();
        
        if (mensajesResult.success && mensajesResult.data) {
          mensajesResult.data.forEach(mensaje => {
            const mensajeExistente = mensajesPorChat.get(mensaje.chat_id);
            if (!mensajeExistente || new Date(mensaje.creado_en) > new Date(mensajeExistente.creado_en)) {
              mensajesPorChat.set(mensaje.chat_id, mensaje);
            }
          });
        }

        const chatsCompletos: ChatType[] = [];
        const contactosData = contactosResult.data || [];

        for (const chatData of chatsResult.data) {
          const contacto = contactosData.find(c => c.id === chatData.contact_id);
          const sesion = sesionesResult.data.find(s => s.id === chatData.sesion_id);

          if (contacto && sesion) {
            chatsCompletos.push({
              id: chatData.id,
              contacto,
              ultimoMensaje: mensajesPorChat.get(chatData.id),
              sesion,
              chat_data: chatData,
              estado: 'activo'
            });
          }
        }

        // Ordenar por último mensaje o fecha de creación
        chatsCompletos.sort((a, b) => {
          const dateA = a.ultimoMensaje ? new Date(a.ultimoMensaje.creado_en) : new Date(a.chat_data.created_at || 0);
          const dateB = b.ultimoMensaje ? new Date(b.ultimoMensaje.creado_en) : new Date(b.chat_data.created_at || 0);
          return dateB.getTime() - dateA.getTime();
        });

        setAllChats(chatsCompletos);
        setChats(chatsCompletos);
      } else {
        setAllChats([]);
        setChats([]);
      }
      
      setSelectedEmbudo(null);
      
    } catch (error) {
      console.error('Error cargando datos del espacio:', error);
      setEmbudos([]);
      setSesiones([]);
      setAllChats([]);
      setChats([]);
    }
  }, []);

  // Función para cargar todos los datos necesarios
  const loadData = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const espaciosResult = await espacioTrabajoServices.getAllEspaciosTrabajo();
      if (espaciosResult.success && espaciosResult.data) {
        setEspaciosTrabajo(espaciosResult.data);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Función para manejar selección de embudo
  const handleEmbudoSelect = useCallback((embudo: EmbudoResponse | null) => {
    setSelectedChat(null);
    setSelectedEmbudo(embudo);
  }, []);

  // Función para filtrar chats localmente por embudo
  const filterChatsByEmbudo = useCallback(() => {
    setChats(
      selectedEmbudo
        ? allChats.filter(chat => chat.chat_data.embudo_id === selectedEmbudo.id)
        : allChats
    );
  }, [selectedEmbudo, allChats]);

  useEffect(() => {
    if (!isUserAuthenticated()) {
      router.push('/login');
      return;
    }
    loadData();
  }, [router, loadData]);

  // Efecto separado para seleccionar el primer espacio cuando se cargan los datos
  useEffect(() => {
    if (espaciosTrabajo.length > 0 && !selectedEspacio) {
      setSelectedEspacio(espaciosTrabajo[0]);
    }
  }, [espaciosTrabajo, selectedEspacio]);

  // Efecto para cargar datos del espacio cuando cambia
  useEffect(() => {
    if (selectedEspacio && selectedEspacio.id !== lastLoadedEspacioId) {
      setIsLoadingChats(true);
      setLastLoadedEspacioId(selectedEspacio.id);
      
      // Deseleccionar chat al cambiar de espacio
      setSelectedChat(null);
      
      loadDataForEspacio(selectedEspacio.id).finally(() => {
        setIsLoadingChats(false);
      });
    }
  }, [selectedEspacio, lastLoadedEspacioId, loadDataForEspacio]);

  // Efecto para establecer "Todos" como opción por defecto cuando se cargan embudos
  useEffect(() => {
    if (embudos.length > 0 && selectedEmbudo === null) {
      // No seleccionar ningún embudo específico, mantener "Todos" como por defecto
      // selectedEmbudo permanece null, lo que significa "Todos"
    }
  }, [embudos, selectedEmbudo]);

  // Efecto para filtrar chats cuando cambia el embudo seleccionado
  useEffect(() => {
    filterChatsByEmbudo();
  }, [filterChatsByEmbudo]);

  // Escuchar nuevos mensajes via WebSocket para actualizar la lista de chats
  useEffect(() => {
    const handleNewMessage = (eventData: ChatNewMessageEvent) => {
      const { chat_id, message } = eventData;
      
      const isChatOpen = selectedChat?.id === chat_id;

      // Función helper para actualizar un chat en la lista
      const updateChatInList = (prevChats: ChatType[]) => {
        const chatIndex = prevChats.findIndex(chat => chat.id === chat_id);
        
        if (chatIndex !== -1) {
          const updatedChat = {
            ...prevChats[chatIndex],
            ultimoMensaje: message as MensajeResponse,
            chat_data: {
              ...prevChats[chatIndex].chat_data,
              nuevos_mensajes: !isChatOpen
            }
          };
          
          const newChats = [...prevChats];
          newChats.splice(chatIndex, 1);
          newChats.unshift(updatedChat);
          
          return newChats;
        }
        
        return prevChats;
      };

      setAllChats(updateChatInList);
      setChats(updateChatInList);
    };

    on('chat:new_message', handleNewMessage);

    return () => {
      off('chat:new_message', handleNewMessage);
    };
  }, [on, off, selectedChat]);

  // Filtrar chats por búsqueda
  const filteredChats = chats.filter(chat =>
    chat.contacto.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chat.contacto.telefono && chat.contacto.telefono.trim() !== '' && chat.contacto.telefono.includes(searchQuery)) ||
    (chat.ultimoMensaje && getMessageContent(chat.ultimoMensaje).toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Seleccionar chat
  const handleSelectChat = async (chat: ChatType) => {
    setSelectedChat(chat);
    
    if (chat.chat_data.nuevos_mensajes) {
      try {
        const result = await chatServices.marcarChatComoLeido(chat.id);
        
        if (result.success && result.data) {
          const updateReadStatus = (chats: ChatType[]) =>
            chats.map(c => c.id === chat.id ? { ...c, chat_data: { ...c.chat_data, nuevos_mensajes: false } } : c);
          
          setAllChats(updateReadStatus);
          setChats(updateReadStatus);
        }
      } catch (error) {
        console.error('Error al marcar chat como leído:', error);
      }
    }
  };

  // Función para manejar click derecho en un chat
  const handleContextMenu = (event: React.MouseEvent, chat: ChatType) => {
    event.preventDefault();
    event.stopPropagation();
    
    setContextMenu({
      isOpen: true,
      position: { x: event.clientX, y: event.clientY },
      chatId: chat.id,
      chatName: chat.contacto.nombre
    });
  };

  // Función para cerrar el menú contextual
  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  };

  // Función para eliminar un chat
  const handleDeleteChat = async () => {
    if (!contextMenu.chatId) return;

    try {
      const result = await chatServices.deleteChatById(contextMenu.chatId);
      
      if (result.success) {
        const removeChatFromList = (chats: ChatType[]) =>
          chats.filter(chat => chat.id !== contextMenu.chatId);
        
        setAllChats(removeChatFromList);
        setChats(removeChatFromList);
        
        if (selectedChat?.id === contextMenu.chatId) {
          setSelectedChat(null);
        }
      } else {
        console.error('Error eliminando chat:', result.error);
      }
    } catch (error) {
      console.error('Error eliminando chat:', error);
    } finally {
      closeContextMenu();
    }
  };

  // Función para manejar la actualización del contacto
  const handleContactUpdate = (updatedContact: ContactResponse, updatedChat?: ChatResponse) => {
    const updateChatContact = (chats: ChatType[]) =>
      chats.map(chat => {
        if (chat.contacto.id === updatedContact.id) {
          const chatUpdate = { ...chat, contacto: updatedContact };
          if (updatedChat && chat.id === updatedChat.id) {
            chatUpdate.chat_data = updatedChat;
          }
          return chatUpdate;
        }
        return chat;
      });

    setAllChats(updateChatContact);
    setChats(updateChatContact);

    if (selectedChat && selectedChat.contacto.id === updatedContact.id) {
      setSelectedChat(prevSelectedChat => {
        if (!prevSelectedChat) return null;
        const updatedSelectedChat = { ...prevSelectedChat, contacto: updatedContact };
        if (updatedChat && prevSelectedChat.id === updatedChat.id) {
          updatedSelectedChat.chat_data = updatedChat;
        }
        return updatedSelectedChat;
      });
    }

    if (updatedChat && selectedEmbudo) {
      setTimeout(() => filterChatsByEmbudo(), 100);
    }
  };

  return (
    <div className="h-[847px] flex flex-col overflow-hidden">
      {/* Header de Chats */}
      <ChatListHeader
        espaciosTrabajo={espaciosTrabajo}
        selectedEspacio={selectedEspacio}
        onEspacioChange={setSelectedEspacio}
        chatCount={chats.length}
      />

      {/* Filtros de embudos */}
      {selectedEspacio && embudos.length > 0 && (
        <div className="flex-shrink-0">
          <EmbudosFilter
            embudos={embudos}
            selectedEmbudo={selectedEmbudo}
            sesiones={sesiones}
            onEmbudoSelect={handleEmbudoSelect}
          />
        </div>
      )}

      {/* Contenido principal */}
      <div className="flex-1 flex min-h-0 max-h-[750px]">
        {/* Lista de chats */}
        <div className="w-1/3 bg-[var(--bg-primary)] border-r border-[var(--border-primary)] flex flex-col min-h-0">
          {/* Loading state */}
          {(isLoading || isLoadingChats) && (
            <LoadingState
              title={isLoading ? 'Cargando datos...' : 'Cargando chats...'}
              subtitle={isLoading ? 'Obteniendo datos del espacio de trabajo' : 'Obteniendo conversaciones'}
            />
          )}
          
          {/* No workspace selected */}
          {!isLoading && !selectedEspacio && (
            <EmptyState
              icon={<Building2 className="w-16 h-16" />}
              title="Selecciona un espacio"
              subtitle="Elige un espacio de trabajo para ver sus conversaciones"
            />
          )}
          
          {/* Show chats when workspace is selected and not loading */}
          {!isLoading && !isLoadingChats && selectedEspacio && (
            <>
              {/* Buscador */}
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Buscar chats..."
              />

              {/* Lista de chats con scroll */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {filteredChats.map((chat) => (
                  <ChatListItem
                    key={chat.id}
                    chat={chat}
                    isSelected={selectedChat?.id === chat.id}
                    onClick={() => handleSelectChat(chat)}
                    onContextMenu={(e) => handleContextMenu(e, chat)}
                  />
                ))}

                {filteredChats.length === 0 && (
                  <EmptyState
                    icon={<MessageCircle className="w-16 h-16" />}
                    title="No hay chats"
                    subtitle={searchQuery ? 'No se encontraron chats con ese término' : 'Aún no tienes conversaciones'}
                  />
                )}
              </div>
            </>
          )}
        </div>

        {/* Área de conversación */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          <Chat chat={selectedChat} onContactUpdate={handleContactUpdate} />
        </div>
      </div>

      {/* Menú contextual */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={closeContextMenu}
        onDelete={handleDeleteChat}
        chatName={contextMenu.chatName}
      />


    </div>
  );
}
