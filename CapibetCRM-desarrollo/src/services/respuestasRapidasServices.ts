import { authGet, authPost, authPatch, authDelete, ApiResponse } from '@/utils/apiClient';

// Tipos para respuestas rápidas
export interface RespuestaRapida {
  id?: string;
  titulo: string;
  contenido: string;
  categoria: string;
  activa: boolean;
  created_at?: string;
  updated_at?: string;
  creado_por?: string;
  organizacion_id?: string;
}

export interface RespuestaRapidaFormData {
  titulo: string;
  contenido: string;
  categoria: string;
}

class RespuestasRapidasServices {
  /**
   * Obtiene todas las respuestas rápidas del usuario logueado
   */
  async getAllRespuestasRapidas(): Promise<ApiResponse<RespuestaRapida[]>> {
    try {
      return await authGet<RespuestaRapida[]>('/api/respuestas_rapidas');
    } catch (error) {
      console.error('Error al obtener respuestas rápidas:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Obtiene una respuesta rápida por ID (solo del usuario logueado)
   */
  async getRespuestaRapidaById(id: string): Promise<ApiResponse<RespuestaRapida>> {
    try {
      return await authGet<RespuestaRapida>(`/api/respuestas_rapidas/${id}`);
    } catch (error) {
      console.error('Error al obtener respuesta rápida:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Crea una nueva respuesta rápida
   */
  async createRespuestaRapida(data: RespuestaRapidaFormData): Promise<ApiResponse> {
    try {
      return await authPost('/api/respuestas_rapidas', data);
    } catch (error) {
      console.error('Error al crear respuesta rápida:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Actualiza una respuesta rápida existente (solo del usuario logueado)
   */
  async updateRespuestaRapida(id: string, data: Partial<RespuestaRapida>): Promise<ApiResponse> {
    try {
      return await authPatch(`/api/respuestas_rapidas/${id}`, data);
    } catch (error) {
      console.error('Error al actualizar respuesta rápida:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Elimina una respuesta rápida (solo del usuario logueado)
   */
  async deleteRespuestaRapida(id: string): Promise<ApiResponse> {
    try {
      return await authDelete(`/api/respuestas_rapidas/${id}`);
    } catch (error) {
      console.error('Error al eliminar respuesta rápida:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Cambia el estado activo/inactivo de una respuesta rápida (solo del usuario logueado)
   */
  async toggleRespuestaRapidaStatus(id: string, activa: boolean): Promise<ApiResponse> {
    try {
      return await authPatch(`/api/respuestas_rapidas/${id}/toggle-status`, { activa });
    } catch (error) {
      console.error('Error al cambiar estado de respuesta rápida:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error al cambiar estado de respuesta rápida'
      };
    }
  }

  /**
   * Obtiene el conteo de respuestas rápidas del usuario logueado
   */
  async getRespuestasRapidasCount(): Promise<ApiResponse<number>> {
    try {
      const response = await authGet<RespuestaRapida[]>('/api/respuestas_rapidas');
      
      if (response.success && response.data) {
        return {
          success: true,
          data: Array.isArray(response.data) ? response.data.length : 0
        };
      }
      
      return {
        success: false,
        error: response.error || 'Error al obtener el conteo de respuestas rápidas'
      };
    } catch (error) {
      console.error('Error counting respuestas rápidas:', error);
      return {
        success: false,
        error: 'Error de conexión al contar respuestas rápidas'
      };
    }
  }
}

// Exportar una instancia singleton del servicio
export const respuestasRapidasServices = new RespuestasRapidasServices();

// Exportar también la clase para casos especiales
export default RespuestasRapidasServices;