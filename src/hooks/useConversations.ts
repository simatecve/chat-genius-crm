import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ConversationService, ConversationWithLastMessage } from '@/services/conversationService';
import { useEffectiveUserId } from './useEffectiveUserId';
import { Database } from '@/integrations/supabase/types';
import { useEffect } from 'react';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';
type Message = Database['public']['Tables']['messages']['Row'];
type MessageInsert = Database['public']['Tables']['messages']['Insert'];

/**
 * Hook para gestionar conversaciones
 */
export const useConversations = () => {
  const { effectiveUserId } = useEffectiveUserId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para obtener todas las conversaciones - optimizado
  const conversationsQuery = useQuery({
    queryKey: ['conversations', effectiveUserId],
    queryFn: () => ConversationService.getConversations(effectiveUserId || ''),
    enabled: !!effectiveUserId,
    staleTime: 5000, // 5 segundos - respuesta más rápida a cambios
    refetchInterval: 30000, // Refetch cada 30 segundos - el realtime maneja actualizaciones
  });

  // Query para obtener el conteo de no leídos - optimizado
  const unreadCountQuery = useQuery({
    queryKey: ['unreadCount', effectiveUserId],
    queryFn: () => ConversationService.getUnreadCount(effectiveUserId || ''),
    enabled: !!effectiveUserId,
    staleTime: 5000, // 5 segundos
    refetchInterval: 30000, // 30 segundos
  });

  // Mutation para marcar como leído
  const markAsReadMutation = useMutation({
    mutationFn: ConversationService.markAsRead,
    onSuccess: (_, conversationId) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
    onError: (error) => {
      console.error('Error marking as read:', error);
      toast({
        title: 'Error',
        description: 'No se pudo marcar la conversación como leída',
        variant: 'destructive',
      });
    },
  });

  // Suscripción a cambios en tiempo real - también escuchar mensajes nuevos
  useEffect(() => {
    if (!effectiveUserId) return;

    // Suscribirse a cambios en conversaciones
    const conversationsSubscription = ConversationService.subscribeToConversations(
      effectiveUserId,
      (payload) => {
        console.log('Conversation change:', payload);
        
        // Si es UPDATE, actualizar el cache directamente y reordenar
        if (payload.eventType === 'UPDATE' && payload.new) {
          queryClient.setQueryData<ConversationWithLastMessage[]>(
            ['conversations', effectiveUserId],
            (old) => {
              if (!old) return old;
              
              // Actualizar la conversación modificada
              const updated = old.map(conv => 
                conv.id === payload.new.id ? { ...conv, ...payload.new } : conv
              );
              
              // Reordenar por last_message_time (más reciente primero)
              return updated.sort((a, b) => {
                const aTime = a.last_message_time || a.updated_at || '';
                const bTime = b.last_message_time || b.updated_at || '';
                return new Date(bTime).getTime() - new Date(aTime).getTime();
              });
            }
          );
        } else {
          // Para INSERT o DELETE, invalidar para refetch completo
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
        
        queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
      }
    );

    // Suscribirse a nuevos mensajes para reordenar conversaciones
    const messagesChannel = supabase
      .channel(`messages-global-${effectiveUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('New message received globally:', payload);
          // Cuando llega un mensaje nuevo, invalidar para reordenar
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
        }
      )
      .subscribe();

    return () => {
      conversationsSubscription.unsubscribe();
      supabase.removeChannel(messagesChannel);
    };
  }, [effectiveUserId, queryClient]);

  return {
    conversations: conversationsQuery.data || [],
    isLoading: conversationsQuery.isLoading,
    error: conversationsQuery.error,
    unreadCount: unreadCountQuery.data || 0,
    markAsRead: markAsReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    refetch: conversationsQuery.refetch,
  };
};

/**
 * Hook para buscar conversaciones
 */
export const useSearchConversations = (searchTerm: string) => {
  const { effectiveUserId } = useEffectiveUserId();

  return useQuery({
    queryKey: ['searchConversations', effectiveUserId, searchTerm],
    queryFn: () => ConversationService.searchConversations(effectiveUserId || '', searchTerm),
    enabled: !!effectiveUserId && searchTerm.length > 0,
    staleTime: 10000,
  });
};

/**
 * Hook para gestionar mensajes de una conversación específica
 */
export const useMessages = (conversationId: string | null) => {
  const { toast } = useToast();
  const { effectiveUserId } = useEffectiveUserId();
  const queryClient = useQueryClient();

  console.log('[useMessages] conversationId:', conversationId, 'effectiveUserId:', effectiveUserId);

  // Query para obtener mensajes - optimizado
  const messagesQuery = useQuery({
    queryKey: ['messages', conversationId, effectiveUserId],
    queryFn: () => ConversationService.getMessages(conversationId || '', effectiveUserId || ''),
    enabled: !!conversationId && !!effectiveUserId,
    staleTime: 30000, // 30 segundos - el realtime maneja nuevos mensajes
    refetchInterval: false, // Desactivar polling - realtime es suficiente
  });

  // Mutation para enviar mensaje a través de WAHA o Telegram
  const sendMessageMutation = useMutation({
    mutationFn: ({ 
      conversationId, 
      userId, 
      message, 
      sessionName, 
      phoneNumber,
      channelType,
      telegramBotId,
      twilioConnectionId
    }: {
      conversationId: string;
      userId: string;
      message: string;
      sessionName: string;
      phoneNumber: string;
      channelType?: string;
      telegramBotId?: string | null;
      twilioConnectionId?: string | null;
    }) => ConversationService.sendMessage(
      conversationId, 
      userId, 
      message, 
      sessionName, 
      phoneNumber,
      channelType,
      telegramBotId,
      twilioConnectionId
    ),
    // Optimistic update - mostrar mensaje inmediatamente
    onMutate: async (variables) => {
      // Cancelar queries en curso
      await queryClient.cancelQueries({ queryKey: ['messages', conversationId] });
      
      // Snapshot del estado anterior
      const previousMessages = queryClient.getQueryData<Message[]>(['messages', conversationId, effectiveUserId]);
      
      // Crear mensaje temporal optimista
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: variables.conversationId,
        user_id: variables.userId,
        content: variables.message,
        message: variables.message,
        direction: 'outbound',
        message_type: 'text',
        is_bot: false,
        status: 'sending',
        created_at: new Date().toISOString(),
        attachment_url: null,
        file_url: null,
        metadata: null,
        responded_by: null
      };
      
      // Agregar mensaje optimista a la cache
      queryClient.setQueryData<Message[]>(
        ['messages', conversationId, effectiveUserId],
        (old = []) => [...old, tempMessage]
      );
      
      console.log('[Optimistic] Added temp message:', tempMessage.id);
      
      return { previousMessages };
    },
    onSuccess: (savedMessage) => {
      console.log('[Message] Sent successfully, refreshing...');
      // Invalidar mensajes para obtener el mensaje real del servidor
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error, variables, context) => {
      console.error('Error sending message:', error);
      // Revertir al estado anterior en caso de error
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', conversationId, effectiveUserId], context.previousMessages);
      }
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje',
        variant: 'destructive',
      });
    },
  });

  // Mutation para enviar mensaje con adjunto
  const sendMessageWithAttachmentMutation = useMutation({
    mutationFn: ({ 
      conversationId, 
      userId, 
      message, 
      sessionName, 
      phoneNumber,
      fileUrl,
      fileName,
      mimeType,
      channelType,
      telegramBotId,
      twilioConnectionId
    }: {
      conversationId: string;
      userId: string;
      message: string;
      sessionName: string;
      phoneNumber: string;
      fileUrl: string;
      fileName: string;
      mimeType: string;
      channelType?: string;
      telegramBotId?: string | null;
      twilioConnectionId?: string | null;
    }) => ConversationService.sendMessageWithAttachment(
      conversationId, 
      userId, 
      message, 
      sessionName, 
      phoneNumber,
      fileUrl,
      fileName,
      mimeType,
      channelType,
      telegramBotId,
      twilioConnectionId
    ),
    onSuccess: () => {
      toast({
        title: 'Mensaje enviado',
        description: 'El archivo se envió correctamente',
      });
      // Invalidar mensajes para refrescar
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
    onError: (error) => {
      console.error('Error sending message with attachment:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar el archivo',
        variant: 'destructive',
      });
    },
  });

  // Suscripción a cambios en tiempo real de mensajes
  useEffect(() => {
    if (!conversationId) return;

    const subscription = ConversationService.subscribeToMessages(
      conversationId,
      (payload) => {
        console.log('Message change:', payload);
        
        if (payload.eventType === 'INSERT') {
          // Agregar nuevo mensaje a la cache
          queryClient.setQueryData(
            ['messages', conversationId],
            (oldMessages: Message[] = []) => {
              // Evitar duplicados
              const exists = oldMessages.some(msg => msg.id === payload.new.id);
              if (exists) return oldMessages;
              return [...oldMessages, payload.new];
            }
          );
        }
        
        // Invalidar conversaciones para actualizar último mensaje
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId, queryClient]);

  return {
    messages: messagesQuery.data || [],
    isLoading: messagesQuery.isLoading,
    error: messagesQuery.error,
    sendMessage: sendMessageMutation.mutate,
    sendMessageWithAttachment: sendMessageWithAttachmentMutation.mutate,
    isSending: sendMessageMutation.isPending || sendMessageWithAttachmentMutation.isPending,
    refetch: messagesQuery.refetch,
  };
};

export const useConversation = (conversationId: string | null) => {
  return useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => ConversationService.getConversationById(conversationId || ''),
    enabled: !!conversationId,
    staleTime: 60000,
  });
};