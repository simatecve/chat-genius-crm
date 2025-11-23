// Tipos para espacios de trabajo
export interface EspacioTrabajoData {
  id?: string;
  nombre: string;
  creado_por: string;
  organizacion_id: string;
  orden?: number;
}

export interface EspacioTrabajoResponse {
  id: string;
  nombre: string;
  creado_por: string;
  organizacion_id: string;
  orden: number;
  creado_en: string;
  actualizado_en: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}