// Tipos para embudos
export interface EmbudoData {
  nombre: string;
  descripcion?: string;
  creado_por: string; // UUID
  espacio_id: string; // UUID
  orden?: number;
  color?: string;
}

export interface EmbudoResponse {
  id: string; // UUID
  nombre: string;
  descripcion: string | null;
  creado_por: string; // UUID
  creado_en: string; // timestamp with time zone
  actualizado_en: string; // timestamp with time zone
  espacio_id: string; // UUID
  orden: number; // bigint
  color: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

export interface UpdateOrderRequest {
  embudos: Array<{
    id: string; // UUID
    orden: number;
  }>;
}
