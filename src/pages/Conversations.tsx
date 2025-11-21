import React, { useState } from 'react';

import ConversationList from '@/components/conversations/ConversationList';
import ChatArea from '@/components/conversations/ChatArea';
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

    let attachmentUrl = null;
    
    // Subir archivo si existe
    if (attachment) {
      try {
        const fileExt = attachment.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${effectiveUserId}/${fileName}`;

        const { data, error } = await supabase.storage
          .from('message-attachments')
          .upload(filePath, attachment);

        if (error) {
          console.error('Error uploading file:', error);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(filePath);

        attachmentUrl = publicUrl;
      } catch (error) {
        console.error('Error uploading attachment:', error);
        return;
      }
    }

    sendMessage({
      conversation_id: selectedConversation.id,
      message: messageText.trim() || '',
      direction: 'outgoing',
      whatsapp_number: selectedConversation.whatsapp_number,
      instance_name: selectedConversation.instance_name || '',
      user_id: effectiveUserId,
      message_type: attachment ? 'file' : 'text',
      is_bot: false,
      attachment_url: attachmentUrl,
      file_url: attachmentUrl,
    });
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
    </div>
  );
};

export default Conversations;