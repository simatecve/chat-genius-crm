import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import ConversationList from '@/components/conversations/ConversationList';
import ChatArea from '@/components/conversations/ChatArea';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ContactInfoPanel } from '@/components/conversations/ContactInfoPanel';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useConversations, useMessages, useSearchConversations } from '@/hooks/useConversations';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';
import { useWhatsAppConnections } from '@/hooks/useWhatsAppConnections';
import { useTwilioConnections } from '@/hooks/useTwilioConnections';
import { useTelegramConnections } from '@/hooks/useTelegramConnections';
import { useIsMobile } from '@/hooks/use-mobile';
import { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { embudoServices, EmbudoResponse } from '@/services/embudoServices';
import { toast } from '@/hooks/use-toast';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];

export type FilterMode = 'all' | 'unassigned' | 'funnel' | 'pending' | 'stale' | 'offline' | 'bot_off' | 'urgent';

export interface SessionOption {
  id: string;
  name: string;
  type: 'whatsapp' | 'telegram' | 'twilio';
  identifier: string;
}

const Conversations = () => {
  const { user } = useAuth();
  const { effectiveUserId } = useEffectiveUserId();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [embudos, setEmbudos] = useState<EmbudoResponse[]>([]);
  const [selectedEmbudo, setSelectedEmbudo] = useState<EmbudoResponse | null>(null);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<any | null>(null);
  const [columns, setColumns] = useState<{ id: string; name: string }[]>([]);
  const [workspaceLeadIds, setWorkspaceLeadIds] = useState<string[]>([]);
  const [embudoLeadIds, setEmbudoLeadIds] = useState<string[]>([]);
  const [selectedWhatsAppSession, setSelectedWhatsAppSession] = useState<string | null>(null);
  const [selectedTwilioConnection, setSelectedTwilioConnection] = useState<string | null>(null);
  
  // Nuevos estados para filtros
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<string | null>(null);
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'mine' | 'unassigned'>('all');
  const [onlineAgentIds, setOnlineAgentIds] = useState<string[]>([]);

  // Hooks para gestionar datos
  const { conversations, isLoading, unreadCount, markAsRead } = useConversations();
  const { data: searchResults } = useSearchConversations(searchTerm);
  const { messages, sendMessage, sendMessageWithAttachment, isSending } = useMessages(selectedConversation?.id || null);
  const { activeConnections, isSessionActiveByPhone, getSessionNameByPhone, connections: whatsappConnections } = useWhatsAppConnections();
  const { connections: twilioConnections, activeConnections: activeTwilioConnections, isConnectionActive } = useTwilioConnections();
  const { connections: telegramConnections } = useTelegramConnections();

  // Construir lista de sesiones disponibles para filtro
  const sessionOptions: SessionOption[] = React.useMemo(() => {
    const options: SessionOption[] = [];
    
    whatsappConnections.forEach(conn => {
      options.push({
        id: conn.phone_number,
        name: conn.name || conn.phone_number,
        type: 'whatsapp',
        identifier: conn.phone_number
      });
    });
    
    telegramConnections.forEach(conn => {
      options.push({
        id: conn.id,
        name: conn.bot_name,
        type: 'telegram',
        identifier: conn.bot_username || conn.id
      });
    });
    
    twilioConnections.forEach(conn => {
      options.push({
        id: conn.id,
        name: conn.connection_name,
        type: 'twilio',
        identifier: conn.phone_number
      });
    });
    
    return options;
  }, [whatsappConnections, telegramConnections, twilioConnections]);

  console.log('[Conversations] Current state:', {
    selectedConversationId: selectedConversation?.id,
    messagesCount: messages.length,
    messagesPreview: messages.slice(0, 3).map(m => ({ id: m.id, content: m.content?.substring(0, 20), direction: m.direction }))
  });

  // Cargar workspaces
  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: workspacesData } = await supabase
            .from('workspaces')
            .select('*')
            .eq('user_id', user.id)
            .order('position');

          if (workspacesData && workspacesData.length > 0) {
            setWorkspaces(workspacesData);
            setSelectedWorkspace(workspacesData[0]);
          }
        }
      } catch (error) {
        console.error('Error loading workspaces:', error);
      }
    };
    loadWorkspaces();
  }, []);

  // Cargar embudos cuando cambia el workspace seleccionado
  useEffect(() => {
    const loadEmbudos = async () => {
      if (!selectedWorkspace) {
        setEmbudos([]);
        setColumns([]);
        setWorkspaceLeadIds([]);
        return;
      }

      try {
        const response = await embudoServices.getEmbudosByEspacio(selectedWorkspace.id);
        if (response.success && response.data) {
          setEmbudos(response.data);
          setColumns(response.data.map(e => ({ id: e.id, name: e.name })));
          const columnIds = response.data.map(e => e.id);
          if (columnIds.length > 0) {
            const { data: leadsData } = await supabase
              .from('leads')
              .select('id')
              .in('column_id', columnIds);
            setWorkspaceLeadIds((leadsData || []).map(l => l.id as string));
          } else {
            setWorkspaceLeadIds([]);
          }
        }
      } catch (error) {
        console.error('Error loading embudos:', error);
      }
    };
    loadEmbudos();
  }, [selectedWorkspace]);

  useEffect(() => {
    const loadPresence = async () => {
      if (!effectiveUserId) return;
      const { data } = await supabase
        .from('agent_presence')
        .select('user_id, status, manual_override, last_seen_at')
        .eq('account_owner_id', effectiveUserId)
        .gte('last_seen_at', new Date(Date.now() - 90_000).toISOString());
      setOnlineAgentIds((data || []).filter(agent => !['busy', 'offline'].includes(agent.manual_override || agent.status || 'offline')).map(agent => agent.user_id));
    };
    loadPresence();
  }, [effectiveUserId]);

  useEffect(() => {
    const loadLeadsByEmbudo = async () => {
      if (!selectedEmbudo) {
        setEmbudoLeadIds([]);
        return;
      }
      const { data: leadsData } = await supabase
        .from('leads')
        .select('id')
        .eq('column_id', selectedEmbudo.id);
      setEmbudoLeadIds((leadsData || []).map(l => l.id as string));
    };
    loadLeadsByEmbudo();
  }, [selectedEmbudo]);

  // Determinar qué conversaciones mostrar
  const displayConversations = React.useMemo(() => {
    let filtered = searchTerm ? (searchResults || []) : conversations;
    
    // 1. Excluir webchat - tienen su propia página
    filtered = filtered.filter(conv => conv.channel_type !== 'webchat');
    
    // 2. Filtrar por sesión/conexión si está seleccionada
    if (selectedSessionFilter) {
      const selectedSession = sessionOptions.find(s => s.id === selectedSessionFilter);
      if (selectedSession) {
        if (selectedSession.type === 'whatsapp') {
          filtered = filtered.filter(conv => conv.whatsapp_number === selectedSession.identifier);
        } else if (selectedSession.type === 'telegram') {
          filtered = filtered.filter(conv => conv.telegram_bot_id === selectedSession.id);
        } else if (selectedSession.type === 'twilio') {
          filtered = filtered.filter(conv => conv.twilio_connection_id === selectedSession.id);
        }
      }
    }
    
    // 3. Filtrar por modo operativo/embudo
    if (filterMode === 'unassigned') {
      filtered = filtered.filter(conv => !conv.lead_id);
    } else if (filterMode === 'pending') {
      filtered = filtered.filter(conv => (conv.unread_count || 0) > 0);
    } else if (filterMode === 'stale') {
      const cutoff = Date.now() - 30 * 60 * 1000;
      filtered = filtered.filter(conv => (conv.unread_count || 0) > 0 && new Date(conv.last_inbound_message_time || conv.last_message_time || conv.created_at || 0).getTime() < cutoff);
    } else if (filterMode === 'offline') {
      filtered = filtered.filter(conv => conv.assigned_to && !onlineAgentIds.includes(conv.assigned_to));
    } else if (filterMode === 'bot_off') {
      filtered = filtered.filter((conv: any) => (conv.unread_count || 0) > 0 && !onlineAgentIds.includes(conv.assigned_to || '') && conv.channel_type !== 'webchat');
    } else if (filterMode === 'urgent') {
      filtered = filtered.filter(conv => !!conv.payment_receipt_detected_at || (conv.last_message || '').toLowerCase().includes('comprobante'));
    } else if (filterMode === 'funnel') {
      if (selectedEmbudo) {
        filtered = filtered.filter(conv => conv.lead_id && embudoLeadIds.includes(conv.lead_id));
      } else if (selectedWorkspace) {
        filtered = filtered.filter(conv => conv.lead_id && workspaceLeadIds.includes(conv.lead_id));
      }
    }
    // Si filterMode === 'all', no filtra por lead_id ni pendientes

    // 4. Filtrar por asignación
    if (assignmentFilter === 'mine' && user?.id) {
      filtered = filtered.filter((c: any) => c.assigned_to === user.id);
    } else if (assignmentFilter === 'unassigned') {
      filtered = filtered.filter((c: any) => !c.assigned_to);
    }

    // 5. Ordenar por fecha de último mensaje descendente (más recientes primero)
    filtered = [...filtered].sort((a, b) => {
      const dateA = new Date(a.last_message_time || a.created_at || 0).getTime();
      const dateB = new Date(b.last_message_time || b.created_at || 0).getTime();
      return dateB - dateA;
    });
    
    return filtered;
  }, [searchTerm, searchResults, conversations, selectedEmbudo, selectedWorkspace, embudoLeadIds, workspaceLeadIds, filterMode, selectedSessionFilter, sessionOptions, assignmentFilter, user?.id, onlineAgentIds]);

  // Seleccionar conversación automáticamente desde navegación de embudos
  useEffect(() => {
    const state = location.state as { conversationId?: string } | null;
    if (state?.conversationId && conversations.length > 0) {
      const conversation = conversations.find(conv => conv.id === state.conversationId);
      if (conversation) {
        handleSelectConversation(conversation);
        // Limpiar el estado de navegación
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, conversations]);

  // Manejar selección de conversación
  const handleSelectConversation = (conversation: Conversation) => {
    console.log('[Conversations] Selecting conversation:', conversation.id, 'unread:', conversation.unread_count);
    setSelectedConversation(conversation);
    if (conversation.unread_count && conversation.unread_count > 0) {
      console.log('[Conversations] Marking as read:', conversation.id);
      markAsRead(conversation.id);
    }
    
    // Auto-seleccionar sesión WhatsApp si está activa (buscar por phone_number, usar name para envío)
    if (conversation.channel_type === 'whatsapp' && conversation.whatsapp_number) {
      if (isSessionActiveByPhone(conversation.whatsapp_number)) {
        // Obtener el NOMBRE de la sesión para usar en envío
        const sessionName = getSessionNameByPhone(conversation.whatsapp_number);
        setSelectedWhatsAppSession(sessionName);
      } else if (activeConnections.length > 0) {
        // Si la sesión original no está activa, pre-seleccionar la primera activa
        setSelectedWhatsAppSession(activeConnections[0].name);
      } else {
        setSelectedWhatsAppSession(null);
      }
    }

    // Auto-seleccionar conexión Twilio si está activa
    if (conversation.channel_type === 'twilio' && conversation.twilio_connection_id) {
      if (isConnectionActive(conversation.twilio_connection_id)) {
        setSelectedTwilioConnection(conversation.twilio_connection_id);
      } else if (activeTwilioConnections.length > 0) {
        setSelectedTwilioConnection(activeTwilioConnections[0].id);
      } else {
        setSelectedTwilioConnection(null);
      }
    }
  };

  // Manejar envío de mensaje
  const handleSendMessage = async (messageText: string, attachment?: File) => {
    if ((!messageText.trim() && !attachment) || !selectedConversation || !effectiveUserId) return;

    try {
      const channelType = selectedConversation.channel_type || 'whatsapp';
      
      // Si es Telegram
      if (channelType === 'telegram') {
        const chatId = selectedConversation.phone_number;
        const telegramBotId = selectedConversation.telegram_bot_id;
        
        if (!telegramBotId) {
          console.error('No telegram_bot_id found for this conversation');
          return;
        }

        // Si hay archivo adjunto
        if (attachment) {
          // Subir archivo a Storage
          const FileUploadService = (await import('@/services/fileUploadService')).FileUploadService;
          const { url, path } = await FileUploadService.uploadFile(
            attachment,
            effectiveUserId,
            selectedConversation.id
          );

          await sendMessageWithAttachment({
            conversationId: selectedConversation.id,
            userId: effectiveUserId,
            message: messageText.trim(),
            sessionName: '',
            phoneNumber: chatId,
            fileUrl: url,
            fileName: attachment.name,
            mimeType: attachment.type,
            channelType: 'telegram',
            telegramBotId: telegramBotId,
            twilioConnectionId: null
          });
        } else {
          await sendMessage({
            conversationId: selectedConversation.id,
            userId: effectiveUserId,
            message: messageText.trim(),
            sessionName: '', // No usado en Telegram
            phoneNumber: chatId,
            channelType: 'telegram',
            telegramBotId: telegramBotId
          });
        }
        
        return;
      }

      // Si es Twilio
      if (channelType === 'twilio') {
        if (!selectedTwilioConnection) {
          toast({
            title: 'Conexión no seleccionada',
            description: 'Selecciona una conexión de Twilio para enviar mensajes',
            variant: 'destructive',
          });
          return;
        }

        // Si hay archivo adjunto
        if (attachment) {
          // Subir archivo a Storage
          const FileUploadService = (await import('@/services/fileUploadService')).FileUploadService;
          const { url, path } = await FileUploadService.uploadFile(
            attachment,
            effectiveUserId,
            selectedConversation.id
          );

          await sendMessageWithAttachment({
            conversationId: selectedConversation.id,
            userId: effectiveUserId,
            message: messageText.trim(),
            sessionName: '',
            phoneNumber: selectedConversation.phone_number,
            fileUrl: url,
            fileName: attachment.name,
            mimeType: attachment.type,
            channelType: 'twilio',
            telegramBotId: null,
            twilioConnectionId: selectedTwilioConnection
          });
        } else {
          await sendMessage({
            conversationId: selectedConversation.id,
            userId: effectiveUserId,
            message: messageText.trim(),
            sessionName: '',
            phoneNumber: selectedConversation.phone_number,
            channelType: 'twilio',
            telegramBotId: null,
            twilioConnectionId: selectedTwilioConnection
          });
        }
        
        return;
      }
      
      // Si es WhatsApp
      if (!selectedWhatsAppSession) {
        toast({
          title: 'Sesión no seleccionada',
          description: 'Selecciona una conexión de WhatsApp para enviar mensajes',
          variant: 'destructive',
        });
        return;
      }

      const sessionName = selectedWhatsAppSession;
      const phoneNumber = selectedConversation.phone_number;

      // Si hay archivo adjunto
      if (attachment) {
        // Subir archivo a Storage
        const FileUploadService = (await import('@/services/fileUploadService')).FileUploadService;
        const { url, path } = await FileUploadService.uploadFile(
          attachment,
          effectiveUserId,
          selectedConversation.id
        );

        await sendMessageWithAttachment({
          conversationId: selectedConversation.id,
          userId: effectiveUserId,
          message: messageText.trim(),
          sessionName: sessionName,
          phoneNumber: phoneNumber,
          fileUrl: url,
          fileName: attachment.name,
          mimeType: attachment.type,
          channelType: 'whatsapp',
          telegramBotId: null
        });
      } else {
        await sendMessage({
          conversationId: selectedConversation.id,
          userId: effectiveUserId,
          message: messageText.trim(),
          sessionName: sessionName,
          phoneNumber: phoneNumber,
          channelType: 'whatsapp',
          telegramBotId: null
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje',
        variant: 'destructive',
      });
    }
  };

  // Common props
  const conversationListProps = {
    conversations: displayConversations,
    selectedConversation,
    onSelectConversation: handleSelectConversation,
    searchTerm,
    onSearchChange: setSearchTerm,
    isLoading,
    unreadCount,
    workspaces,
    selectedWorkspace,
    onWorkspaceSelect: setSelectedWorkspace,
    embudos,
    selectedEmbudo,
    onEmbudoSelect: setSelectedEmbudo,
    filterMode,
    onFilterModeChange: setFilterMode,
    sessionOptions,
    selectedSessionFilter,
    onSessionFilterChange: setSelectedSessionFilter,
    assignmentFilter,
    onAssignmentFilterChange: setAssignmentFilter,
  };

  const originalSessionStatus: 'active' | 'disconnected' | 'deleted' =
    selectedConversation?.channel_type === 'whatsapp'
      ? isSessionActiveByPhone(selectedConversation.whatsapp_number)
        ? 'active'
        : 'disconnected'
      : selectedConversation?.channel_type === 'twilio'
        ? isConnectionActive(selectedConversation.twilio_connection_id)
          ? 'active'
          : 'disconnected'
        : 'active';

  // ===== Mobile drill-down layout =====
  if (isMobile) {
    return (
      <div className="flex h-full bg-background">
        {!selectedConversation ? (
          <div className="w-full h-full">
            <ConversationList {...conversationListProps} />
          </div>
        ) : (
          <div className="w-full h-full flex flex-col min-h-0">
            <ChatArea
              conversation={selectedConversation}
              messages={messages}
              onSendMessage={handleSendMessage}
              isSending={isSending}
              onToggleInfoPanel={() => setShowInfoPanel(true)}
              whatsappConnections={activeConnections}
              selectedSession={selectedWhatsAppSession}
              onSessionChange={setSelectedWhatsAppSession}
              twilioConnections={twilioConnections}
              selectedTwilioConnection={selectedTwilioConnection}
              onTwilioConnectionChange={setSelectedTwilioConnection}
              originalSessionStatus={originalSessionStatus}
              onBack={() => setSelectedConversation(null)}
            />
            <Sheet open={showInfoPanel} onOpenChange={setShowInfoPanel}>
              <SheetContent side="right" className="w-[92vw] sm:w-[420px] p-0 overflow-y-auto">
                <SheetHeader className="px-4 py-3 border-b border-border">
                  <SheetTitle>Información del contacto</SheetTitle>
                </SheetHeader>
                <ContactInfoPanel
                  conversationId={selectedConversation.id}
                  contactName={selectedConversation.contact_name || selectedConversation.pushname || 'Contacto'}
                  phoneNumber={selectedConversation.phone_number}
                  whatsappNumber={selectedConversation.whatsapp_number}
                />
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>
    );
  }

  // ===== Desktop layout (sin cambios) =====
  return (
    <div className="flex h-full bg-background">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={23} minSize={15} maxSize={40}>
          <ConversationList {...conversationListProps} />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={showInfoPanel ? 52 : 77} minSize={40} className="h-full min-h-0">
          <ChatArea
            conversation={selectedConversation}
            messages={messages}
            onSendMessage={handleSendMessage}
            isSending={isSending}
            onToggleInfoPanel={() => setShowInfoPanel(!showInfoPanel)}
            whatsappConnections={activeConnections}
            selectedSession={selectedWhatsAppSession}
            onSessionChange={setSelectedWhatsAppSession}
            twilioConnections={twilioConnections}
            selectedTwilioConnection={selectedTwilioConnection}
            onTwilioConnectionChange={setSelectedTwilioConnection}
            originalSessionStatus={originalSessionStatus}
          />
        </ResizablePanel>

        {selectedConversation && showInfoPanel && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={25} minSize={20} maxSize={35} className="h-full min-h-0">
              <ContactInfoPanel
                conversationId={selectedConversation.id}
                contactName={selectedConversation.contact_name || selectedConversation.pushname || 'Contacto'}
                phoneNumber={selectedConversation.phone_number}
                whatsappNumber={selectedConversation.whatsapp_number}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
};

export default Conversations;