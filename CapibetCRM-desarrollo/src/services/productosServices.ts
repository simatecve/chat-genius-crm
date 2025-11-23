import { authGet, authPost, authPatch, authDelete, ApiResponse } from '@/utils/apiClient';

// Tipos de datos para productos
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

const apiEndpoints = {
  productos: `${API_BASE_URL}/api/productos`,
  productosById: (id: string) => `${API_BASE_URL}/api/productos/${id}`,
};

class ProductosServices {
  /**
   * Obtiene todos los productos
   */
  async getAllProductos(): Promise<ApiResponse<ProductResponse[]>> {
    return authGet<ProductResponse[]>(apiEndpoints.productos);
  }

  /**
   * Obtiene un producto por ID
   */
  async getProductoById(id: string): Promise<ApiResponse<ProductResponse>> {
    return authGet<ProductResponse>(apiEndpoints.productosById(id));
  }

  /**
   * Crea un nuevo producto
   */
  async createProducto(productData: ProductData): Promise<ApiResponse<ProductResponse>> {
    return authPost<ProductResponse>(apiEndpoints.productos, productData);
  }

  /**
   * Actualiza un producto existente
   */
  async updateProducto(productData: Partial<ProductData> & { id: string }): Promise<ApiResponse<ProductResponse>> {
    return authPatch<ProductResponse>(apiEndpoints.productos, productData);
  }

  /**
   * Elimina un producto
   */
  async deleteProducto(id: string): Promise<ApiResponse> {
    return authDelete(apiEndpoints.productosById(id));
  }

  /**
   * Busca productos por nombre o descripción
   */
  async searchProductos(query: string): Promise<ApiResponse<ProductResponse[]>> {
    try {
      const response = await this.getAllProductos();
      
      if (response.success && Array.isArray(response.data)) {
        const filteredProducts = response.data.filter(product => 
          product.nombre.toLowerCase().includes(query.toLowerCase()) ||
          product.descripcion.toLowerCase().includes(query.toLowerCase())
        );
        
        return {
          success: true,
          data: filteredProducts
        };
      }
      
      return {
        success: false,
        error: 'Error al buscar productos'
      };

    } catch (error) {
      console.error('Error searching products:', error);
      
      return {
        success: false,
        error: 'Error de conexión al buscar productos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}

export const productosServices = new ProductosServices();

export default ProductosServices;
