import { authGet, authPost, ApiResponse } from '@/utils/apiClient';

export interface NotificacionData {
  id: string;
  usuario_id: string;
  titulo: string;
  mensaje: string;
  tipo: 'info' | 'success' | 'warning' | 'error';
  prioridad: number;
  accion_url?: string;
  data?: any;
  leida: boolean;
  archivada_en?: string;
  enviada_push: boolean;
  enviada_email: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface NotificacionFiltros {
  leida?: boolean;
  tipo?: string;
  incluir_archivadas?: boolean;
  orden?: string;
  limit?: number;
  offset?: number;
}

/**
 * Servicios para manejo de notificaciones
 */
class NotificacionServices {
  private baseUrl = '/api/notificaciones';

  /**
   * Obtiene las notificaciones del usuario autenticado
   */
  async getNotificaciones(filtros?: NotificacionFiltros): Promise<ApiResponse<NotificacionData[]>> {
    try {
      const params = new URLSearchParams();
      
      if (filtros?.leida !== undefined) {
        params.append('leida', filtros.leida.toString());
      }
      if (filtros?.tipo) {
        params.append('tipo', filtros.tipo);
      }
      if (filtros?.incluir_archivadas) {
        params.append('incluir_archivadas', filtros.incluir_archivadas.toString());
      }
      if (filtros?.orden) {
        params.append('orden', filtros.orden);
      }
      if (filtros?.limit) {
        params.append('limit', filtros.limit.toString());
      }
      if (filtros?.offset) {
        params.append('offset', filtros.offset.toString());
      }

      const queryString = params.toString();
      const url = queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl;

      return authGet<NotificacionData[]>(url);
    } catch (error) {
      console.error('Error al obtener notificaciones:', error);
      return {
        success: false,
        error: 'Error de conexión al obtener notificaciones',
        data: []
      };
    }
  }

  /**
   * Marca una notificación como leída
   */
  async marcarComoLeida(notificacionId: string): Promise<ApiResponse<void>> {
    try {
      return authPost<void>(
        `${this.baseUrl}/marcar-leida`,
        { notificacion_id: notificacionId }
      );
    } catch (error) {
      console.error('Error al marcar notificación como leída:', error);
      return {
        success: false,
        error: 'Error de conexión al marcar notificación como leída'
      };
    }
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  async marcarTodasComoLeidas(): Promise<ApiResponse<void>> {
    try {
      return authPost<void>(
        `${this.baseUrl}/marcar-todas-leidas`,
        {}
      );
    } catch (error) {
      console.error('Error al marcar todas las notificaciones como leídas:', error);
      return {
        success: false,
        error: 'Error de conexión al marcar todas las notificaciones como leídas'
      };
    }
  }

  /**
   * Carga las notificaciones no leídas del usuario
   */
  async cargarNotificacionesNoLeidas(): Promise<NotificacionData[]> {
    try {
      const response = await this.getNotificaciones({
        leida: false,
        orden: 'creado_en.desc',
        limit: 50
      });

      if (response.success && response.data) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error al cargar notificaciones no leídas:', error);
      return [];
    }
  }
}

export const notificacionServices = new NotificacionServices();
