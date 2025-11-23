import { authGet, authPost, authPatch, authDelete, publicFetch, ApiResponse } from '@/utils/apiClient';
import { UsuarioData, UsuarioResponse, LoginCredentials, OrganizacionData } from '../app/api/usuarios/domain/usuario';

// Response extendida del login con tokens
interface LoginResponse extends UsuarioData {
  access_token?: string;
  refresh_token?: string;
  organizacion?: OrganizacionData;
}

// Configuración de la API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Endpoints de la API
const apiEndpoints = {
  usuarios: `${API_BASE_URL}/api/usuarios`,
  usuariosById: (id: string) => `${API_BASE_URL}/api/usuarios/${id}`,
  usuariosToggleStatus: (id: string) => `${API_BASE_URL}/api/usuarios/${id}/toggle-status`,
  usuariosCheckEmail: `${API_BASE_URL}/api/usuarios/check-email`,
  usuariosLogin: `${API_BASE_URL}/api/usuarios/login`,
  usuariosRegister: `${API_BASE_URL}/api/usuarios/register`
};

class UserServices {
  /**
   * Crea un nuevo usuario (autenticado - para admins)
   */
  async createUsuario(userData: UsuarioData): Promise<ApiResponse<UsuarioResponse>> {
    return authPost<UsuarioResponse>(apiEndpoints.usuarios, userData);
  }

  /**
   * Registra un nuevo usuario externamente (sin autenticación requerida)
   */
  async registerExternalUser(userData: UsuarioData): Promise<ApiResponse<UsuarioResponse>> {
    return publicFetch<UsuarioResponse>(apiEndpoints.usuariosRegister, {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  /**
   * Obtiene todos los usuarios del sistema
   */
  async getAllUsuarios(): Promise<ApiResponse<UsuarioResponse[]>> {
    return authGet<UsuarioResponse[]>(apiEndpoints.usuarios);
  }

  /**
   * Obtiene un usuario por ID
   */
  async getUsuarioById(id: string): Promise<ApiResponse<UsuarioResponse>> {
    return authGet<UsuarioResponse>(apiEndpoints.usuariosById(id));
  }

  /**
   * Actualiza un usuario existente
   */
  async updateUsuario(id: string, userData: Partial<UsuarioData>): Promise<ApiResponse<UsuarioResponse>> {
    return authPatch<UsuarioResponse>(apiEndpoints.usuariosById(id), userData);
  }

  /**
   * Elimina un usuario
   */
  async deleteUsuario(id: string): Promise<ApiResponse> {
    return authDelete(apiEndpoints.usuariosById(id));
  }

  /**
   * Cambia el estado activo/inactivo de un usuario
   */
  async toggleUsuarioStatus(id: string, activo: boolean): Promise<ApiResponse> {
    return authPatch(apiEndpoints.usuariosToggleStatus(id), { activo });
  }

  /**
   * Verifica si un email ya existe en el sistema
   */
  async checkEmailExists(email: string): Promise<ApiResponse<boolean>> {
    return authGet<boolean>(`${apiEndpoints.usuariosCheckEmail}?email=${encodeURIComponent(email)}`);
  }

  /**
   * Realiza el login de un usuario
   * Ahora retorna access_token, refresh_token y datos de la organización
   */
  async loginUsuario(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    return publicFetch<LoginResponse>(apiEndpoints.usuariosLogin, {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  /**
   * Obtiene el conteo de usuarios (método auxiliar que puede ser útil)
   */
  async getUsersCount(): Promise<ApiResponse<number>> {
    try {
      const response = await this.getAllUsuarios();
      
      if (response.success && Array.isArray(response.data)) {
        return {
          success: true,
          data: response.data.length
        };
      }
      
      return {
        success: false,
        error: 'Error al obtener el conteo de usuarios'
      };

    } catch (error) {
      console.error('Error counting users:', error);
      
      return {
        success: false,
        error: 'Error de conexión al contar usuarios',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}

// Exportar una instancia singleton del servicio
export const userServices = new UserServices();

// Exportar también la clase para casos especiales
export default UserServices;
