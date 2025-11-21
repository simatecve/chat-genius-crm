import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];
type ConversationInsert = Database['public']['Tables']['conversations']['Insert'];
type MessageInsert = Database['public']['Tables']['messages']['Insert'];

export interface ConversationWithLastMessage extends Conversation {
  messages?: Message[];
}

export class ConversationService {
  /**
   * Obtiene todas las conversaciones del usuario actual
   */
  static async getConversations(userId: string): Promise<ConversationWithLastMessage[]> {
    try {
      // Primero obtenemos las instancias de WhatsApp del usuario
      const { data: userInstances, error: instancesError } = await supabase
        .from('whatsapp_connections')
        .select('name')
        .eq('user_id', userId);

      if (instancesError) {
        console.error('Error fetching user instances:', instancesError);
        throw instancesError;
      }
      
      // Si el usuario no tiene instancias, retornamos array vacío
      if (!userInstances || userInstances.length === 0) {
        return [];
      }

      // Extraemos los nombres de las instancias
      const instanceNames = userInstances.map(instance => instance.name);

      // Filtramos conversaciones por las instancias del usuario
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          messages!inner(
            id,
            message,
            created_at,
            direction,
            message_type,
            is_bot,
            attachment_url,
            conversation_id,
            file_url,
            instance_name,
            pushname,
            updated_at,
            user_id,
            whatsapp_number
          )
        `)
        .in('instance_name', instanceNames)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getConversations:', error);
      throw error;
    }
  }

  /**
   * Obtiene una conversación específica por ID
   */
  static async getConversationById(conversationId: string): Promise<Conversation | null> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (error) {
        console.error('Error fetching conversation:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getConversationById:', error);
      throw error;
    }
  }

  /**
   * Busca conversaciones por nombre o número de teléfono
   */
  static async searchConversations(userId: string, searchTerm: string): Promise<ConversationWithLastMessage[]> {
    try {
      // Primero obtenemos las instancias de WhatsApp del usuario
      const { data: userInstances, error: instancesError } = await supabase
        .from('whatsapp_connections')
        .select('name')
        .eq('user_id', userId);

      if (instancesError) {
        console.error('Error fetching user instances:', instancesError);
        throw instancesError;
      }
      
      // Si el usuario no tiene instancias, retornamos array vacío
      if (!userInstances || userInstances.length === 0) {
        return [];
      }

      // Extraemos los nombres de las instancias
      const instanceNames = userInstances.map(instance => instance.name);

      // Filtramos conversaciones por las instancias del usuario y la búsqueda
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          messages!inner(
            id,
            message,
            created_at,
            direction,
            message_type,
            is_bot,
            attachment_url,
            conversation_id,
            file_url,
            instance_name,
            pushname,
            updated_at,
            user_id,
            whatsapp_number
          )
        `)
        .in('instance_name', instanceNames)
        .or(`pushname.ilike.%${searchTerm}%,whatsapp_number.ilike.%${searchTerm}%`)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Error searching conversations:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchConversations:', error);
      throw error;
    }
  }

  /**
   * Obtiene los mensajes de una conversación específica
   */
  static async getMessages(conversationId: string, userId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    try {
      // Primero obtenemos las instancias de WhatsApp del usuario
      const { data: userInstances, error: instancesError } = await supabase
        .from('whatsapp_connections')
        .select('name')
        .eq('user_id', userId);

      if (instancesError) {
        console.error('Error fetching user instances:', instancesError);
        throw instancesError;
      }
      
      // Si el usuario no tiene instancias, retornamos array vacío
      if (!userInstances || userInstances.length === 0) {
        return [];
      }

      // Extraemos los nombres de las instancias
      const instanceNames = userInstances.map(instance => instance.name);

      // Filtramos mensajes por conversación y las instancias del usuario
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .in('instance_name', instanceNames)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }

      // Retornar en orden cronológico (más antiguos primero)
      return (data || []).reverse();
    } catch (error) {
      console.error('Error in getMessages:', error);
      throw error;
    }
  }

  /**
   * Envía un nuevo mensaje
   */
  static async sendMessage(messageData: MessageInsert): Promise<Message | null> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }

      // Actualizar la conversación con el último mensaje
      if (data && data.conversation_id) {
        await this.updateConversationLastMessage(
          data.conversation_id,
          data.message || '',
          data.created_at
        );
      }

      // Enviar al webhook de n8n
      if (data) {
        this.sendToWebhook(data);
      }

      return data;
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    }
  }

  /**
   * Envía un mensaje solo al webhook sin guardarlo en la base de datos
   */
  static async sendMessageToWebhookOnly(messageData: {
    user_id: string;
    conversation_id?: string;
    whatsapp_number: string;
    instance_name: string;
    pushname?: string;
    message?: string;
    message_type?: string;
    direction: string;
    attachment_url?: string;
    file_url?: string;
    is_bot?: boolean;
  }): Promise<void> {
    try {
      const webhookUrl = 'https://n8n.kanbanpro.com.ar/webhook/enviar-mensaje';
      
      // Generar ID único para el mensaje
      const messageId = crypto.randomUUID();
      const now = new Date().toISOString();
      
      const payload = {
        id: messageId,
        user_id: messageData.user_id,
        conversation_id: messageData.conversation_id,
        whatsapp_number: messageData.whatsapp_number,
        instance_name: messageData.instance_name,
        pushname: messageData.pushname,
        message: messageData.message,
        message_type: messageData.message_type || 'text',
        direction: messageData.direction,
        attachment_url: messageData.attachment_url,
        file_url: messageData.file_url,
        is_bot: messageData.is_bot || false,
        created_at: now,
        updated_at: now,
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook response error: ${response.status}`);
      }

      console.log('Message sent to webhook successfully');
    } catch (error) {
      console.error('Error sending to webhook:', error);
      throw error; // Lanzamos el error para que se maneje en el componente
    }
  }

  /**
   * Envía mensaje al webhook de n8n
   */
  private static async sendToWebhook(messageData: Message): Promise<void> {
    try {
      const webhookUrl = 'https://n8n.kanbanpro.com.ar/webhook/enviar-mensaje';
      
      const payload = {
        id: messageData.id,
        user_id: messageData.user_id,
        conversation_id: messageData.conversation_id,
        whatsapp_number: messageData.whatsapp_number,
        instance_name: messageData.instance_name,
        pushname: messageData.pushname,
        message: messageData.message,
        message_type: messageData.message_type,
        direction: messageData.direction,
        attachment_url: messageData.attachment_url,
        file_url: messageData.file_url,
        is_bot: messageData.is_bot,
        created_at: messageData.created_at,
        updated_at: messageData.updated_at,
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('Message sent to webhook successfully');
    } catch (error) {
      console.error('Error sending to webhook:', error);
      // No lanzamos el error para que no afecte el flujo principal
    }
  }

  /**
   * Actualiza el último mensaje de una conversación
   */
  static async updateConversationLastMessage(
    conversationId: string,
    lastMessage: string,
    lastMessageAt: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({
          last_message: lastMessage,
          last_message_at: lastMessageAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (error) {
        console.error('Error updating conversation:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in updateConversationLastMessage:', error);
      throw error;
    }
  }

  /**
   * Marca los mensajes de una conversación como leídos
   */
  static async markAsRead(conversationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({
          unread_count: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (error) {
        console.error('Error marking conversation as read:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in markAsRead:', error);
      throw error;
    }
  }

  /**
   * Obtiene el conteo de conversaciones no leídas
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('unread_count')
        .eq('user_id', userId)
        .gt('unread_count', 0);

      if (error) {
        console.error('Error getting unread count:', error);
        throw error;
      }

      return (data || []).reduce((total, conv) => total + (conv.unread_count || 0), 0);
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      throw error;
    }
  }

  /**
   * Suscribirse a cambios en tiempo real de conversaciones
   */
  static subscribeToConversations(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  }

  /**
   * Suscribirse a cambios en tiempo real de mensajes
   */
  static subscribeToMessages(conversationId: string, callback: (payload: any) => void) {
    return supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        callback
      )
      .subscribe();
  }
}