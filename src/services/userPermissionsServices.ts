import { authGet, authPost, authPatch, ApiResponse } from '@/utils/apiClient';
import { UserPermissionsData } from '../app/api/user_permissions/domain/user_permissions';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

const apiEndpoints = {
  userPermissions: `${API_BASE_URL}/api/user_permissions`,
};

class UserPermissionsServices {
  async getByUsuario(usuarioId: string): Promise<ApiResponse<UserPermissionsData | null>> {
    const result = await authGet<UserPermissionsData[]>(`${apiEndpoints.userPermissions}?usuario_id=${usuarioId}`);
    if (result.success && Array.isArray(result.data) && result.data.length > 0) {
      return { success: true, data: result.data[0] };
    }
    return { success: true, data: null };
  }

  async create(perms: UserPermissionsData): Promise<ApiResponse<UserPermissionsData>> {
    return authPost<UserPermissionsData>(apiEndpoints.userPermissions, perms);
  }

  async update(usuarioId: string, perms: Partial<UserPermissionsData>): Promise<ApiResponse<UserPermissionsData>> {
    return authPatch<UserPermissionsData>(`${apiEndpoints.userPermissions}?usuario_id=${usuarioId}`, perms);
  }
}

export const userPermissionsServices = new UserPermissionsServices();
export default UserPermissionsServices;
