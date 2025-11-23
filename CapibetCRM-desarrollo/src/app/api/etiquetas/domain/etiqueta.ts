// Tipos para etiquetas
export interface EtiquetaData {
  id?: string;
  nombre: string;
  color: string;
  descripcion: string;
  creado_por?: string;
  organizacion_id?: string;
  creado_en?: string;
}

export interface EtiquetaResponse {
  id: string;
  nombre: string;
  color: string;
  descripcion: string;
  creado_por: string;
  organizacion_id: string;
  creado_en: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}
