import { authGet, authPost, authPatch, authDelete, ApiResponse } from '@/utils/apiClient';
import { MensajeData, MensajeResponse } from '../app/api/mensajes/domain/mensaje';

// Tipos para filtros de mensajes
interface MensajeFilters {
  chat_id?: string;
  contacto_id?: string;
  remitente_id?: string;
  type?: string;
  limit?: number;
  offset?: number;
}

// Configuración de la API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Endpoints de la API
const apiEndpoints = {
  mensajes: `${API_BASE_URL}/api/mensajes`,
  mensajesById: (id: string) => `${API_BASE_URL}/api/mensajes/${id}`
};

class MensajesServices {
  /**
   * Crea un nuevo mensaje
   */
  async createMensaje(mensajeData: MensajeData): Promise<ApiResponse<MensajeResponse>> {
    console.log('Datos recibidos para crear mensaje:', mensajeData);
    
    const dataToSend = {
      remitente_id: mensajeData.remitente_id,
      contacto_id: mensajeData.contacto_id,
      chat_id: mensajeData.chat_id,
      type: mensajeData.type,
      content: mensajeData.content,
      creado_en: mensajeData.creado_en || new Date().toISOString()
    };

    const result = await authPost<MensajeResponse>(apiEndpoints.mensajes, dataToSend);
    
    if (result.success) {
      console.log('Mensaje creado exitosamente:', result);
    }
    
    return result;
  }

  /**
   * Obtiene todos los mensajes con filtros opcionales
   */
  async getAllMensajes(filters?: MensajeFilters): Promise<ApiResponse<MensajeResponse[]>> {
    // Construir query string para filtros
    let queryString = '';
    const filterParams = [];
    
    if (filters) {
      if (filters.chat_id) filterParams.push(`chat_id=${filters.chat_id}`);
      if (filters.contacto_id) filterParams.push(`contacto_id=${filters.contacto_id}`);
      if (filters.remitente_id) filterParams.push(`remitente_id=${filters.remitente_id}`);
      if (filters.type) filterParams.push(`type=${filters.type}`);
      if (filters.limit) filterParams.push(`limit=${filters.limit}`);
      if (filters.offset) filterParams.push(`offset=${filters.offset}`);
      
      if (filterParams.length > 0) {
        queryString = '?' + filterParams.join('&');
      }
    }

    const result = await authGet<MensajeResponse[]>(`${apiEndpoints.mensajes}${queryString}`);
    
    console.log('📋 Mensajes obtenidos del API:', result);
    
    return result;
  }

  /**
   * Obtiene solo el último mensaje de cada chat
   * Esta consulta es optimizada para la carga inicial de la lista de chats
   */
  async getLastMessagePerChat(): Promise<ApiResponse<MensajeResponse[]>> {
    const result = await authGet<MensajeResponse[]>(`${apiEndpoints.mensajes}?last_per_chat=true`);
    
    console.log('📋 Últimos mensajes por chat obtenidos del API:', result);
    
    return result;
  }

  /**
   * Obtiene un mensaje por ID
   */
  async getMensajeById(id: string): Promise<ApiResponse<MensajeResponse>> {
    return authGet<MensajeResponse>(apiEndpoints.mensajesById(id));
  }

  /**
   * Actualiza un mensaje existente
   */
  async updateMensaje(id: string, mensajeData: Partial<MensajeData>): Promise<ApiResponse<MensajeResponse>> {
    console.log('Actualizando mensaje:', id, mensajeData);

    const result = await authPatch<MensajeResponse>(apiEndpoints.mensajesById(id), mensajeData);

    if (result.success) {
      console.log('Mensaje actualizado exitosamente');
    }

    return result;
  }

  /**
   * Obtiene mensajes por chat
   */
  async getMensajesByChat(chatId: string, limit?: number, offset?: number): Promise<ApiResponse<MensajeResponse[]>> {
    return this.getAllMensajes({
      chat_id: chatId,
      limit,
      offset
    });
  }

