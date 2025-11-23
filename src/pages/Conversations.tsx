import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import ConversationList from '@/components/conversations/ConversationList';
import ChatArea from '@/components/conversations/ChatArea';
import { ContactInfoPanel } from '@/components/conversations/ContactInfoPanel';
import { useConversations, useMessages, useSearchConversations } from '@/hooks/useConversations';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';
import { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { embudoServices, EmbudoResponse } from '@/services/embudoServices';

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

  // Hooks para gestionar datos
  const { conversations, isLoading, unreadCount, markAsRead } = useConversations();
  const { data: searchResults } = useSearchConversations(searchTerm);
  const { messages, sendMessage, isSending } = useMessages(selectedConversation?.id || null);

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
        return;
      }

      try {
        const response = await embudoServices.getEmbudosByEspacio(selectedWorkspace.id);
        if (response.success && response.data) {
          setEmbudos(response.data);
        }
      } catch (error) {
        console.error('Error loading embudos:', error);
      }
    };
    loadEmbudos();
  }, [selectedWorkspace]);

  // Determinar qué conversaciones mostrar
  const displayConversations = React.useMemo(() => {
    let filtered = searchTerm ? (searchResults || []) : conversations;

    if (selectedEmbudo) {
      // Filtrar por embudo_id si existe en la conversación
      // Nota: Necesitamos asegurarnos que el tipo Conversation tenga embudo_id
      // Si no lo tiene en el tipo generado, TypeScript se quejará, pero funcionará en runtime si la columna existe
      filtered = filtered.filter((conv: any) => conv.embudo_id === selectedEmbudo.id);
    }

    return filtered;
  }, [searchTerm, searchResults, conversations, selectedEmbudo]);

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
  };

  // Manejar envío de mensaje
  const handleSendMessage = async (messageText: string, attachment?: File) => {
    if ((!messageText.trim() && !attachment) || !selectedConversation || !effectiveUserId) return;

    try {
      // Obtener la sesión de WhatsApp asociada al número
      const { data: whatsappConnection, error: connectionError } = await supabase
        .from('whatsapp_connections')
        .select('name')
        .eq('user_id', effectiveUserId)
        .eq('status', 'WORKING')
        .limit(1)
        .single();

      if (connectionError || !whatsappConnection) {
        console.error('No active WhatsApp connection found');
        return;
      }

      const sessionName = whatsappConnection.name;
      const phoneNumber = selectedConversation.phone_number;

      // Por ahora solo soportamos mensajes de texto
      if (attachment) {
        console.warn('Attachments not yet supported with WAHA');
        // TODO: Implementar envío de archivos con WAHA
        return;
      }

      await sendMessage({
        conversationId: selectedConversation.id,
        userId: effectiveUserId,
        message: messageText.trim(),
        sessionName: sessionName,
        phoneNumber: phoneNumber
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="flex h-full bg-background">
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

      <ChatArea
        conversation={selectedConversation}
        messages={messages}
        onSendMessage={handleSendMessage}
        isSending={isSending}
        onToggleInfoPanel={() => setShowInfoPanel(!showInfoPanel)}
      />

      {selectedConversation && showInfoPanel && (
        <ContactInfoPanel
          conversationId={selectedConversation.id}
          contactName={selectedConversation.contact_name || selectedConversation.pushname || 'Contacto'}
          phoneNumber={selectedConversation.phone_number}
        />
      )}
    </div>
  );
};

export default Conversations;