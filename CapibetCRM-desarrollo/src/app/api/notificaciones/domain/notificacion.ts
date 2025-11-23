/**
 * Dominio: Notificaciones
 * Modelo escalable para sistema de notificaciones multi-canal
 */

export type NotificacionTipo = 'info' | 'success' | 'warning' | 'error';
export type NotificacionPrioridad = 1 | 2 | 3 | 4 | 5; // 1=baja, 5=urgente

/**
 * Datos para crear una notificación
 */
export interface NotificacionData {
  id?: string;
  
  // Relaciones
  usuario_id: string;
  
  // Contenido
  titulo: string;
  mensaje: string;
  tipo?: NotificacionTipo;
  prioridad?: NotificacionPrioridad;
  
  // Acciones
  accion_url?: string;
  data?: Record<string, any>;
  
  // Control de canales (para futuras implementaciones)
  enviar_push?: boolean;
  enviar_email?: boolean;
}

/**
 * Respuesta completa de una notificación
 */
export interface NotificacionResponse {
  id: string;
  
  // Relaciones
  usuario_id: string;
  
  // Contenido
  titulo: string;
  mensaje: string;
  tipo: NotificacionTipo;
  prioridad: NotificacionPrioridad;
  
  // Acciones
  accion_url?: string;
  data?: Record<string, any>;
  
  // Estado
  leida: boolean;
  archivada_en?: string;
  enviada_push: boolean;
  enviada_email: boolean;
  
  // Fechas
  creado_en: string;
  actualizado_en: string;
}

/**
 * Filtros para consulta de notificaciones
 */
export interface NotificacionFiltros {
  usuario_id?: string;
  leida?: boolean;
  tipo?: NotificacionTipo | NotificacionTipo[];
  prioridad?: NotificacionPrioridad;
  fecha_desde?: string;
  fecha_hasta?: string;
  limite?: number;
  offset?: number;
}

/**
 * Estadísticas de notificaciones
 */
export interface NotificacionEstadisticas {
  total: number;
  no_leidas: number;
  por_tipo: Record<NotificacionTipo, number>;
  por_prioridad: Record<number, number>;
}

/**
 * Respuesta de la API
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  message?: string;
}

/**
 * Request para marcar como leída
 */
export interface MarcarLeidaRequest {
  notificacion_id?: string;
  marcar_todas?: boolean;
}

/**
 * Interface para compatibilidad
 */
export interface INotificacion extends NotificacionData {}

