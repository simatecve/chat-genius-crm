import { authGet, authPost, authPatch, authDelete, ApiResponse } from '@/utils/apiClient';

// Tipos de datos para chats
export interface ChatData {
  sesion_id: string;
  contact_id: string;
  embudo_id: string;
  nuevos_mensajes?: boolean;
}

export interface ChatResponse {
  id: string;
  sesion_id: string;
  contact_id: string;
  embudo_id: string;
  created_at: string;
  nuevos_mensajes: boolean;
}

// Tipo específico para la respuesta de eliminación de chat
interface DeleteChatResponse {
  message: string;
  mensajesEliminados: number;
}

// Configuración de la API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Endpoints de la API
const apiEndpoints = {
  chats: `${API_BASE_URL}/api/chats`,
  chatsById: (id: string) => `${API_BASE_URL}/api/chats/${id}`
};

class ChatServices {
  /**
   * Obtiene todos los chats
   */
  async getAllChats(espacioId?: string): Promise<ApiResponse<ChatResponse[]>> {
    let url = apiEndpoints.chats;
    if (espacioId) {
      url += `?espacio_id=${espacioId}`;
    }
    
    return authGet<ChatResponse[]>(url);
  }

  /**
   * Crea un nuevo chat
   */
  async createChat(chatData: ChatData): Promise<ApiResponse<ChatResponse>> {
    return authPost<ChatResponse>(apiEndpoints.chats, chatData);
  }

  /**
   * Actualiza un chat existente
   */
  async updateChat(chatData: Partial<ChatData> & { id: string }): Promise<ApiResponse<ChatResponse>> {
    return authPatch<ChatResponse>(apiEndpoints.chats, chatData);
  }

  /**
   * Elimina un chat
   */
  async deleteChat(id: string): Promise<ApiResponse> {
    return authDelete(`${apiEndpoints.chats}?id=${id}`);
  }

  /**
   * Obtiene un chat específico por ID
   */
  async getChatById(id: string): Promise<ApiResponse<ChatResponse>> {
    return authGet<ChatResponse>(apiEndpoints.chatsById(id));
  }

  /**
   * Actualiza un chat específico por ID
   */
  async updateChatById(id: string, chatData: Partial<ChatData>): Promise<ApiResponse<ChatResponse>> {
    return authPatch<ChatResponse>(apiEndpoints.chatsById(id), chatData);
  }

  /**
   * Elimina un chat específico por ID (incluye eliminación en cascada de mensajes)
   */
  async deleteChatById(id: string): Promise<ApiResponse<DeleteChatResponse>> {
    return authDelete<DeleteChatResponse>(apiEndpoints.chatsById(id));
  }

  /**
   * Obtiene el conteo de chats
   */
  async getChatsCount(): Promise<ApiResponse<number>> {
    try {
      const response = await this.getAllChats();
      
      if (response.success && Array.isArray(response.data)) {
        return {
          success: true,
          data: response.data.length
        };
      }
      
      return {
        success: false,
        error: 'Error al obtener el conteo de chats'
      };

    } catch (error) {
      console.error('Error counting chats:', error);
      
      return {
        success: false,
        error: 'Error de conexión al contar chats',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtiene chats por sesión
   */
  async getChatsBySesion(sesionId: string): Promise<ApiResponse<ChatResponse[]>> {
    try {
      const response = await this.getAllChats();
      
      if (response.success && Array.isArray(response.data)) {
        const chatsBySesion = response.data.filter(chat => chat.sesion_id === sesionId);
        return {
          success: true,
          data: chatsBySesion
        };
      }
      
      return {
        success: false,
        error: 'Error al obtener chats por sesión'
      };

    } catch (error) {
      console.error('Error fetching chats by session:', error);
      
      return {
        success: false,
        error: 'Error de conexión al obtener chats por sesión',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtiene chats por embudo
   */
  async getChatsByEmbudo(embudoId: string, espacioId?: string): Promise<ApiResponse<ChatResponse[]>> {
    try {
      const response = await this.getAllChats(espacioId);
      
      if (response.success && Array.isArray(response.data)) {
        const chatsByEmbudo = response.data.filter(chat => chat.embudo_id === embudoId);
        return {
          success: true,
          data: chatsByEmbudo
        };
      }
      
      return {
        success: false,
        error: 'Error al obtener chats por embudo'
      };

    } catch (error) {
      console.error('Error fetching chats by embudo:', error);
      
      return {
        success: false,
        error: 'Error de conexión al obtener chats por embudo',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtiene chats por contacto
   */
  async getChatsByContact(contactId: string): Promise<ApiResponse<ChatResponse[]>> {
    try {
      const response = await this.getAllChats();
      
      if (response.success && Array.isArray(response.data)) {
        const chatsByContact = response.data.filter(chat => chat.contact_id === contactId);
        return {
          success: true,
          data: chatsByContact
        };
      }
      
      return {
        success: false,
        error: 'Error al obtener chats por contacto'
      };

    } catch (error) {
      console.error('Error fetching chats by contact:', error);
      
      return {
        success: false,
        error: 'Error de conexión al obtener chats por contacto',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Marca un chat como leído (nuevos_mensajes = false)
   */
  async marcarChatComoLeido(chatId: string): Promise<ApiResponse<ChatResponse>> {
    return authPatch<ChatResponse>(`${apiEndpoints.chats}/marcar-leido`, { chat_id: chatId });
  }
}

// Exportar una instancia singleton del servicio
export const chatServices = new ChatServices();

// Exportar también la clase para casos especiales
export default ChatServices;
