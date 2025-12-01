import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import ConversationList from '@/components/conversations/ConversationList';
import ChatArea from '@/components/conversations/ChatArea';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ContactInfoPanel } from '@/components/conversations/ContactInfoPanel';
import { useConversations, useMessages, useSearchConversations } from '@/hooks/useConversations';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';
import { useWhatsAppConnections } from '@/hooks/useWhatsAppConnections';
import { useTwilioConnections } from '@/hooks/useTwilioConnections';
import { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { embudoServices, EmbudoResponse } from '@/services/embudoServices';
import { toast } from '@/hooks/use-toast';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];

const Conversations = () => {
  const { user } = useAuth();
  const { effectiveUserId } = useEffectiveUserId();
  const location = useLocation();
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

  // Hooks para gestionar datos
  const { conversations, isLoading, unreadCount, markAsRead } = useConversations();
  const { data: searchResults } = useSearchConversations(searchTerm);
  const { messages, sendMessage, sendMessageWithAttachment, isSending } = useMessages(selectedConversation?.id || null);
  const { activeConnections, isSessionActive } = useWhatsAppConnections();
  const { connections: twilioConnections, activeConnections: activeTwilioConnections, isConnectionActive } = useTwilioConnections();

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
    if (selectedEmbudo) {
      filtered = filtered.filter(conv => conv.lead_id && embudoLeadIds.includes(conv.lead_id));
    } else if (selectedWorkspace) {
      filtered = filtered.filter(conv => conv.lead_id && workspaceLeadIds.includes(conv.lead_id));
    }
    return filtered;
  }, [searchTerm, searchResults, conversations, selectedEmbudo, selectedWorkspace, embudoLeadIds, workspaceLeadIds]);

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
    setSelectedConversation(conversation);
    if (conversation.unread_count && conversation.unread_count > 0) {
      markAsRead(conversation.id);
    }
    
    // Auto-seleccionar sesión WhatsApp si está activa
    if (conversation.channel_type === 'whatsapp' && conversation.whatsapp_number) {
      if (isSessionActive(conversation.whatsapp_number)) {
        setSelectedWhatsAppSession(conversation.whatsapp_number);
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

        // Telegram no soporta archivos aún
        if (attachment) {
          toast({
            title: 'No soportado',
            description: 'El envío de archivos por Telegram aún no está implementado',
            variant: 'destructive',
          });
          return;
        }

        await sendMessage({
          conversationId: selectedConversation.id,
          userId: effectiveUserId,
          message: messageText.trim(),
          sessionName: '', // No usado en Telegram
          phoneNumber: chatId,
          channelType: 'telegram',
          telegramBotId: telegramBotId
        });
        
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

  return (
    <div className="flex h-full bg-background">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={23} minSize={15} maxSize={40}>
          <ConversationList
            conversations={displayConversations}
            selectedConversation={selectedConversation}
            onSelectConversation={handleSelectConversation}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            isLoading={isLoading}
            unreadCount={unreadCount}
            workspaces={workspaces}
            selectedWorkspace={selectedWorkspace}
            onWorkspaceSelect={setSelectedWorkspace}
            embudos={embudos}
            selectedEmbudo={selectedEmbudo}
            onEmbudoSelect={setSelectedEmbudo}
          />
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
            originalSessionStatus={
              selectedConversation?.channel_type === 'whatsapp'
                ? isSessionActive(selectedConversation.whatsapp_number)
                  ? 'active'
                  : 'disconnected'
                : selectedConversation?.channel_type === 'twilio'
                  ? isConnectionActive(selectedConversation.twilio_connection_id)
                    ? 'active'
                    : 'disconnected'
                  : 'active'
            }
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