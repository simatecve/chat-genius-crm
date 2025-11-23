import { authGet, authPost, authPatch, authDelete, ApiResponse } from '@/utils/apiClient';
import { PlantillaMensajeData, PlantillaMensajeResponse } from '../app/api/plantilla_mensajes/domain/plantilla_mensaje';

// Configuración de la API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Endpoints de la API
const apiEndpoints = {
  plantillaMensajes: `${API_BASE_URL}/api/plantilla_mensajes`,
  plantillaMensajesById: (id: string) => `${API_BASE_URL}/api/plantilla_mensajes/${id}`,
};

class PlantillaMensajeServices {
  /**
   * Crea una nueva plantilla de mensaje
   */
  async createPlantillaMensaje(plantillaData: PlantillaMensajeData): Promise<ApiResponse<PlantillaMensajeResponse>> {
    return authPost<PlantillaMensajeResponse>(apiEndpoints.plantillaMensajes, plantillaData);
  }

  /**
   * Obtiene todas las plantillas de mensajes
   */
  async getAllPlantillaMensajes(): Promise<ApiResponse<PlantillaMensajeResponse[]>> {
    return authGet<PlantillaMensajeResponse[]>(apiEndpoints.plantillaMensajes);
  }

  /**
   * Obtiene una plantilla de mensaje por ID
   */
  async getPlantillaMensajeById(id: string): Promise<ApiResponse<PlantillaMensajeResponse>> {
    return authGet<PlantillaMensajeResponse>(apiEndpoints.plantillaMensajesById(id));
  }

  /**
   * Actualiza una plantilla de mensaje existente
   */
  async updatePlantillaMensaje(id: string, plantillaData: Partial<PlantillaMensajeData>): Promise<ApiResponse<PlantillaMensajeResponse>> {
    return authPatch<PlantillaMensajeResponse>(apiEndpoints.plantillaMensajesById(id), plantillaData);
  }

  /**
   * Elimina una plantilla de mensaje
   */
  async deletePlantillaMensaje(id: string): Promise<ApiResponse> {
    return authDelete(apiEndpoints.plantillaMensajesById(id));
  }

  /**
   * Obtiene plantillas de mensajes por canal específico
   */
  async getPlantillaMensajesByCanal(canal: string): Promise<ApiResponse<PlantillaMensajeResponse[]>> {
    try {
      const response = await this.getAllPlantillaMensajes();
      
      if (response.success && Array.isArray(response.data)) {
        const plantillasFiltradas = response.data.filter(plantilla => plantilla.canal === canal);
        
        return {
          success: true,
          data: plantillasFiltradas
        };
      }
      
      return {
        success: false,
        error: 'Error al obtener las plantillas de mensajes por canal'
      };

    } catch (error) {
      console.error('Error filtering plantillas by canal:', error);
      
      return {
        success: false,
        error: 'Error de conexión al filtrar plantillas por canal',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtiene plantillas de mensajes por organización
   */
  async getPlantillaMensajesByOrganizacion(organizacionId: string): Promise<ApiResponse<PlantillaMensajeResponse[]>> {
    try {
      const response = await this.getAllPlantillaMensajes();
      
      if (response.success && Array.isArray(response.data)) {
        const plantillasFiltradas = response.data.filter(plantilla => plantilla.organizacion_id === organizacionId);
        
        return {
          success: true,
          data: plantillasFiltradas
        };
      }
      
      return {
        success: false,
        error: 'Error al obtener las plantillas de mensajes por organización'
      };

    } catch (error) {
      console.error('Error filtering plantillas by organization:', error);
      
      return {
        success: false,
        error: 'Error de conexión al filtrar plantillas por organización',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Busca plantillas de mensajes por nombre
   */
  async searchPlantillaMensajesByName(nombre: string): Promise<ApiResponse<PlantillaMensajeResponse[]>> {
    try {
      const response = await this.getAllPlantillaMensajes();
      
      if (response.success && Array.isArray(response.data)) {
        const plantillasFiltradas = response.data.filter(plantilla => 
          plantilla.nombre.toLowerCase().includes(nombre.toLowerCase())
        );
        
        return {
          success: true,
          data: plantillasFiltradas
        };
      }
      
      return {
        success: false,
        error: 'Error al buscar plantillas de mensajes por nombre'
      };

    } catch (error) {
      console.error('Error searching plantillas by name:', error);
      
      return {
        success: false,
        error: 'Error de conexión al buscar plantillas por nombre',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtiene el conteo de plantillas de mensajes
   */
  async getPlantillaMensajesCount(): Promise<ApiResponse<number>> {
    try {
      const response = await this.getAllPlantillaMensajes();
      
      if (response.success && Array.isArray(response.data)) {
        return {
          success: true,
          data: response.data.length
        };
      }
      
      return {
        success: false,
        error: 'Error al obtener el conteo de plantillas de mensajes'
      };

    } catch (error) {
      console.error('Error counting plantilla mensajes:', error);
      
      return {
        success: false,
        error: 'Error de conexión al contar plantillas de mensajes',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtiene el conteo de plantillas por canal
   */
  async getPlantillaMensajesCountByCanal(canal: string): Promise<ApiResponse<number>> {
    try {
      const response = await this.getPlantillaMensajesByCanal(canal);
      
      if (response.success && Array.isArray(response.data)) {
        return {
          success: true,
          data: response.data.length
        };
      }
      
      return {
        success: false,
        error: 'Error al obtener el conteo de plantillas por canal'
      };

    } catch (error) {
      console.error('Error counting plantillas by canal:', error);
      
      return {
        success: false,
        error: 'Error de conexión al contar plantillas por canal',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}

// Exportar una instancia singleton del servicio
export const plantillaMensajeServices = new PlantillaMensajeServices();

// Exportar también la clase para casos especiales
export default PlantillaMensajeServices;
