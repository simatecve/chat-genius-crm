/**
 * Cliente HTTP centralizado con autenticación automática
 * 
 * Características:
 * - Añade automáticamente el access_token a todas las peticiones
 * - Detecta cuando el token expira (401)
 * - Intenta renovar el token con refresh_token automáticamente
 * - Si el refresh falla, hace logout y redirige al login
 * - Reintenta la petición original después del refresh
 */

import { getAccessToken, getRefreshToken, performLogout } from './auth';

/**
 * Tipos para las respuestas de la API
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  message?: string;
}

/**
 * Opciones para las peticiones autenticadas
 */
interface AuthFetchOptions extends RequestInit {
  skipAuth?: boolean; // Para rutas públicas como login
  isFormData?: boolean; // Para peticiones multipart/form-data
}

/**
 * Bandera global para evitar múltiples refreshes simultáneos
 */
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Intenta renovar el access token usando el refresh token
 */
async function refreshAccessToken(): Promise<string | null> {
  // Si ya está en proceso de refresh, esperar a que termine
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  
  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      
      if (!refreshToken) {
        console.warn('No hay refresh token disponible');
        performLogout();
        return null;
      }

      const response = await fetch('/api/usuarios/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (!response.ok) {
        console.warn('Refresh token expirado o inválido');
        performLogout();
        return null;
      }

      const data: ApiResponse = await response.json();
      
      if (data.success && data.data) {
        const { access_token, refresh_token: new_refresh_token, user } = data.data;
        
        // Actualizar tokens en localStorage
        localStorage.setItem('access_token', access_token);
        if (new_refresh_token) {
          localStorage.setItem('refresh_token', new_refresh_token);
        }
        
        // Actualizar datos del usuario si vienen
        if (user) {
          localStorage.setItem('userData', JSON.stringify(user));
        }
        
        console.log('✅ Token renovado exitosamente');
        return access_token;
      }

      performLogout();
      return null;

    } catch (error) {
      console.error('Error al renovar token:', error);
      performLogout();
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Obtiene los headers para las peticiones autenticadas
 */
function getAuthHeaders(isFormData: boolean = false): HeadersInit {
  const headers: HeadersInit = {};
  
  // Solo agregar Content-Type si no es FormData
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Agregar token de autenticación
  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

/**
 * Cliente HTTP con autenticación automática y refresh de token
 * 
 * @param url - URL de la petición
 * @param options - Opciones de fetch extendidas
 * @returns Promise con la respuesta
 */
export async function authFetch<T = any>(
  url: string,
  options: AuthFetchOptions = {}
): Promise<Response> {
  const { skipAuth = false, isFormData = false, headers = {}, ...restOptions } = options;

  // Preparar headers
  let requestHeaders: HeadersInit = { ...headers };
  
  if (!skipAuth) {
    requestHeaders = {
      ...getAuthHeaders(isFormData),
      ...headers
    };
  } else if (!isFormData) {
    // Para rutas públicas, solo agregar Content-Type si no es FormData
    requestHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
  }

  // Realizar la petición
  let response = await fetch(url, {
    ...restOptions,
    headers: requestHeaders
  });

  // Si recibimos 401 y no estamos en modo skipAuth, intentar refresh
  if (response.status === 401 && !skipAuth) {
    console.log('🔄 Token expirado, intentando renovar...');
    
    const newToken = await refreshAccessToken();
    
    if (newToken) {
      // Reintentar la petición con el nuevo token
      console.log('🔁 Reintentando petición con nuevo token...');
      
      requestHeaders = {
        ...getAuthHeaders(isFormData),
        ...headers
      };
      
      response = await fetch(url, {
        ...restOptions,
        headers: requestHeaders
      });
    } else {
      // Si el refresh falló, performLogout ya redirigió al login
      throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
    }
  }

  return response;
}

/**
 * Realiza una petición GET autenticada
 */
export async function authGet<T = any>(url: string): Promise<ApiResponse<T>> {
  try {
    const response = await authFetch(url, { method: 'GET' });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Error del servidor: ${response.status} ${response.statusText} - ${errorData}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in authGet:', error);
    return {
      success: false,
      error: 'Error de conexión',
      details: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Realiza una petición POST autenticada
 */
export async function authPost<T = any>(
  url: string,
  body: any,
  isFormData: boolean = false
): Promise<ApiResponse<T>> {
  try {
    const options: AuthFetchOptions = {
      method: 'POST',
      isFormData
    };
    
    if (isFormData) {
      options.body = body; // FormData se pasa directamente
    } else {
      options.body = JSON.stringify(body);
    }
    
    const response = await authFetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Error del servidor: ${response.status} ${response.statusText} - ${errorData}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in authPost:', error);
    return {
      success: false,
      error: 'Error de conexión',
      details: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Realiza una petición PATCH autenticada
 */
export async function authPatch<T = any>(url: string, body: any): Promise<ApiResponse<T>> {
  try {
    const response = await authFetch(url, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Error del servidor: ${response.status} ${response.statusText} - ${errorData}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in authPatch:', error);
    return {
      success: false,
      error: 'Error de conexión',
      details: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Realiza una petición DELETE autenticada
 */
export async function authDelete<T = any>(url: string): Promise<ApiResponse<T>> {
  try {
    const response = await authFetch(url, { method: 'DELETE' });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Error del servidor: ${response.status} ${response.statusText} - ${errorData}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in authDelete:', error);
    return {
      success: false,
      error: 'Error de conexión',
      details: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Realiza una petición pública (sin autenticación)
 * Útil para login, register, etc.
 */
export async function publicFetch<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await authFetch(url, { ...options, skipAuth: true });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Error del servidor: ${response.status} ${response.statusText} - ${errorData}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in publicFetch:', error);
    return {
      success: false,
      error: 'Error de conexión',
      details: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