  /**
   * Obtiene mensajes por contacto
   */
  async getMensajesByContacto(contactoId: string, limit?: number, offset?: number): Promise<ApiResponse<MensajeResponse[]>> {
    return this.getAllMensajes({
      contacto_id: contactoId,
      limit,
      offset
    });
  }

  /**
   * Obtiene mensajes por remitente
   */
  async getMensajesByRemitente(remitenteId: string, limit?: number, offset?: number): Promise<ApiResponse<MensajeResponse[]>> {
    return this.getAllMensajes({
      remitente_id: remitenteId,
      limit,
      offset
    });
  }

  /**
   * Obtiene mensajes por tipo
   */
  async getMensajesByType(type: string, limit?: number, offset?: number): Promise<ApiResponse<MensajeResponse[]>> {
    return this.getAllMensajes({
      type,
      limit,
      offset
    });
  }

  /**
   * Obtiene el historial de mensajes de un chat con paginación
   */
  async getHistorialChat(chatId: string, page: number = 1, pageSize: number = 50): Promise<ApiResponse<MensajeResponse[]>> {
    const offset = (page - 1) * pageSize;
    return this.getMensajesByChat(chatId, pageSize, offset);
  }

  /**
   * Elimina un mensaje por ID
   */
  async deleteMensaje(id: string): Promise<ApiResponse<void>> {
    console.log('Eliminando mensaje con ID:', id);

    const result = await authDelete<void>(apiEndpoints.mensajesById(id));

    if (result.success) {
      console.log('Mensaje eliminado exitosamente');
    }

    return result;
  }

  /**
   * Envía un mensaje de texto
   */
  async enviarMensajeTexto(
    remitenteId: string, 
    contactoId: string, 
    chatId: string, 
    texto: string,
    tipoSesion: 'whatsapp_qr' | 'whatsapp_api' | 'messenger' | 'instagram' | 'telegram' | 'telegram_bot' | 'gmail' | 'outlook'
  ): Promise<ApiResponse<MensajeResponse>> {
    const mensajeData: MensajeData = {
      remitente_id: remitenteId,
      contacto_id: contactoId,
      chat_id: chatId,
      type: tipoSesion,
      content: {
        text: texto,
        message_type: 'text'
      }
    };

    return this.createMensaje(mensajeData);
  }

  /**
   * Envía un mensaje con archivo multimedia
   */
  async enviarMensajeMultimedia(
    remitenteId: string,
    contactoId: string,
    chatId: string,
    tipoSesion: 'whatsapp_qr' | 'whatsapp_api' | 'messenger' | 'instagram' | 'telegram' | 'telegram_bot' | 'gmail' | 'outlook',
    messageType: 'image' | 'video' | 'audio' | 'document',
    mediaUrl: string,
    fileName?: string,
    fileSize?: number,
    mediaType?: string
  ): Promise<ApiResponse<MensajeResponse>> {
    const mensajeData: MensajeData = {
      remitente_id: remitenteId,
      contacto_id: contactoId,
      chat_id: chatId,
      type: tipoSesion,
      content: {
        message_type: messageType,
        media_url: mediaUrl,
        media_type: mediaType,
        file_name: fileName,
        file_size: fileSize
      }
    };

    return this.createMensaje(mensajeData);
  }

  /**
   * Envía un mensaje de ubicación
   */
  async enviarMensajeUbicacion(
    remitenteId: string,
    contactoId: string,
    chatId: string,
    tipoSesion: 'whatsapp_qr' | 'whatsapp_api' | 'messenger' | 'instagram' | 'telegram' | 'telegram_bot' | 'gmail' | 'outlook',
    latitude: number,
    longitude: number,
    address?: string
  ): Promise<ApiResponse<MensajeResponse>> {
    const mensajeData: MensajeData = {
      remitente_id: remitenteId,
      contacto_id: contactoId,
      chat_id: chatId,
      type: tipoSesion,
      content: {
        message_type: 'location',
        location: {
          latitude,
          longitude,
          address
        }
      }
    };

    return this.createMensaje(mensajeData);
  }

