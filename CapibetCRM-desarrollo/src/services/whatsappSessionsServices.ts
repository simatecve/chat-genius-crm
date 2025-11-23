import { authGet, authPost, authPatch, authDelete, ApiResponse } from '@/utils/apiClient';
import { 
  WhatsAppSessionData, 
  WhatsAppSessionResponse,
  CreateWhatsAppSessionData
} from '../app/api/whatsapp_sessions/domain/whatsapp_session';

// Configuración de la API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Endpoints de la API
const apiEndpoints = {
  whatsappSessions: `${API_BASE_URL}/api/whatsapp_sessions`,
  whatsappSessionsById: (id: number) => `${API_BASE_URL}/api/whatsapp_sessions/${id}`,
  newSessionConnected: `${API_BASE_URL}/api/whatsapp_sessions/new-session-connected`,
  disconnectSession: (id: number) => `${API_BASE_URL}/api/whatsapp_sessions/${id}/disconnect`,
};

class WhatsAppSessionsServices {
  /**
   * Obtiene todas las sesiones de WhatsApp
   */
  async getAllWhatsAppSessions(): Promise<ApiResponse<WhatsAppSessionResponse[]>> {
    const result = await authGet<WhatsAppSessionResponse[]>(apiEndpoints.whatsappSessions);
    
    if (!result.success && !result.data) {
      return { ...result, data: [] };
    }
    
    return result;
  }

  /**
   * Crea una nueva sesión de WhatsApp en estado pending
   */
  async createWhatsAppSession(sessionData: CreateWhatsAppSessionData): Promise<ApiResponse<WhatsAppSessionResponse>> {
    return authPost<WhatsAppSessionResponse>(apiEndpoints.whatsappSessions, sessionData);
  }

  /**
   * Obtiene una sesión de WhatsApp por ID
   */
  async getWhatsAppSessionById(id: number): Promise<ApiResponse<WhatsAppSessionResponse>> {
    return authGet<WhatsAppSessionResponse>(apiEndpoints.whatsappSessionsById(id));
  }

  /**
   * Obtiene sesiones de WhatsApp por sesion_id
   */
  async getWhatsAppSessionsBySesionId(sesionId: number): Promise<ApiResponse<WhatsAppSessionResponse[]>> {
    const result = await authGet<WhatsAppSessionResponse[]>(`${apiEndpoints.whatsappSessions}?sesion_id=eq.${sesionId}`);
    
    if (!result.success && !result.data) {
      return { ...result, data: [] };
    }
    
    return result;
  }

  /**
   * Obtiene sesiones de WhatsApp por session_id del orquestador
   */
  async getWhatsAppSessionBySessionId(sessionId: string): Promise<ApiResponse<WhatsAppSessionResponse>> {
    const result = await authGet<WhatsAppSessionResponse[]>(`${apiEndpoints.whatsappSessions}?session_id=eq.${sessionId}`);
    
    if (result.success && result.data && result.data.length > 0) {
      return {
        success: true,
        data: result.data[0]
      };
    }

    return {
      success: false,
      error: 'Sesión de WhatsApp no encontrada'
    };
  }

  /**
   * Actualiza una sesión de WhatsApp
   */
  async updateWhatsAppSession(id: number, data: Partial<WhatsAppSessionData>): Promise<ApiResponse<WhatsAppSessionResponse>> {
    return authPatch<WhatsAppSessionResponse>(apiEndpoints.whatsappSessionsById(id), data);
  }

  /**
   * Elimina una sesión de WhatsApp
   */
  async deleteWhatsAppSession(id: number): Promise<ApiResponse<void>> {
    return authDelete<void>(apiEndpoints.whatsappSessionsById(id));
  }

  /**
   * Actualiza el estado de una sesión de WhatsApp
   */
  async updateStatus(id: number, status: 'connected' | 'disconnected' | 'expired' | 'pending'): Promise<ApiResponse<WhatsAppSessionResponse>> {
    return authPatch<WhatsAppSessionResponse>(apiEndpoints.whatsappSessionsById(id), { 
      status,
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Obtiene el conteo de sesiones de WhatsApp activas
   */
  async getActiveSessions(): Promise<ApiResponse<WhatsAppSessionResponse[]>> {
    const result = await authGet<WhatsAppSessionResponse[]>(`${apiEndpoints.whatsappSessions}?status=eq.connected`);
    
    if (!result.success && !result.data) {
      return { ...result, data: [] };
    }
    
    return result;
  }

  /**
   * Obtiene sesiones de WhatsApp por estado
   */
  async getSessionsByStatus(status: 'connected' | 'disconnected' | 'expired' | 'pending'): Promise<ApiResponse<WhatsAppSessionResponse[]>> {
    const result = await authGet<WhatsAppSessionResponse[]>(`${apiEndpoints.whatsappSessions}?status=eq.${status}`);
    
    if (!result.success && !result.data) {
      return { ...result, data: [] };
    }
    
    return result;
  }

  /**
   * Desconecta una sesión de WhatsApp QR
   */
  async disconnectSession(id: number): Promise<ApiResponse<{
    session_id: string;
    orchestrator_disconnect: {
      success: boolean;
      message: string;
    };
    updated_session?: WhatsAppSessionResponse;
  }>> {
    return authPost<{
      session_id: string;
      orchestrator_disconnect: {
        success: boolean;
        message: string;
      };
      updated_session?: WhatsAppSessionResponse;
    }>(apiEndpoints.disconnectSession(id), {});
  }
}

// Exportar una instancia singleton del servicio
export const whatsappSessionsServices = new WhatsAppSessionsServices();

// Exportar también la clase para casos especiales
export default WhatsAppSessionsServices;
