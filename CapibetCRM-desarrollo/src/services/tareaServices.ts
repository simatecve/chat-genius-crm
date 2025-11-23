import { authGet, authPost, authPatch, authDelete, publicFetch, ApiResponse } from '@/utils/apiClient';
import { TareaData, TareaResponse } from '../app/api/tareas/domain/tarea';

// Configuración de la API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Endpoints de la API
const apiEndpoints = {
  tareas: `${API_BASE_URL}/api/tareas`,
  tareasById: (id: string) => `${API_BASE_URL}/api/tareas/${id}`
};

class TareaServices {
  /**
   * Crea una nueva tarea
   */
  async createTarea(tareaData: TareaData): Promise<ApiResponse<TareaResponse>> {
    return authPost<TareaResponse>(apiEndpoints.tareas, tareaData);
  }

  /**
   * Obtiene todas las tareas del sistema
   */
  async getAllTareas(): Promise<ApiResponse<TareaResponse[]>> {
    return authGet<TareaResponse[]>(apiEndpoints.tareas);
  }

  /**
   * Obtiene una tarea por ID
   */
  async getTareaById(id: string): Promise<ApiResponse<TareaResponse>> {
    return authGet<TareaResponse>(apiEndpoints.tareasById(id));
  }

  /**
   * Actualiza una tarea existente
   */
  async updateTarea(id: string, tareaData: Partial<TareaData>): Promise<ApiResponse<TareaResponse>> {
    return authPatch<TareaResponse>(apiEndpoints.tareasById(id), tareaData);
  }

  /**
   * Elimina una tarea
   */
  async deleteTarea(id: string): Promise<ApiResponse> {
    return authDelete(apiEndpoints.tareasById(id));
  }

  /**
   * Obtiene tareas por prioridad
   */
  async getTareasByPrioridad(prioridad: string): Promise<ApiResponse<TareaResponse[]>> {
    try {
      const response = await this.getAllTareas();
      
      if (response.success && Array.isArray(response.data)) {
        const tareasFiltradas = response.data.filter(tarea => 
          tarea.prioridad === prioridad
        );
        
        return {
          success: true,
          data: tareasFiltradas
        };
      }
      
      return {
        success: false,
        error: 'Error al obtener las tareas por prioridad'
      };

    } catch (error) {
      console.error('Error filtering tasks by priority:', error);
      
      return {
        success: false,
        error: 'Error de conexión al obtener tareas por prioridad',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtiene tareas por categoría
   */
  async getTareasByCategoria(categoria: string): Promise<ApiResponse<TareaResponse[]>> {
    try {
      const response = await this.getAllTareas();
      
      if (response.success && Array.isArray(response.data)) {
        const tareasFiltradas = response.data.filter(tarea => 
          tarea.categoria === categoria
        );
        
        return {
          success: true,
          data: tareasFiltradas
        };
      }
      
      return {
        success: false,
        error: 'Error al obtener las tareas por categoría'
      };

    } catch (error) {
      console.error('Error filtering tasks by category:', error);
      
      return {
        success: false,
        error: 'Error de conexión al obtener tareas por categoría',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtiene tareas asignadas a un usuario específico
   */
  async getTareasByAsignado(asignadoId: string): Promise<ApiResponse<TareaResponse[]>> {
    try {
      const response = await this.getAllTareas();
      
      if (response.success && Array.isArray(response.data)) {
        const tareasFiltradas = response.data.filter(tarea => 
          tarea.asignado === asignadoId
        );
        
        return {
          success: true,
          data: tareasFiltradas
        };
      }
      
      return {
        success: false,
        error: 'Error al obtener las tareas asignadas'
      };

    } catch (error) {
      console.error('Error filtering tasks by assignee:', error);
      
      return {
        success: false,
        error: 'Error de conexión al obtener tareas asignadas',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtiene tareas creadas por un usuario específico
   */
  async getTareasByCreadoPor(creadoPorId: string): Promise<ApiResponse<TareaResponse[]>> {
    try {
      const response = await this.getAllTareas();
      
      if (response.success && Array.isArray(response.data)) {
        const tareasFiltradas = response.data.filter(tarea => 
          tarea.creado_por === creadoPorId
        );
        
        return {
          success: true,
          data: tareasFiltradas
        };
      }
      
      return {
        success: false,
        error: 'Error al obtener las tareas creadas'
      };

    } catch (error) {
      console.error('Error filtering tasks by creator:', error);
      
      return {
        success: false,
        error: 'Error de conexión al obtener tareas creadas',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtiene el conteo de tareas (método auxiliar que puede ser útil)
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
      console.error('Error counting tasks:', error);
      
      return {
        success: false,
        error: 'Error de conexión al contar tareas',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtiene tareas próximas a vencer (método auxiliar)
   */
  async getTareasProximasVencer(dias: number = 7): Promise<ApiResponse<TareaResponse[]>> {
    try {
      const response = await this.getAllTareas();
      
      if (response.success && Array.isArray(response.data)) {
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() + dias);
        
        const tareasProximas = response.data.filter(tarea => {
          if (!tarea.fecha) return false;
          
          const fechaTarea = new Date(tarea.fecha);
          return fechaTarea <= fechaLimite && fechaTarea >= new Date();
        });
        
        return {
          success: true,
          data: tareasProximas
        };
      }
      
      return {
        success: false,
        error: 'Error al obtener las tareas próximas a vencer'
      };

    } catch (error) {
      console.error('Error filtering upcoming tasks:', error);
      
      return {
        success: false,
        error: 'Error de conexión al obtener tareas próximas a vencer',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}

// Exportar una instancia singleton del servicio
export const tareaServices = new TareaServices();

// Exportar también la clase para casos especiales
export default TareaServices;
