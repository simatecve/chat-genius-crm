import { authGet, authPost, authPatch, authDelete, ApiResponse } from '@/utils/apiClient';
import { EspacioTrabajoData, EspacioTrabajoResponse } from '../app/api/espacio_trabajos/domain/espacio_trabajo';

// Configuración de la API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Endpoints de la API
const apiEndpoints = {
  espaciosTrabajo: `${API_BASE_URL}/api/espacio_trabajos`,
  espaciosTrabajoById: (id: string) => `${API_BASE_URL}/api/espacio_trabajos/${id}`
};

class EspacioTrabajoServices {
  /**
   * Crea un nuevo espacio de trabajo
   */
  async createEspacioTrabajo(espacioData: EspacioTrabajoData): Promise<ApiResponse<EspacioTrabajoResponse>> {
    return authPost<EspacioTrabajoResponse>(apiEndpoints.espaciosTrabajo, espacioData);
  }

  /**
   * Obtiene todos los espacios de trabajo
   */
  async getAllEspaciosTrabajo(): Promise<ApiResponse<EspacioTrabajoResponse[]>> {
    return authGet<EspacioTrabajoResponse[]>(apiEndpoints.espaciosTrabajo);
  }

  /**
   * Obtiene un espacio de trabajo por ID
   */
  async getEspacioTrabajoById(id: string): Promise<ApiResponse<EspacioTrabajoResponse>> {
    return authGet<EspacioTrabajoResponse>(apiEndpoints.espaciosTrabajoById(id));
  }

  /**
   * Actualiza un espacio de trabajo existente
   */
  async updateEspacioTrabajo(id: string, espacioData: Partial<EspacioTrabajoData>): Promise<ApiResponse<EspacioTrabajoResponse>> {
    return authPatch<EspacioTrabajoResponse>(apiEndpoints.espaciosTrabajoById(id), espacioData);
  }

  /**
   * Elimina un espacio de trabajo
   */
  async deleteEspacioTrabajo(id: string): Promise<ApiResponse> {
    return authDelete(apiEndpoints.espaciosTrabajoById(id));
  }

  /**
   * Actualiza el orden de múltiples espacios de trabajo
   */
  async updateEspaciosTrabajoOrder(espaciosData: Array<{ id: string; orden: number }>): Promise<ApiResponse> {
    return authPatch(`${API_BASE_URL}/api/espacio_trabajos/update-order`, espaciosData);
  }

  /**
   * Obtiene el conteo de espacios de trabajo (método auxiliar que puede ser útil)
   */
  async getEspaciosTrabajoCount(): Promise<ApiResponse<number>> {
    try {
      const response = await this.getAllEspaciosTrabajo();
      
      if (response.success && Array.isArray(response.data)) {
        return {
          success: true,
          data: response.data.length
        };
      }
      
      return {
        success: false,
        error: 'Error al obtener el conteo de espacios de trabajo'
      };

    } catch (error) {
      console.error('Error counting espacios de trabajo:', error);
      
      return {
        success: false,
        error: 'Error de conexión al contar espacios de trabajo',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}

// Exportar una instancia singleton del servicio
export const espacioTrabajoServices = new EspacioTrabajoServices();

// Exportar también la clase para casos especiales
export default EspacioTrabajoServices;

// Re-exportar los tipos para facilitar el uso
export type { EspacioTrabajoData, EspacioTrabajoResponse } from '../app/api/espacio_trabajos/domain/espacio_trabajo';
