import { authGet, authPost, authPatch, authDelete, ApiResponse } from '@/utils/apiClient';
import { EtiquetaData, EtiquetaResponse } from '../app/api/etiquetas/domain/etiqueta';

// Configuración de la API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Endpoints de la API
const apiEndpoints = {
  etiquetas: `${API_BASE_URL}/api/etiquetas`,
  etiquetasById: (id: string) => `${API_BASE_URL}/api/etiquetas/${id}`
};

class EtiquetasServices {
  /**
   * Obtiene todas las etiquetas del usuario logueado
   */
  async getAllEtiquetas(): Promise<ApiResponse<EtiquetaResponse[]>> {
    return authGet<EtiquetaResponse[]>(apiEndpoints.etiquetas);
  }

  /**
   * Crea una nueva etiqueta
   */
  async createEtiqueta(etiquetaData: EtiquetaData): Promise<ApiResponse<EtiquetaResponse>> {
    return authPost<EtiquetaResponse>(apiEndpoints.etiquetas, etiquetaData);
  }

  /**
   * Obtiene una etiqueta por ID
   */
  async getEtiquetaById(id: string): Promise<ApiResponse<EtiquetaResponse>> {
    return authGet<EtiquetaResponse>(apiEndpoints.etiquetasById(id));
  }

  /**
   * Actualiza una etiqueta existente
   */
  async updateEtiqueta(id: string, etiquetaData: Partial<EtiquetaData>): Promise<ApiResponse<EtiquetaResponse>> {
    return authPatch<EtiquetaResponse>(apiEndpoints.etiquetasById(id), etiquetaData);
  }

  /**
   * Elimina una etiqueta por ID
   */
  async deleteEtiqueta(id: string): Promise<ApiResponse<void>> {
    return authDelete<void>(apiEndpoints.etiquetasById(id));
  }

  /**
   * Obtiene el conteo de etiquetas (método auxiliar que puede ser útil)
   */
  async getEtiquetasCount(): Promise<ApiResponse<number>> {
    try {
      const response = await this.getAllEtiquetas();
      
      if (response.success && Array.isArray(response.data)) {
        return {
          success: true,
          data: response.data.length
        };
      }
      
      return {
        success: false,
        error: 'Error al obtener el conteo de etiquetas'
      };

    } catch (error) {
      console.error('Error counting etiquetas:', error);
      
      return {
        success: false,
        error: 'Error de conexión al contar etiquetas',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}

// Exportar una instancia singleton del servicio
export const etiquetasServices = new EtiquetasServices();

// Exportar también la clase para casos especiales
export default EtiquetasServices;
