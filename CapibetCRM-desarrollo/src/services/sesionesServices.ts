import { authGet, authPost, authPatch, authDelete, ApiResponse } from '@/utils/apiClient';
import { SesionData, SesionResponse } from '../app/api/sesiones/domain/sesion';

// Configuración de la API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Endpoints de la API
const apiEndpoints = {
  sesiones: `${API_BASE_URL}/api/sesiones`,
  sesionesById: (id: string) => `${API_BASE_URL}/api/sesiones/${id}`,
  whatsappSessions: `${API_BASE_URL}/api/whatsapp_sessions`,
};

class SesionesServices {
  /**
   * Obtiene todas las sesiones del usuario logueado
   */
  async getAllSesiones(): Promise<ApiResponse<SesionResponse[]>> {
    return authGet<SesionResponse[]>(apiEndpoints.sesiones);
  }

  /**
   * Crea una nueva sesión
   */
  async createSesion(sesionData: SesionData): Promise<ApiResponse<SesionResponse>> {
    return authPost<SesionResponse>(apiEndpoints.sesiones, sesionData);
  }

  /**
   * Obtiene las sesiones de un embudo específico
   */
  async getSesionesByEmbudo(embudoId: string): Promise<ApiResponse<SesionResponse[]>> {
    return authGet<SesionResponse[]>(`${apiEndpoints.sesiones}?embudo_id=eq.${embudoId}`);
  }

  /**
   * Obtiene las sesiones por tipo
   */
  async getSesionesByType(type: string): Promise<ApiResponse<SesionResponse[]>> {
    return authGet<SesionResponse[]>(`${apiEndpoints.sesiones}?type=eq.${type}`);
  }

  /**
   * Obtiene una sesión por ID
   */
  async getSesionById(id: string): Promise<ApiResponse<SesionResponse>> {
    return authGet<SesionResponse>(apiEndpoints.sesionesById(id));
  }

  /**
   * Actualiza una sesión existente
   */
  async updateSesion(id: string, data: Partial<SesionData>): Promise<ApiResponse<SesionResponse>> {
    return authPatch<SesionResponse>(apiEndpoints.sesionesById(id), data);
  }

  /**
   * Elimina una sesión
   */
  async deleteSesion(id: string): Promise<ApiResponse<void>> {
    return authDelete<void>(apiEndpoints.sesionesById(id));
  }

  /**
   * Obtiene el conteo de sesiones del usuario logueado
   */
  async getSesionesCount(): Promise<ApiResponse<number>> {
    try {
      const response = await this.getAllSesiones();
      
      if (response.success && Array.isArray(response.data)) {
        return {
          success: true,
          data: response.data.length
        };
      }
      
      return {
        success: false,
        error: 'Error al obtener el conteo de sesiones'
      };

    } catch (error) {
      console.error('Error counting sesiones:', error);
      
      return {
        success: false,
        error: 'Error de conexión al contar sesiones',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtiene sesiones de Gmail por email
   */
  async getSesionesGmailByEmail(email: string): Promise<ApiResponse<SesionResponse[]>> {
    return authGet<SesionResponse[]>(`${apiEndpoints.sesiones}?type=eq.gmail&email=eq.${email}`);
  }

  /**
   * Obtiene sesiones de WhatsApp por session UUID
   * Primero busca en whatsapp_sessions por session_id, luego busca en sesiones por el id de whatsapp_session
   */
  async getSesionesWhatsAppBySession(whatsappSession: string): Promise<ApiResponse<SesionResponse[]>> {
    try {
      // Primero buscar la whatsapp_session por session_id para obtener su ID
      const whatsappData = await authGet<{ id: string; session_id: string }[]>(
        `${apiEndpoints.whatsappSessions}?session_id=eq.${whatsappSession}`
      );
      
      if (!whatsappData.success || !whatsappData.data || whatsappData.data.length === 0) {
        return {
          success: false,
          error: 'Sesión de WhatsApp no encontrada',
          data: []
        };
      }

      const whatsappSessionId = whatsappData.data[0].id;
      
      // Ahora buscar en sesiones usando el ID de la whatsapp_session
      return authGet<SesionResponse[]>(`${apiEndpoints.sesiones}?whatsapp_session=eq.${whatsappSessionId}`);

    } catch (error) {
      console.error('Error fetching WhatsApp sesiones by session:', error);
      
      return {
        success: false,
        error: 'Error de conexión al obtener sesiones de WhatsApp',
        details: error instanceof Error ? error.message : 'Error desconocido',
        data: []
      };
    }
  }

  /**
   * Actualiza el estado de una sesión
   */
  async updateSesionEstado(id: string, estado: string): Promise<ApiResponse<SesionResponse>> {
    return authPatch<SesionResponse>(apiEndpoints.sesionesById(id), { estado });
  }

  /**
   * Actualiza la sesión de WhatsApp
   */
  async updateWhatsAppSession(id: string, whatsappSession: string): Promise<ApiResponse<SesionResponse>> {
    return authPatch<SesionResponse>(apiEndpoints.sesionesById(id), { 
      whatsapp_session: whatsappSession
    });
  }

  /**
   * Actualiza información de perfil (email, nombre, picture)
   */
  async updateProfileInfo(id: string, email?: string, givenName?: string, picture?: string): Promise<ApiResponse<SesionResponse>> {
    const updateData: any = {};
    if (email !== undefined) updateData.email = email;
    if (givenName !== undefined) updateData.given_name = givenName;
    if (picture !== undefined) updateData.picture = picture;

    return authPatch<SesionResponse>(apiEndpoints.sesionesById(id), updateData);
  }
}

// Exportar una instancia singleton del servicio
export const sesionesServices = new SesionesServices();

// Exportar también la clase para casos especiales
export default SesionesServices;
