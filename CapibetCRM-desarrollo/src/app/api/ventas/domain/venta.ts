export interface VentaData {
  id?: string;
  producto_id: string;
  cliente_id: string;
  cantidad: number;
  fecha: string;
  vendedor_id: string;
  organizacion_id: string;
}

export interface VentaResponse {
  id: string;
  created_at: string;
  producto_id: string;
  cliente_id: string;
  cantidad: number;
  fecha: string;
  vendedor_id: string;
  organizacion_id: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

export interface IVenta extends VentaData {}
