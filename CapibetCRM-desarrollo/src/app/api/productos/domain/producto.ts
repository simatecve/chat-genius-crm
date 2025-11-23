export interface ProductData {
  id?: string;
  nombre: string;
  precio: number;
  stock: number;
  descripcion: string;
  organizacion_id?: string;
  created_at?: string;
}

export interface ProductResponse {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
  descripcion: string;
  organizacion_id: string;
  created_at: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

export interface IProducto extends ProductData {}