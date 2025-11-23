'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3 } from 'lucide-react';
import { mensajesServices } from '@/services/mensajesServices';
import { MensajeResponse } from '@/app/api/mensajes/domain/mensaje';
import { chatServices } from '@/services/chatServices';
import { ChatResponse } from '@/app/api/chats/domain/chat';
import { contactoServices, ContactResponse } from '@/services/contactoServices';
import { sesionesServices } from '@/services/sesionesServices';
import { SesionResponse } from '@/app/api/sesiones/domain/sesion';
// Tipos para los chats basados en datos reales de la API
interface Chat {
  id: string;
  contacto: ContactResponse;
  ultimoMensaje?: MensajeResponse;
  sesion: SesionResponse;
  chat_data: ChatResponse;
  estado: 'activo' | 'archivado' | 'pausado';
}
import { embudoServices, EspacioConEmbudos } from '@/services/embudoServices';
import { EmbudoResponse } from '@/app/api/embudos/domain/embudo';
import { espacioTrabajoServices, EspacioTrabajoResponse } from '@/services/espacioTrabajoServices';
import NuevoEmbudoModal from '@/app/dashboard/configuracion/components/NuevoEmbudoModal';
import EditarEmbudoModal from '@/app/dashboard/configuracion/components/EditarEmbudoModal';
import ConfirmarEliminarEmbudoModal from '@/app/dashboard/configuracion/components/ConfirmarEliminarEmbudoModal';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
// import {
//   useSortable,
// } from '@dnd-kit/sortable';
// import { CSS } from '@dnd-kit/utilities';
import DraggableEmbudo from './components/DraggableEmbudo';
import DraggableChat from './components/DraggableChat';
import ChatModal from '../chats/components/ChatModal';

