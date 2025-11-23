import { authGet, authPost, authPatch, authDelete, ApiResponse } from '@/utils/apiClient';

// Tipos de datos para contactos
export interface ContactData {
  id?: string;
  nombre: string;
  apellido?: string;
  nombre_completo?: string;
  correo: string;
  telefono: string;
  notas?: string;
  direccion?: string;
  cumpleaños?: string;
  sitio_web?: string;
  creado_por: string;
  agente?: string;
  organizacion_id?: string;
  etiquetas?: string[];
  genero?: string;
  fecha_cumpleaños?: string;
  origen?: string;
  whatsapp_jid?: string;
}

export interface ContactResponse {
  id: string;
  nombre: string;
  apellido?: string;
  nombre_completo?: string;
  correo: string;
  telefono: string;
  notas?: string;
  direccion?: string;
  cumpleaños?: string;
  sitio_web?: string;
  creado_en: string;
  actualizado_en: string;
  genero?: string;
  fecha_cumpleaños?: string;
  origen?: string;
  whatsapp_jid?: string;
  creado_por: string;
  agente?: string;
  organizacion_id?: string;
  etiquetas?: string[];
}

export interface ImportResponse {
  message: string;
  errores?: string[];
}

// Configuración de la API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Endpoints de la API
const apiEndpoints = {
  contactos: `${API_BASE_URL}/api/contactos`,
  contactosById: (id: string) => `${API_BASE_URL}/api/contactos/${id}`,
  contactosImportar: `${API_BASE_URL}/api/contactos/importar`,
  contactosExportar: `${API_BASE_URL}/api/contactos/exportar`
};

class ContactoServices {
  /**
   * Obtiene todos los contactos del usuario logueado
   */
  async getAllContactos(): Promise<ApiResponse<ContactResponse[]>> {
    return authGet<ContactResponse[]>(apiEndpoints.contactos);
  }

  /**
   * Crea un nuevo contacto
   */
  async createContacto(contactData: ContactData): Promise<ApiResponse<ContactResponse>> {
    return authPost<ContactResponse>(apiEndpoints.contactos, contactData);
  }

  /**
   * Actualiza un contacto existente
   */
  async updateContacto(contactData: Partial<ContactData> & { id: string }): Promise<ApiResponse<ContactResponse>> {
    return authPatch<ContactResponse>(apiEndpoints.contactos, contactData);
  }

  /**
   * Elimina un contacto
   */
  async deleteContacto(id: string): Promise<ApiResponse> {
    return authDelete(`${apiEndpoints.contactos}/${id}`);
  }

  /**
   * Importa contactos desde un archivo CSV
   */
  async importarContactos(file: File): Promise<ApiResponse<ImportResponse>> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      return authPost<ImportResponse>(apiEndpoints.contactosImportar, formData, true);

    } catch (error) {
      console.error('Error importing contacts:', error);
      
      return {
        success: false,
        error: 'Error de conexión al importar contactos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Exporta todos los contactos a CSV
   */
  async exportarContactos(): Promise<ApiResponse<Blob>> {
    try {
      const { authFetch } = await import('@/utils/apiClient');
      
      const response = await authFetch(apiEndpoints.contactosExportar, {
        method: 'GET'
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error del servidor: ${response.status} ${response.statusText} - ${errorData}`);
      }

      const blob = await response.blob();
      
      return {
        success: true,
        data: blob
      };

    } catch (error) {
      console.error('Error exporting contacts:', error);
      
      return {
        success: false,
        error: 'Error de conexión al exportar contactos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtiene el conteo de contactos del usuario logueado
   */
  async getContactosCount(): Promise<ApiResponse<number>> {
    try {
      const response = await this.getAllContactos();
      
      if (response.success && Array.isArray(response.data)) {
        return {
          success: true,
          data: response.data.length
        };
      }
      
      return {
        success: false,
        error: 'Error al obtener el conteo de contactos'
      };

    } catch (error) {
      console.error('Error counting contacts:', error);
      
      return {
        success: false,
        error: 'Error de conexión al contar contactos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}

// Exportar una instancia singleton del servicio
export const contactoServices = new ContactoServices();

// Exportar también la clase para casos especiales
export default ContactoServices;
