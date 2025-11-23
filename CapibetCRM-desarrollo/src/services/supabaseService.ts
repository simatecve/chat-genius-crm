import { supabaseConfig, apiEndpoints } from '@/config/supabase';
import { getCurrentUserId } from '@/utils/auth';

// Tipos para autenticación
export interface LoginCredentials {
  correo_electronico: string;
  contrasena: string;
}

// Tipos para usuarios
export interface UsuarioData {
  id?: number;
  nombre_agencia: string;
  tipo_empresa: string;
  nombre_usuario: string;
  correo_electronico: string;
  telefono: string;
  codigo_pais: string;
  contrasena: string;
  rol?: string;
  activo?: boolean;
  creado_por?: number; // ID del usuario que creó este usuario
}

export interface UsuarioResponse {
  id: number;
  nombre_agencia: string;
  tipo_empresa: string;
  nombre_usuario: string;
  correo_electronico: string;
  telefono: string;
  codigo_pais: string;
  rol: string;
  activo: boolean; // true = activo, false = desactivado
  fecha_alta?: string;
  created_at?: string;
  creado_por: number; // ID del usuario que creó este usuario
}

// Tipos para contactos
export interface ContactData {
  id?: number;
  nombre: string;
  apellido?: string;
  nombre_completo?: string;
  correo: string;
  telefono: string;
  empresa?: string;
  cargo?: string;
  notas?: string;
  direccion?: string;
  cumpleaños?: string;
  sitio_web?: string;
  etiqueta?: string;
  empresa_id?: number;
  creado_por: number;
}

export interface ContactResponse {
  id: number;
  nombre: string;
  apellido: string | null;
  nombre_completo: string | null;
  correo: string;
  telefono: string;
  empresa: string | null;
  cargo: string | null;
  notas: string | null;
  direccion: string | null;
  cumpleaños: string | null;
  sitio_web: string | null;
  etiqueta: string | null;
  creado_por: number;
  creado_en: string;
  actualizado_en: string;
  empresa_id: number | null;
}

// Tipos para productos
export interface ProductoData {
  id?: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  cantidad: number;
  moneda: 'USD' | 'PESO' | 'DOLAR';
  creado_por?: number;
}