export default function EmbudosPage() {
  const [espaciosConEmbudos, setEspaciosConEmbudos] = useState<EspacioConEmbudos[]>([]);
  const [selectedEspacio, setSelectedEspacio] = useState<EspacioTrabajoResponse | null>(null);
  const [allChats, setAllChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedChatForModal, setSelectedChatForModal] = useState<Chat | null>(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  // Estados para modales
  const [showNuevoEmbudoModal, setShowNuevoEmbudoModal] = useState(false);
  const [showEditarEmbudoModal, setShowEditarEmbudoModal] = useState(false);
  const [showEliminarEmbudoModal, setShowEliminarEmbudoModal] = useState(false);
  const [selectedEmbudo, setSelectedEmbudo] = useState<EmbudoResponse | null>(null);
  const [selectedEmbudoForDelete, setSelectedEmbudoForDelete] = useState<EmbudoResponse | null>(null);
  
  // Estado para drag & drop
  const [activeDragChat, setActiveDragChat] = useState<Chat | null>(null);
  const [movingChatId, setMovingChatId] = useState<string | null>(null);

  // Configuración de sensores para drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Distancia mínima para activar drag
      },
    })
  );

  const loadEspaciosYEmbudos = useCallback(async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Cargar espacios, embudos, chats, contactos, sesiones y mensajes en paralelo
      const [espaciosResult, embudosResult, chatsResult, contactosResult, sesionesResult, mensajesResult] = await Promise.all([
        espacioTrabajoServices.getAllEspaciosTrabajo(),
        embudoServices.getAllEmbudos(),
        chatServices.getAllChats(),
        contactoServices.getAllContactos(),
        sesionesServices.getAllSesiones(),
        mensajesServices.getAllMensajes()
      ]);
      
      if (espaciosResult.success && espaciosResult.data) {
        const espacios = espaciosResult.data;
        const embudos = embudosResult.success ? embudosResult.data || [] : [];
        const chatsData = chatsResult.success ? chatsResult.data || [] : [];
        const contactosData = contactosResult.success ? contactosResult.data || [] : [];
        const sesionesData = sesionesResult.success ? sesionesResult.data || [] : [];
        const mensajesData = mensajesResult.success ? mensajesResult.data || [] : [];
        
        // Guardar datos en estado (solo los que necesitamos para construir chats)
        
        // Crear un mapa de mensajes por chat_id para optimizar búsqueda
        const mensajesPorChat = new Map<string, MensajeResponse>();
        mensajesData.forEach(mensaje => {
          const mensajeExistente = mensajesPorChat.get(mensaje.chat_id);
          if (!mensajeExistente || new Date(mensaje.creado_en) > new Date(mensajeExistente.creado_en)) {
            mensajesPorChat.set(mensaje.chat_id, mensaje);
          }
        });

        // Crear objetos Chat completos
        const chatsCompletos: Chat[] = [];
        for (const chatData of chatsData) {
          const contacto = contactosData.find(c => c.id === chatData.contact_id);
          const sesion = sesionesData.find(s => s.id === chatData.sesion_id);

          if (contacto && sesion) {
            const ultimoMensaje = mensajesPorChat.get(chatData.id);

            chatsCompletos.push({
              id: chatData.id,
              contacto,
              ultimoMensaje,
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
        
        // Asociar embudos a sus espacios correspondientes y ordenarlos
        const espaciosConEmbudos: EspacioConEmbudos[] = espacios.map(espacio => ({
          ...espacio,
          embudos: embudos
            .filter(embudo => embudo.espacio_id === espacio.id)
            .sort((a, b) => (a.orden || 0) - (b.orden || 0)) // Ordenar por campo orden
        }));
        
        setEspaciosConEmbudos(espaciosConEmbudos);
        
        // Seleccionar el primer espacio por defecto si no hay ninguno seleccionado
        if (espacios.length > 0) {
          setSelectedEspacio(prevSelected => {
            // Solo actualizar si no hay espacio seleccionado o si el espacio actual ya no existe
            if (!prevSelected || !espacios.find(e => e.id === prevSelected.id)) {
              return espacios[0];
            }
            return prevSelected;
          });
        }
        
        console.log('Espacios con embudos cargados:', espaciosConEmbudos);
        console.log('Chats cargados:', chatsCompletos);
      } else {
        setError(espaciosResult.error || 'Error al cargar espacios de trabajo');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error loading espacios y embudos:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Función para obtener chats de un embudo específico
  const getChatsByEmbudo = useCallback((embudoId: string): Chat[] => {
    return allChats.filter(chat => chat.chat_data.embudo_id === embudoId);
  }, [allChats]);

  useEffect(() => {
    loadEspaciosYEmbudos();
  }, [loadEspaciosYEmbudos]); // Solo ejecutar una vez al montar el componente

  // Forzar re-renderización cuando cambie el espacio seleccionado
  useEffect(() => {
    console.log('🔄 Espacio seleccionado cambió:', selectedEspacio?.id);
  }, [selectedEspacio?.id]);

  // Estado local para forzar actualización de embudos
  const [embudosForzados, setEmbudosForzados] = useState<EmbudoResponse[]>([]);

  // Actualizar embudos cuando cambie el espacio seleccionado
  useEffect(() => {
    if (selectedEspacio) {
      const espacioEncontrado = espaciosConEmbudos.find(e => e.id === selectedEspacio.id);
      const embudosDelEspacio = espacioEncontrado?.embudos || [];
      console.log('🔄 Actualizando embudos forzados:', {
        espacio: selectedEspacio.nombre,
        embudos: embudosDelEspacio.length
      });
      setEmbudosForzados(embudosDelEspacio);
    } else {
      setEmbudosForzados([]);
    }
  }, [selectedEspacio, espaciosConEmbudos]);

  const handleEspacioSelect = (espacio: EspacioTrabajoResponse) => {
    console.log('🎯 handleEspacioSelect llamado con:', espacio.nombre, 'ID:', espacio.id);
    setSelectedEspacio(espacio);
  };

  const handleAgregarEmbudo = () => {
    if (selectedEspacio) {
      setShowNuevoEmbudoModal(true);
    }
  };

  const handleEditEmbudo = (embudo: EmbudoResponse) => {
    setSelectedEmbudo(embudo);
    setShowEditarEmbudoModal(true);
  };

  const handleDeleteEmbudo = (embudo: EmbudoResponse) => {
    setSelectedEmbudoForDelete(embudo);
    setShowEliminarEmbudoModal(true);
  };

  const handleEmbudoCreated = () => {
    loadEspaciosYEmbudos();
    setShowNuevoEmbudoModal(false);
  };

  const handleEmbudoUpdated = () => {
    loadEspaciosYEmbudos();
    setShowEditarEmbudoModal(false);
    setSelectedEmbudo(null);
  };

  const handleEmbudoDeleted = () => {
    loadEspaciosYEmbudos();
    setShowEliminarEmbudoModal(false);
    setSelectedEmbudoForDelete(null);
  };

  const handleChatClick = (chat: Chat) => {
    console.log('handleChatClick llamado con chat:', chat);
    setSelectedChatForModal(chat);
    setIsChatModalOpen(true);
  };

  const handleChatMoved = async (chatId: string, nuevoEmbudoId: string) => {
    console.log('🚀 Iniciando movimiento de chat:', chatId, 'al embudo:', nuevoEmbudoId);
    
    // Guardar el estado original por si necesitamos revertir
    const chatOriginal = allChats.find(chat => chat.id === chatId);
    if (!chatOriginal) {
      console.error('❌ Chat no encontrado para mover');
      return;
    }
    
    const embudoOriginal = chatOriginal.chat_data.embudo_id;
    
    // 1. Marcar el chat como en proceso de movimiento
    setMovingChatId(chatId);
    
    // 2. Actualización optimista INMEDIATA del estado local
    setAllChats(prevChats => 
      prevChats.map(chat => 
        chat.id === chatId 
          ? { ...chat, chat_data: { ...chat.chat_data, embudo_id: nuevoEmbudoId } }
          : chat
      )
    );
    
    try {
      // 2. Llamar al servicio para persistir el cambio en la base de datos
      const result = await chatServices.updateChatById(chatId, { embudo_id: nuevoEmbudoId });
      
      if (result.success) {
        console.log('✅ Chat movido exitosamente en la base de datos');
        // El estado ya está actualizado, no necesitamos hacer nada más
      } else {
        console.error('❌ Error al mover chat:', result.error);
        
        // 3. REVERTIR el cambio si la petición falló
        setAllChats(prevChats => 
          prevChats.map(chat => 
            chat.id === chatId 
              ? { ...chat, chat_data: { ...chat.chat_data, embudo_id: embudoOriginal } }
              : chat
          )
        );
        
        // TODO: Mostrar notificación de error al usuario
        console.error('❌ Chat revertido al embudo original debido al error');
      }
    } catch (error) {
      console.error('❌ Error inesperado al mover chat:', error);
      
      // 3. REVERTIR el cambio si hubo una excepción
      setAllChats(prevChats => 
        prevChats.map(chat => 
          chat.id === chatId 
            ? { ...chat, chat_data: { ...chat.chat_data, embudo_id: embudoOriginal } }
            : chat
        )
      );
      
      // TODO: Mostrar notificación de error al usuario
      console.error('❌ Chat revertido al embudo original debido a la excepción');
    } finally {
      // 4. Limpiar el estado de movimiento
      setMovingChatId(null);
    }
  };

  // Manejar el inicio del drag
  const handleDragStart = (event: DragStartEvent) => {
    console.log('🚀 Drag started:', event.active.id);
    
    const activeIdStr = String(event.active.id);
    if (activeIdStr.startsWith('chat-')) {
        const chatId = activeIdStr.replace('chat-', '');
        const chat = allChats.find(c => c.id === chatId);
      if (chat) {
        setActiveDragChat(chat);
      }
    }
  };

  // Manejar el final del drag & drop
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    console.log('🎯 Drag ended:', { active: active.id, over: over?.id });
    
    // Limpiar el estado del drag
    setActiveDragChat(null);

    if (!over || !over.id) {
      console.log('❌ No over target or no over.id');
      return;
    }

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    
    console.log('📝 Processing:', { activeIdStr, overIdStr });

    // Verificar si es un chat siendo arrastrado
    if (activeIdStr.startsWith('chat-')) {
      console.log('✅ Es un chat siendo arrastrado');
      const chatId = activeIdStr.replace('chat-', '');
      
      // Verificar si se está soltando sobre un embudo
      if (overIdStr.startsWith('embudo-drop-')) {
        console.log('✅ Se está soltando sobre un embudo');
        const nuevoEmbudoId = overIdStr.replace('embudo-drop-', '');
        
        // Encontrar el chat actual
        const chatActual = allChats.find(c => c.id === chatId);
        if (!chatActual) {
          console.log('❌ Chat no encontrado');
          return;
        }
        
        if (chatActual.chat_data.embudo_id === nuevoEmbudoId) {
          console.log('❌ Es el mismo embudo, no hacer nada');
          return;
        }

        console.log('🚀 Moviendo chat:', chatId, 'al embudo:', nuevoEmbudoId);
        // Mover el chat inmediatamente
        await handleChatMoved(chatId, nuevoEmbudoId);
        return;
      } else {
        console.log('❌ No se está soltando sobre un embudo válido');
      }
    } else {
      console.log('❌ No es un chat siendo arrastrado');
    }

    // Solo manejar chats, no hay reordenamiento de embudos
  };

  // Los embudos ahora se manejan con el estado embudosForzados

  // Debug: Log de chats y embudos
  React.useEffect(() => {
    if (allChats.length > 0 || embudosForzados.length > 0) {
      console.log('🔍 Debug info:', {
        chats: allChats.length,
        embudos: embudosForzados.length,
        chatIds: allChats.map(c => `chat-${c.id}`),
        embudoIds: embudosForzados.map(e => `embudo-drop-${e.id}`),
        selectedEspacio: selectedEspacio?.id
      });
    }
  }, [allChats, embudosForzados, selectedEspacio?.id]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-[var(--text-primary)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)] mx-auto mb-4"></div>
          <p>Cargando embudos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-w-0">
      {/* Header con selector de espacio */}
      <div className="bg-[var(--bg-primary)] border-b border-[var(--border-primary)] px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          {/* Left Section - Selector de Espacio */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded cursor-pointer">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="relative">
                <select
                  value={selectedEspacio?.id.toString() || ''}
                  onChange={(e) => {
                    const espacioId = e.target.value;
                    const espacio = espaciosConEmbudos.find(esp => esp.id.toString() === espacioId);
                    if (espacio) {
                      console.log('🔄 Cambiando a espacio:', espacio.nombre, 'ID:', espacio.id);
                      handleEspacioSelect(espacio);
                    }
                  }}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)] text-md font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] appearance-none cursor-pointer pr-8"
                >
                  <option value="">Seleccionar espacio</option>
                  {espaciosConEmbudos.map((espacio) => (
                    <option key={espacio.id} value={espacio.id.toString()}>
                      {espacio.nombre}
                    </option>
                  ))}
                </select>
                <svg className="w-4 h-4 text-[var(--text-muted)] absolute right-3 top-3 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Embudos */}
      <div className="flex-1 bg-[var(--bg-primary)] min-w-0 min-h-0 p-6">
        {selectedEspacio ? (
          <div className="h-full min-w-0 flex flex-col">

            {/* Grid de embudos */}
            <div className="flex-1 min-w-0 min-h-0">
              {(() => {
                console.log('🎨 Renderizando embudos:', {
                  selectedEspacio: selectedEspacio?.nombre,
                  embudosForzadosLength: embudosForzados.length,
                  embudosIds: embudosForzados.map(e => e.id)
                });
                return null;
              })()}
              {embudosForzados.length > 0 ? (
                <div className="h-full">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex flex-row gap-6 overflow-x-auto overflow-y-hidden h-full items-stretch pb-4 scrollbar-thin">
                    {embudosForzados.map((embudo, index) => (
                      <div key={embudo.id} className="flex-shrink-0 w-110 h-full min-h-0">
                        <DraggableEmbudo
                          embudo={embudo}
                          index={index}
                          chats={getChatsByEmbudo(embudo.id)}
                          onEdit={handleEditEmbudo}
                          onDelete={handleDeleteEmbudo}
                          onChatClick={handleChatClick}
                          onChatMoved={handleChatMoved}
                          movingChatId={movingChatId}
                        />
                      </div>
                    ))}
                    </div>
                    
                    {/* Overlay para mostrar el chat mientras se arrastra */}
                    <DragOverlay>
                      {activeDragChat ? (
                        <div className="transform rotate-3 opacity-90 shadow-2xl">
                          <DraggableChat
                            chat={activeDragChat}
                            onChatClick={() => {}} // No hacer nada durante el drag
                          />
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                </div>
              ) : (
                <div className="text-center py-16">
                  <BarChart3 className="text-[var(--text-muted)] w-24 h-24 mx-auto mb-4" />
                  <h3 className="text-[var(--text-primary)] text-lg font-medium mb-2">No hay embudos en este espacio</h3>
                  <p className="text-[var(--text-muted)] text-sm mb-6">
                    Crea tu primer embudo para comenzar a gestionar tu flujo de trabajo.
                  </p>
                  <button 
                    onClick={handleAgregarEmbudo}
                    className="bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white px-6 py-3 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    + Crear Primer Embudo
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-[var(--text-muted)] text-6xl mb-4">⚙️</div>
              <h3 className="text-[var(--text-primary)] text-lg font-medium mb-2">Selecciona un espacio de trabajo</h3>
              <p className="text-[var(--text-muted)] text-sm">
                Elige un espacio del selector para ver y gestionar sus embudos.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      {selectedEspacio && (
        <NuevoEmbudoModal
          isOpen={showNuevoEmbudoModal}
          onClose={() => setShowNuevoEmbudoModal(false)}
          onEmbudoCreated={handleEmbudoCreated}
          espacioId={selectedEspacio.id}
          espacioNombre={selectedEspacio.nombre}
        />
      )}

      <EditarEmbudoModal
        isOpen={showEditarEmbudoModal}
        onClose={() => {
          setShowEditarEmbudoModal(false);
          setSelectedEmbudo(null);
        }}
        onEmbudoUpdated={handleEmbudoUpdated}
        embudo={selectedEmbudo}
      />

      <ConfirmarEliminarEmbudoModal
        isOpen={showEliminarEmbudoModal}
        onClose={() => {
          setShowEliminarEmbudoModal(false);
          setSelectedEmbudoForDelete(null);
        }}
        onEmbudoDeleted={handleEmbudoDeleted}
        embudo={selectedEmbudoForDelete}
      />

      {/* Modal de Chat */}
      <ChatModal
        isOpen={isChatModalOpen}
        onClose={() => {
          setIsChatModalOpen(false);
          setSelectedChatForModal(null);
        }}
        chat={selectedChatForModal}
        onContactUpdate={(updatedContact, updatedChat) => {
          // Actualizar el contacto en todos los chats
          setAllChats(prevChats => 
            prevChats.map(chat => {
              if (chat.contacto.id === updatedContact.id) {
                const chatUpdate = { ...chat, contacto: updatedContact };
                if (updatedChat && chat.id === updatedChat.id) {
                  chatUpdate.chat_data = updatedChat;
                }
                return chatUpdate;
              }
              return chat;
            })
          );

          // Actualizar el chat seleccionado en el modal si es necesario
          if (selectedChatForModal && selectedChatForModal.contacto.id === updatedContact.id) {
            setSelectedChatForModal(prevChat => {
              if (!prevChat) return null;
              const updatedSelectedChat = { ...prevChat, contacto: updatedContact };
              if (updatedChat && prevChat.id === updatedChat.id) {
                updatedSelectedChat.chat_data = updatedChat;
              }
              return updatedSelectedChat;
            });
          }
        }}
      />

    </div>
  );
}
