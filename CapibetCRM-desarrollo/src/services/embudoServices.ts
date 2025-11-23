import { authGet, authPost, authPatch, authDelete, ApiResponse } from '@/utils/apiClient';
import { EmbudoData, EmbudoResponse as EmbudoResponseType, UpdateOrderRequest } from '../app/api/embudos/domain/embudo';
import { EspacioTrabajoResponse } from './espacioTrabajoServices';

// Re-exportar tipos para facilitar su uso
export type EmbudoResponse = EmbudoResponseType;
export type { EmbudoData, UpdateOrderRequest };

// Tipo para espacios de trabajo con sus embudos
export interface EspacioConEmbudos extends EspacioTrabajoResponse {
  embudos: EmbudoResponse[];
}

// Configuración de la API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Endpoints de la API
const apiEndpoints = {
  embudos: `${API_BASE_URL}/api/embudos`,
  embudosById: (id: string) => `${API_BASE_URL}/api/embudos/${id}`,
  embudosUpdateOrder: `${API_BASE_URL}/api/embudos/update-order`
};

class EmbudoServices {
  /**
   * Crea un nuevo embudo
   */
  async createEmbudo(embudoData: EmbudoData): Promise<ApiResponse<EmbudoResponse>> {
    return authPost<EmbudoResponse>(apiEndpoints.embudos, embudoData);
  }

  /**
   * Obtiene todos los embudos
   */
  async getAllEmbudos(): Promise<ApiResponse<EmbudoResponse[]>> {
    return authGet<EmbudoResponse[]>(apiEndpoints.embudos);
  }

  /**
   * Obtiene embudos por espacio de trabajo
   */
  async getEmbudosByEspacio(espacioId: string): Promise<ApiResponse<EmbudoResponse[]>> {
    return authGet<EmbudoResponse[]>(`${apiEndpoints.embudos}?espacio_id=${espacioId}`);
  }

  /**
   * Obtiene un embudo por ID
   */
  async getEmbudoById(id: string): Promise<ApiResponse<EmbudoResponse>> {
    return authGet<EmbudoResponse>(apiEndpoints.embudosById(id));
  }

  /**
   * Actualiza un embudo existente
   */
  async updateEmbudo(id: string, embudoData: Partial<EmbudoData>): Promise<ApiResponse<EmbudoResponse>> {
    return authPatch<EmbudoResponse>(apiEndpoints.embudosById(id), embudoData);
  }

  /**
   * Elimina un embudo
   */
  async deleteEmbudo(id: string): Promise<ApiResponse> {
    return authDelete(apiEndpoints.embudosById(id));
  }

  /**
   * Actualiza el orden de múltiples embudos
   */
  async updateEmbudosOrder(embudosConOrden: Array<{id: string, orden: number}>): Promise<ApiResponse> {
    const updateOrderRequest: UpdateOrderRequest = {
      embudos: embudosConOrden
    };
    return authPatch(apiEndpoints.embudosUpdateOrder, updateOrderRequest);
  }

  /**
   * Obtiene el conteo de embudos (método auxiliar que puede ser útil)
   */
  async getEmbudosCount(): Promise<ApiResponse<number>> {
    try {
      const response = await this.getAllEmbudos();
      
      if (response.success && Array.isArray(response.data)) {
        return {
          success: true,
          data: response.data.length
        };
      }
      
      return {
        success: false,
        error: 'Error al obtener el conteo de embudos'
      };

    } catch (error) {
      console.error('Error counting embudos:', error);
      
      return {
        success: false,
        error: 'Error de conexión al contar embudos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtiene el conteo de embudos por espacio (método auxiliar que puede ser útil)
   */
  async getEmbudosCountByEspacio(espacioId: string): Promise<ApiResponse<number>> {
    try {
      const response = await this.getEmbudosByEspacio(espacioId);
      
      if (response.success && Array.isArray(response.data)) {
        return {
          success: true,
          data: response.data.length
        };
      }
      
      return {
        success: false,
        error: 'Error al obtener el conteo de embudos del espacio'
      };

    } catch (error) {
      console.error('Error counting embudos by espacio:', error);
      
      return {
        success: false,
        error: 'Error de conexión al contar embudos del espacio',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}

// Exportar una instancia singleton del servicio
export const embudoServices = new EmbudoServices();

// Exportar también la clase para casos especiales
export default EmbudoServices;