export interface ProductoResponse {
  id: number;
  created_at: string;
  creado_por: number;
  nombre: string;
  moneda: 'USD' | 'PESO' | 'DOLAR';
  precio: number;
  cantidad: number;
  descripcion?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

// Tipos para ventas de fichas digitales
export interface VentaFichasDigitales {
  id: number;
  cliente_id: number;
  vendedor_id: number;
  monto_compra: number;
  fichas_otorgadas: number;
  valor_ficha: number;
  metodo_pago: 'EFECTIVO' | 'DEBITO' | 'CREDITO' | 'TRANSFERENCIA' | 'CRIPTO';
  estado: 'PENDIENTE' | 'COMPLETADA' | 'CANCELADA';
  codigo_venta: string;
  fecha_venta: string;
}

export interface VentaFichasDigitalesData {
  id?: number;
  cliente_id: number;
  vendedor_id: number;
  monto_compra: number;
  fichas_otorgadas: number;
  valor_ficha: number;
  metodo_pago: 'EFECTIVO' | 'DEBITO' | 'CREDITO' | 'TRANSFERENCIA' | 'CRIPTO';
  estado?: 'PENDIENTE' | 'COMPLETADA' | 'CANCELADA';
  codigo_venta: string;
  fecha_venta?: string;
}

export interface Etiqueta {
  id?: number;
  nombre: string;
  color: string;
  descripcion?: string;
  activa?: boolean;
  creado_por?: number;
  creado_en?: string;
  created_at?: string;
}

export interface RespuestaRapida {
  id?: number;
  titulo: string;
  contenido: string;
  categoria: string;
  activa: boolean;
  created_at?: string;
  creado_por?: number; // ID del usuario que creó esta respuesta rápida
}

// Tipos para sesiones y canales
export interface Canal {
  id?: number;
  usuario_id: number;
  espacio_id: number;
  tipo: 'whatsapp' | 'whatsappApi' | 'email' | 'instagram' | 'messenger' | 'telegram' | 'telegramBot' | 'webChat';
  descripcion: string;
  configuracion?: Record<string, any>;
  activo?: boolean;
  creado_en?: string;
  actualizado_en?: string;
  creado_por?: number; // ID del usuario que creó este canal
}

export interface CanalData {
  usuario_id: number;
  espacio_id: number;
  tipo: Canal['tipo'];
  descripcion: string;
  configuracion?: Record<string, any>;
  activo?: boolean;
  creado_por?: number; // ID del usuario que creó este canal
}

export interface Sesion {
  id?: number;
  canal_id: number;
  usuario_id: number;
  nombre: string;
  api_key?: string | null;
  access_token?: string | null;
  phone_number?: string | null;
  email_user?: string | null;
  email_password?: string | null;
  smtp_host?: string | null;
  smtp_port?: number | null;
  imap_host?: string | null;
  imap_port?: number | null;
  estado: 'activo' | 'desconectado' | 'expirado';
  creado_en?: string;
  actualizado_en?: string;
  creado_por?: number; // ID del usuario que creó esta sesión
}

export interface SesionData {
  canal_id: number;
  usuario_id: number;
  nombre: string;
  api_key?: string | null;
  access_token?: string | null;
  phone_number?: string | null;
  email_user?: string | null;
  email_password?: string | null;
  smtp_host?: string | null;
  smtp_port?: number | null;
  imap_host?: string | null;
  imap_port?: number | null;
  estado: 'activo' | 'desconectado' | 'expirado';
  creado_por?: number; // ID del usuario que creó esta sesión
}

export interface SesionResponse {
  id: number;
  canal_id: number;
  usuario_id: number;
  nombre: string;
  api_key?: string | null;
  access_token?: string | null;
  phone_number?: string | null;
  email_user?: string | null;
  email_password?: string | null;
  smtp_host?: string | null;
  smtp_port?: number | null;
  imap_host?: string | null;
  imap_port?: number | null;
  estado: 'activo' | 'desconectado' | 'expirado';
  creado_en: string;
  actualizado_en: string;
  creado_por: number; // ID del usuario que creó esta sesión
}

export interface RespuestaRapidaFormData {
  titulo: string;
  contenido: string;
  categoria: string;
}

// Tipos para espacios de trabajo
export interface EspacioTrabajoData {
  nombre: string;
  creado_por: number;
}

export interface EspacioTrabajoResponse {
  id: number;
  nombre: string;
  creado_por: number;
  creado_en: string;
  actualizado_en: string;
}

// Tipos para embudos
export interface EmbUpdoData {
  nombre: string;
  descripcion?: string;
  creado_por: number;
  espacio_id: number;
  orden?: number;
}

export interface EmbUpdoResponse {
  id: number;
  nombre: string;
  descripcion: string | null;
  creado_por: number;
  creado_en: string;
  actualizado_en: string;
  espacio_id: number;
  orden: number;
}

export interface EspacioConEmbudos extends EspacioTrabajoResponse {
  embudos: EmbUpdoResponse[];
}

// Tipos para mensajes
export interface MensajeData {
  canal_id: number;
  remitente_id: number;
  contenido: string;
  contacto_id: number;
  sesion_id: number;
  destinatario_id: number;
  embudo_id: number;
}

export interface MensajeResponse {
  id: number;
  canal_id: number;
  remitente_id: number;
  contenido: string;
  contacto_id: number;
  sesion_id: number;
  destinatario_id: number;
  embudo_id: number;
  creado_en: string;
  enviado_en?: string;
  leido?: boolean;
  tipo?: string; // Tipo de canal (whatsapp, email, telegram, etc.) - viene del API
  estado?: string;
}

export class SupabaseService {
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'apikey': supabaseConfig.serviceRoleKey,
      'Authorization': `Bearer ${supabaseConfig.serviceRoleKey}`,
    };
  }

  /**
   * Obtiene el ID del usuario actualmente logueado
   */
  private getCurrentUserId(): number | null {
    return getCurrentUserId();
  }

  private async handleResponse(response: Response): Promise<Record<string, unknown> | null> {
    // Manejar respuesta JSON de forma segura
    let data = null;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const responseText = await response.text();
      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          data = { message: 'Operation completed successfully' };
        }
      } else {
        data = { message: 'Operation completed successfully' };
      }
    } else {
      data = { message: 'Operation completed successfully' };
    }
    
    return data;
  }

  private buildFilterUrl(filters: Record<string, string>, select?: string): string {
    const baseUrl = apiEndpoints.usuarios;
    const filterParams = Object.entries(filters)
      .map(([key, value]) => `${key}=eq.${encodeURIComponent(value)}`)
      .join('&');
    
    let url = `${baseUrl}?${filterParams}`;
    
    if (select) {
      url += `&select=${select}`;
    }
    
    return url;
  }

  // ===== MÉTODOS PARA RESPUESTAS RÁPIDAS =====

  /**
   * Obtiene todas las respuestas rápidas del usuario logueado
   */
  async getAllRespuestasRapidas(): Promise<ApiResponse<RespuestaRapida[]>> {
    try {
      // Obtener el ID del usuario logueado
      const userId = this.getCurrentUserId();
      if (!userId) {
        return {
          success: false,
          error: 'Usuario no autenticado'
        };
      }

      // Filtrar respuestas rápidas por creado_por (usuario logueado)
      const response = await fetch(`${apiEndpoints.respuestasRapidas}?creado_por=eq.${userId}&order=created_at.desc`, {
        headers: this.getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await this.handleResponse(response);
      return { success: true, data: Array.isArray(data) ? data : [] };
    } catch (error) {
      console.error('Error al obtener respuestas rápidas:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Obtiene una respuesta rápida por ID (solo del usuario logueado)
   */
  async getRespuestaRapidaById(id: number): Promise<ApiResponse<RespuestaRapida>> {
    try {
      // Obtener el ID del usuario logueado
      const userId = this.getCurrentUserId();
      if (!userId) {
        return {
          success: false,
          error: 'Usuario no autenticado'
        };
      }

      // Obtener solo si pertenece al usuario logueado
      const response = await fetch(`${apiEndpoints.respuestasRapidas}?id=eq.${id}&creado_por=eq.${userId}`, {
        headers: this.getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await this.handleResponse(response);
      return { success: true, data: Array.isArray(data) ? data[0] : null };
    } catch (error) {
      console.error('Error al obtener respuesta rápida:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Crea una nueva respuesta rápida
   */
  async createRespuestaRapida(data: RespuestaRapidaFormData): Promise<ApiResponse> {
    try {
      // Obtener el ID del usuario logueado como creador
      const userId = this.getCurrentUserId();
      if (!userId) {
        return {
          success: false,
          error: 'Usuario no autenticado'
        };
      }

      const response = await fetch(apiEndpoints.respuestasRapidas, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          ...data,
          activa: true,
          creado_por: userId // Asignar el creador
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error al crear respuesta rápida:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Actualiza una respuesta rápida existente (solo del usuario logueado)
   */
  async updateRespuestaRapida(id: number, data: Partial<RespuestaRapida>): Promise<ApiResponse> {
    try {
      // Obtener el ID del usuario logueado
      const userId = this.getCurrentUserId();
      if (!userId) {
        return {
          success: false,
          error: 'Usuario no autenticado'
        };
      }

      // Actualizar solo si pertenece al usuario logueado
      const response = await fetch(`${apiEndpoints.respuestasRapidas}?id=eq.${id}&creado_por=eq.${userId}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error al actualizar respuesta rápida:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Elimina una respuesta rápida (solo del usuario logueado)
   */
  async deleteRespuestaRapida(id: number): Promise<ApiResponse> {
    try {
      // Obtener el ID del usuario logueado
      const userId = this.getCurrentUserId();
      if (!userId) {
        return {
          success: false,
          error: 'Usuario no autenticado'
        };
      }

      // Eliminar solo si pertenece al usuario logueado
      const response = await fetch(`${apiEndpoints.respuestasRapidas}?id=eq.${id}&creado_por=eq.${userId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error al eliminar respuesta rápida:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Cambia el estado activo/inactivo de una respuesta rápida (solo del usuario logueado)
   */
  async toggleRespuestaRapidaStatus(id: number, activa: boolean): Promise<ApiResponse<Record<string, unknown>>> {
    try {
      // Obtener el ID del usuario logueado
      const userId = this.getCurrentUserId();
      if (!userId) {
        return {
          success: false,
          error: 'Usuario no autenticado'
        };
      }

      // Cambiar estado solo si pertenece al usuario logueado
      const response = await fetch(`${apiEndpoints.respuestasRapidas}?id=eq.${id}&creado_por=eq.${userId}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ activa }),
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error al cambiar estado de respuesta rápida:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error al cambiar estado de respuesta rápida'
      };
    }
  }

  /**
   * Obtiene el conteo de respuestas rápidas del usuario logueado
   */
  async getRespuestasRapidasCount(): Promise<ApiResponse<number>> {
    try {
      // Obtener el ID del usuario logueado
      const userId = this.getCurrentUserId();
      if (!userId) {
        return {
          success: false,
          error: 'Usuario no autenticado'
        };
      }

      // Contar respuestas rápidas del usuario logueado
      const response = await fetch(`${apiEndpoints.respuestasRapidas}?creado_por=eq.${userId}&select=id`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        return {
          success: false,
          error: 'Error al obtener el conteo de respuestas rápidas'
        };
      }

      const data = await this.handleResponse(response);
      const count = Array.isArray(data) ? data.length : 0;
      
      return {
        success: true,
        data: count
      };

    } catch (error) {
      console.error('Error counting respuestas rápidas:', error);
      
      return {
        success: false,
        error: 'Error de conexión al contar respuestas rápidas',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }


  // ================================
  // MÉTODOS PARA TAREAS
  // ================================

  /**
   * Obtiene todas las tareas
   */
  async getAllTareas(): Promise<ApiResponse<any[]>> {
    try {
      console.log('Obteniendo todas las tareas');

      const response = await fetch(`${supabaseConfig.restUrl}/tareas`, {
        method: 'GET',
        headers: {
          'apikey': supabaseConfig.serviceRoleKey,
          'Authorization': `Bearer ${supabaseConfig.serviceRoleKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error response body:', errorData);
        return {
          success: false,
          error: `Error del servidor: ${response.status} ${response.statusText}`,
          details: errorData
        };
      }

      const data = await response.json();
      console.log('Tareas obtenidas:', data);

      return { 
        success: true, 
        data: data 
      };
    } catch (error) {
      console.error('Error al obtener tareas:', error);
      return { 
        success: false, 
        error: 'Error de conexión al obtener tareas',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Crea una nueva tarea
   */
  async createTarea(tareaData: any): Promise<ApiResponse<any>> {
    try {
      console.log('Creando nueva tarea:', tareaData);

      const response = await fetch(`${supabaseConfig.restUrl}/tareas`, {
        method: 'POST',
        headers: {
          'apikey': supabaseConfig.serviceRoleKey,
          'Authorization': `Bearer ${supabaseConfig.serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tareaData)
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error response body:', errorData);
        return {
          success: false,
          error: `Error del servidor: ${response.status} ${response.statusText}`,
          details: errorData
        };
      }

      // Manejar respuesta vacía o no-JSON
      let data = null;
      const contentType = response.headers.get('content-type');
      const responseText = await response.text();
      
      if (responseText && contentType && contentType.includes('application/json')) {
        try {
          data = JSON.parse(responseText);
        } catch (jsonError) {
          console.warn('No se pudo parsear JSON, pero la operación fue exitosa:', responseText);
          data = { success: true, message: 'Tarea creada exitosamente' };
        }
      } else {
        console.log('Respuesta exitosa sin JSON:', responseText);
        data = { success: true, message: 'Tarea creada exitosamente' };
      }

      console.log('Tarea creada exitosamente:', data);

      return { 
        success: true, 
        data: data 
      };
    } catch (error) {
      console.error('Error al crear tarea:', error);
      return { 
        success: false, 
        error: 'Error de conexión al crear tarea',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Actualiza una tarea existente
   */
  async updateTarea(tareaId: number, tareaData: any): Promise<ApiResponse<any>> {
    try {
      console.log('Actualizando tarea:', tareaId, tareaData);

      const response = await fetch(`${supabaseConfig.restUrl}/tareas?id=eq.${tareaId}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseConfig.serviceRoleKey,
          'Authorization': `Bearer ${supabaseConfig.serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tareaData)
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error response body:', errorData);
        return {
          success: false,
          error: `Error del servidor: ${response.status} ${response.statusText}`,
          details: errorData
        };
      }

      // Manejar respuesta vacía o no-JSON
      let data = null;
      const contentType = response.headers.get('content-type');
      const responseText = await response.text();
      
      if (responseText && contentType && contentType.includes('application/json')) {
        try {
          data = JSON.parse(responseText);
        } catch (jsonError) {
          console.warn('No se pudo parsear JSON, pero la operación fue exitosa:', responseText);
          data = { success: true, message: 'Tarea actualizada exitosamente' };
        }
      } else {
        console.log('Respuesta exitosa sin JSON:', responseText);
        data = { success: true, message: 'Tarea actualizada exitosamente' };
      }

      console.log('Tarea actualizada exitosamente:', data);

      return { 
        success: true, 
        data: data 
      };
    } catch (error) {
      console.error('Error al actualizar tarea:', error);
      return { 
        success: false, 
        error: 'Error de conexión al actualizar tarea',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Elimina una tarea
   */
  async deleteTarea(tareaId: number): Promise<ApiResponse<any>> {
    try {
      console.log('Eliminando tarea:', tareaId);

      const response = await fetch(`${supabaseConfig.restUrl}/tareas?id=eq.${tareaId}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseConfig.serviceRoleKey,
          'Authorization': `Bearer ${supabaseConfig.serviceRoleKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error response body:', errorData);
        return {
          success: false,
          error: `Error del servidor: ${response.status} ${response.statusText}`,
          details: errorData
        };
      }

      console.log('Tarea eliminada exitosamente');

      return { 
        success: true, 
        data: { message: 'Tarea eliminada exitosamente' }
      };
    } catch (error) {
      console.error('Error al eliminar tarea:', error);
      return { 
        success: false, 
        error: 'Error de conexión al eliminar tarea',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  // ===== MÉTODOS PARA VENTAS DE FICHAS DIGITALES =====

  /**
   * Obtiene todas las ventas de fichas digitales
   */
  async getAllVentasFichasDigitales(): Promise<ApiResponse<VentaFichasDigitales[]>> {
    try {
      console.log('▶ Obteniendo todas las ventas de fichas digitales...');
      
      const response = await fetch(`${apiEndpoints.ventasFichasDigitales}?select=*&order=fecha_venta.desc`, {
        method: 'GET',
        headers: {
          'apikey': supabaseConfig.serviceRoleKey,
          'Authorization': `Bearer ${supabaseConfig.serviceRoleKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error response body:', errorData);
        return {
          success: false,
          error: `Error del servidor: ${response.status} ${response.statusText}`,
          details: errorData
        };
      }

      const data: VentaFichasDigitales[] = await response.json();
      console.log('✓ Ventas de fichas digitales obtenidas:', data.length);

      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('✗ Error al obtener ventas de fichas digitales:', error);
      return { 
        success: false, 
        error: 'Error de conexión al obtener ventas de fichas digitales',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtiene una venta específica por ID
   */
  async getVentaFichasDigitalesById(id: number): Promise<ApiResponse<VentaFichasDigitales>> {
    try {
      console.log('▶ Obteniendo venta de fichas digitales por ID:', id);
      
      const response = await fetch(`${apiEndpoints.ventasFichasDigitales}?id=eq.${id}&select=*`, {
        method: 'GET',
        headers: {
          'apikey': supabaseConfig.serviceRoleKey,
          'Authorization': `Bearer ${supabaseConfig.serviceRoleKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error response body:', errorData);
        return {
          success: false,
          error: `Error del servidor: ${response.status} ${response.statusText}`,
          details: errorData
        };
      }

      const data: VentaFichasDigitales[] = await response.json();
      
      if (data.length === 0) {
        return {
          success: false,
          error: 'Venta no encontrada'
        };
      }

      console.log('✓ Venta de fichas digitales obtenida:', data[0]);

      return {
        success: true,
        data: data[0]
      };
    } catch (error) {
      console.error('✗ Error al obtener venta de fichas digitales:', error);
      return { 
        success: false, 
        error: 'Error de conexión al obtener venta de fichas digitales',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Crea una nueva venta de fichas digitales
   */
  async createVentaFichasDigitales(ventaData: VentaFichasDigitalesData): Promise<ApiResponse<VentaFichasDigitales>> {
    try {
      console.log('▶ Creando nueva venta de fichas digitales:', ventaData);
      
      const response = await fetch(apiEndpoints.ventasFichasDigitales, {
        method: 'POST',
        headers: {
          'apikey': supabaseConfig.serviceRoleKey,
          'Authorization': `Bearer ${supabaseConfig.serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ventaData)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error response body:', errorData);
        return {
          success: false,
          error: `Error del servidor: ${response.status} ${response.statusText}`,
          details: errorData
        };
      }

      // Verificar si hay contenido en la respuesta
      const responseText = await response.text();
      console.log('📄 Respuesta del servidor:', responseText);
      
      if (!responseText || responseText.trim() === '') {
        console.log('✓ Venta creada exitosamente (sin contenido en respuesta)');
        return {
          success: true,
          data: null
        };
      }

      const data: VentaFichasDigitales = JSON.parse(responseText);
      console.log('✓ Venta de fichas digitales creada:', data);

      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('✗ Error al crear venta de fichas digitales:', error);
      return { 
        success: false, 
        error: 'Error de conexión al crear venta de fichas digitales',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Actualiza una venta de fichas digitales por ID
   */
  async updateVentaFichasDigitales(id: number, data: VentaFichasDigitalesData): Promise<ApiResponse<VentaFichasDigitales>> {
    try {
      console.log('📄 Actualizando venta de fichas digitales:', id, data);
      
      const response = await fetch(`${apiEndpoints.ventasFichasDigitales}?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseConfig.serviceRoleKey,
          'Authorization': `Bearer ${supabaseConfig.serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('✗ Error del servidor al actualizar venta:', errorData);
        return {
          success: false,
          error: `Error del servidor: ${response.status} ${response.statusText}`,
          details: errorData
        };
      }

      // Verificar si hay contenido en la respuesta
      const responseText = await response.text();
      console.log('📄 Respuesta del servidor (actualización):', responseText);
      
      if (!responseText || responseText.trim() === '') {
        console.log('✓ Venta actualizada exitosamente (sin contenido en respuesta)');
        return {
          success: true,
          data: null
        };
      }

      const updatedData: VentaFichasDigitales[] = JSON.parse(responseText);
      console.log('✓ Venta de fichas digitales actualizada:', updatedData[0]);

      return {
        success: true,
        data: updatedData[0]
      };
    } catch (error) {
      console.error('✗ Error al actualizar venta de fichas digitales:', error);
      return { 
        success: false, 
        error: 'Error de conexión al actualizar venta de fichas digitales',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Elimina una venta de fichas digitales por ID
   */
  async deleteVentaFichasDigitales(id: number): Promise<ApiResponse<null>> {
    try {
      console.log('🗑 Eliminando venta de fichas digitales:', id);
      
      const response = await fetch(`${apiEndpoints.ventasFichasDigitales}?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseConfig.serviceRoleKey,
          'Authorization': `Bearer ${supabaseConfig.serviceRoleKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('✗ Error del servidor al eliminar venta:', errorData);
        return {
          success: false,
          error: `Error del servidor: ${response.status} ${response.statusText}`,
          details: errorData
        };
      }

      console.log('✓ Venta de fichas digitales eliminada:', id);

      return {
        success: true,
        data: null
      };
    } catch (error) {
      console.error('✗ Error al eliminar venta de fichas digitales:', error);
      return { 
        success: false, 
        error: 'Error de conexión al eliminar venta de fichas digitales',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}

export const supabaseService = new SupabaseService();
