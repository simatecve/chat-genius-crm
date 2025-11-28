import { authGet, authPatch, ApiResponse } from '@/utils/apiClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

const apiEndpoints = {
  organizacionesById: (id: string) => `${API_BASE_URL}/api/organizaciones/${id}`,
};

class OrganizacionServices {
  async getOrganizacionById(id: string): Promise<ApiResponse<any>> {
    return authGet<any>(apiEndpoints.organizacionesById(id));
  }

  async updateOrganizacion(id: string, data: Partial<any>): Promise<ApiResponse<any>> {
    return authPatch<any>(apiEndpoints.organizacionesById(id), data);
  }
}

export const organizacionServices = new OrganizacionServices();
export default OrganizacionServices;
