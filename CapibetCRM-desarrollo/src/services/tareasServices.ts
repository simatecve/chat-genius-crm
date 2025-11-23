import { authGet, authPost, authPatch, authDelete, ApiResponse } from '@/utils/apiClient';

// Tipos para las tareas
export interface TareaData {
  id?: number;
  titulo: string;
  descripion?: string; // Nota: en la API viene como "descripion" (sin c)
  fecha: string;
  hora?: string;
  asignada?: number; // ID del usuario asignado
  creado_por?: number;
  categoria: string;
  prioridad: string;
}

export interface TareaResponse {
  id: number;
  created_at?: string;
  titulo: string;
  descripion?: string;
  fecha: string;
  hora?: string;
  asignada?: number;
  creado_por?: number;
  categoria: string;
  prioridad: string;
}

class TareasServices {
  /**
   * Obtiene todas las tareas
   */
  async getAllTareas(): Promise<ApiResponse<TareaResponse[]>> {
    try {
      console.log('Obteniendo todas las tareas');
      
      // Nota: Necesitas crear el endpoint /api/tareas si no existe
      return await authGet<TareaResponse[]>('/api/tareas');
    } catch (error) {
      console.error('Error al obtener tareas:', error);
      return { 
        success: false, 
        error: 'Error de conexión al obtener tareas'
      };
    }
  }

  /**
   * Crea una nueva tarea
   */
  async createTarea(tareaData: TareaData): Promise<ApiResponse<TareaResponse>> {
    try {
      console.log('Creando nueva tarea:', tareaData);
      
      return await authPost<TareaResponse>('/api/tareas', tareaData);
    } catch (error) {
      console.error('Error al crear tarea:', error);
      return { 
        success: false, 
        error: 'Error de conexión al crear tarea'
      };
    }
  }

  /**
   * Actualiza una tarea existente
   */
  async updateTarea(tareaId: number, tareaData: Partial<TareaData>): Promise<ApiResponse<TareaResponse>> {
    try {
      console.log('Actualizando tarea:', tareaId, tareaData);
      
      return await authPatch<TareaResponse>(`/api/tareas/${tareaId}`, tareaData);
    } catch (error) {
      console.error('Error al actualizar tarea:', error);
      return { 
        success: false, 
        error: 'Error de conexión al actualizar tarea'
      };
    }
  }

  /**
   * Elimina una tarea
   */
  async deleteTarea(tareaId: number): Promise<ApiResponse> {
    try {
      console.log('Eliminando tarea:', tareaId);
      
      return await authDelete(`/api/tareas/${tareaId}`);
    } catch (error) {
      console.error('Error al eliminar tarea:', error);
      return { 
        success: false, 
        error: 'Error de conexión al eliminar tarea'
      };
    }
  }

  /**
   * Obtiene el conteo de tareas
   */
  async getTareasCount(): Promise<ApiResponse<number>> {
    try {
      const response = await this.getAllTareas();
      
      if (response.success && Array.isArray(response.data)) {
        return {
          success: true,
          data: response.data.length
        };
      }
      
      return {
        success: false,
        error: 'Error al obtener el conteo de tareas'
      };
    } catch (error) {
      console.error('Error counting tareas:', error);
      return {
        success: false,
        error: 'Error de conexión al contar tareas'
      };
    }
  }
}

// Exportar una instancia singleton del servicio
export const tareasServices = new TareasServices();

// Exportar también la clase para casos especiales
export default TareasServices;