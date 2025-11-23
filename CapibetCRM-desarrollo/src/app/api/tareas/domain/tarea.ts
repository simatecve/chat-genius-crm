// Tipos para tareas
export interface TareaData {
  id?: string;                    // UUID, opcional (se genera automáticamente)
  titulo: string;                 // Requerido
  descripcion?: string;           // Opcional
  prioridad?: string;             // Opcional (ej: 'alta', 'media', 'baja')
  categoria?: string;             // Opcional (ej: 'desarrollo', 'marketing', 'ventas')
  fecha?: string;                 // Opcional (fecha de vencimiento)
  creado_por?: string;            // UUID del usuario creador
  asignado?: string;              // UUID del usuario asignado
  organizacion_id?: string;       // UUID de la organización
  creado_en?: string;             // Timestamp, se genera automáticamente
  actualizado_en?: string;        // Timestamp, se actualiza automáticamente
}

export interface TareaResponse {
  id: string;                     // UUID
  titulo: string;
  descripcion?: string;
  prioridad?: string;
  categoria?: string;
  fecha?: string;
  creado_por?: string;
  asignado?: string;
  organizacion_id?: string;
  creado_en?: string;
  actualizado_en?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  message?: string;
}

export interface ToggleStatusRequest {
  activo: boolean;
}
