import React, { useState } from 'react';

import ConversationList from '@/components/conversations/ConversationList';
import ChatArea from '@/components/conversations/ChatArea';
import { ContactInfoPanel } from '@/components/conversations/ContactInfoPanel';
import { useConversations, useMessages, useSearchConversations } from '@/hooks/useConversations';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';
import { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];

const Conversations = () => {
  const { user } = useAuth();
  const { effectiveUserId } = useEffectiveUserId();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');

  // Hooks para gestionar datos
  const { conversations, isLoading, unreadCount, markAsRead } = useConversations();
  const { data: searchResults } = useSearchConversations(searchTerm);
  const { messages, sendMessage, isSending } = useMessages(selectedConversation?.id || null);

  // Determinar qué conversaciones mostrar
  const displayConversations = searchTerm ? (searchResults || []) : conversations;

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
      />
      
      <ChatArea
        conversation={selectedConversation}
        messages={messages}
        onSendMessage={handleSendMessage}
        isSending={isSending}
      />

      {selectedConversation && (
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