// Tipos para respuestas rápidas
export interface RespuestaRapidaData {
  id?: string;
  titulo: string;
  contenido: string;
  categoria?: string;
  activa?: boolean;
  created_at?: string;
  updated_at?: string;
  creado_por?: string;
  organizacion_id?: string;
}

export interface RespuestaRapidaResponse {
  id: string;
  titulo: string;
  contenido: string;
  categoria: string;
  activa: boolean;
  created_at: string;
  updated_at?: string;
  creado_por?: string;
  organizacion_id?: string;
}

export interface RespuestaRapidaFormData {
  titulo: string;
  contenido: string;
  categoria?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  message?: string;
}

export interface ToggleStatusRequest {
  activa: boolean;
}
