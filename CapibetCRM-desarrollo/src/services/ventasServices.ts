import { authGet, authPost, authPatch, authDelete, ApiResponse } from '@/utils/apiClient';

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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

const apiEndpoints = {
  ventas: `${API_BASE_URL}/api/ventas`,
  ventasById: (id: string) => `${API_BASE_URL}/api/ventas/${id}`,
};

class VentasServices {
  /**
   * Obtiene todas las ventas
   */
  async getAllVentas(): Promise<ApiResponse<VentaResponse[]>> {
    return authGet<VentaResponse[]>(apiEndpoints.ventas);
  }

  /**
   * Obtiene las ventas de un cliente específico
   */
  async getVentasByCliente(clienteId: string): Promise<ApiResponse<VentaResponse[]>> {
    return authGet<VentaResponse[]>(`${apiEndpoints.ventas}?cliente_id=${clienteId}`);
  }

  /**
   * Obtiene las ventas de una organización específica
   */
  async getVentasByOrganizacion(organizacionId: string): Promise<ApiResponse<VentaResponse[]>> {
    return authGet<VentaResponse[]>(`${apiEndpoints.ventas}?organizacion_id=${organizacionId}`);
  }

  /**
   * Obtiene las ventas de un vendedor específico
   */
  async getVentasByVendedor(vendedorId: string): Promise<ApiResponse<VentaResponse[]>> {
    return authGet<VentaResponse[]>(`${apiEndpoints.ventas}?vendedor_id=${vendedorId}`);
  }

  /**
   * Obtiene una venta específica por ID
   */
  async getVentaById(id: string): Promise<ApiResponse<VentaResponse>> {
    return authGet<VentaResponse>(apiEndpoints.ventasById(id));
  }

  /**
   * Crea una nueva venta
   */
  async createVenta(ventaData: VentaData): Promise<ApiResponse<VentaResponse>> {
    return authPost<VentaResponse>(apiEndpoints.ventas, ventaData);
  }

  /**
   * Actualiza una venta específica por ID
   */
  async updateVentaById(id: string, ventaData: Partial<VentaData>): Promise<ApiResponse<VentaResponse>> {
    return authPatch<VentaResponse>(apiEndpoints.ventasById(id), ventaData);
  }

  /**
   * Elimina una venta
   */
  async deleteVenta(id: string): Promise<ApiResponse> {
    return authDelete(apiEndpoints.ventasById(id));
  }
}

export const ventasServices = new VentasServices();

export default VentasServices;