  /**
   * Envía un mensaje de contacto
   */
  async enviarMensajeContacto(
    remitenteId: string,
    contactoId: string,
    chatId: string,
    tipoSesion: 'whatsapp_qr' | 'whatsapp_api' | 'messenger' | 'instagram' | 'telegram' | 'telegram_bot' | 'gmail' | 'outlook',
    contactName: string,
    contactPhone?: string,
    contactEmail?: string
  ): Promise<ApiResponse<MensajeResponse>> {
    const mensajeData: MensajeData = {
      remitente_id: remitenteId,
      contacto_id: contactoId,
      chat_id: chatId,
      type: tipoSesion,
      content: {
        message_type: 'contact',
        contact: {
          name: contactName,
          phone: contactPhone,
          email: contactEmail
        }
      }
    };

    return this.createMensaje(mensajeData);
  }

  /**
   * Envía un mensaje de texto por WhatsApp QR
   */
  async enviarMensajeWhatsAppQR(
    remitenteId: string,
    contactoId: string,
    chatId: string,
    texto: string
  ): Promise<ApiResponse<MensajeResponse>> {
    return this.enviarMensajeTexto(remitenteId, contactoId, chatId, texto, 'whatsapp_qr');
  }

  /**
   * Envía un mensaje de texto por WhatsApp API
   */
  async enviarMensajeWhatsAppAPI(
    remitenteId: string,
    contactoId: string,
    chatId: string,
    texto: string
  ): Promise<ApiResponse<MensajeResponse>> {
    return this.enviarMensajeTexto(remitenteId, contactoId, chatId, texto, 'whatsapp_api');
  }

  /**
   * Envía un mensaje de texto por Messenger
   */
  async enviarMensajeMessenger(
    remitenteId: string,
    contactoId: string,
    chatId: string,
    texto: string
  ): Promise<ApiResponse<MensajeResponse>> {
    return this.enviarMensajeTexto(remitenteId, contactoId, chatId, texto, 'messenger');
  }

  /**
   * Envía un mensaje de texto por Instagram
   */
  async enviarMensajeInstagram(
    remitenteId: string,
    contactoId: string,
    chatId: string,
    texto: string
  ): Promise<ApiResponse<MensajeResponse>> {
    return this.enviarMensajeTexto(remitenteId, contactoId, chatId, texto, 'instagram');
  }

  /**
   * Envía un mensaje de texto por Telegram
   */
  async enviarMensajeTelegram(
    remitenteId: string,
    contactoId: string,
    chatId: string,
    texto: string
  ): Promise<ApiResponse<MensajeResponse>> {
    return this.enviarMensajeTexto(remitenteId, contactoId, chatId, texto, 'telegram');
  }

  /**
   * Envía un mensaje de texto por Telegram Bot
   */
  async enviarMensajeTelegramBot(
    remitenteId: string,
    contactoId: string,
    chatId: string,
    texto: string
  ): Promise<ApiResponse<MensajeResponse>> {
    return this.enviarMensajeTexto(remitenteId, contactoId, chatId, texto, 'telegram_bot');
  }

  /**
   * Envía un mensaje de texto por Gmail
   */
  async enviarMensajeGmail(
    remitenteId: string,
    contactoId: string,
    chatId: string,
    texto: string
  ): Promise<ApiResponse<MensajeResponse>> {
    return this.enviarMensajeTexto(remitenteId, contactoId, chatId, texto, 'gmail');
  }

  /**
   * Envía un mensaje de texto por Outlook
   */
  async enviarMensajeOutlook(
    remitenteId: string,
    contactoId: string,
    chatId: string,
    texto: string
  ): Promise<ApiResponse<MensajeResponse>> {
    return this.enviarMensajeTexto(remitenteId, contactoId, chatId, texto, 'outlook');
  }
}

// Exportar una instancia singleton del servicio
export const mensajesServices = new MensajesServices();

// Exportar también la clase para casos especiales
export default MensajesServices;
