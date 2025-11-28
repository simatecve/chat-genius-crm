/**
 * Utilidades de autenticación centralizadas
 */

/**
 * Interfaces para los datos de localStorage
 */
export interface UserData {
  id: string;
  nombre: string;
  correo_electronico: string;
  organizacion_id?: string;
  telefono?: string;
  rol: string;
  codigo_pais?: string;
  permisos?: string[];
}

export interface OrganizationData {
  id: string;
  nombre: string;
  logo?: string | null;
  web?: string | null;
}

/**
 * Lista completa de todas las claves de localStorage que se usan para la sesión
 */
export const SESSION_STORAGE_KEYS = [
  'access_token',
  'refresh_token',
  'userData',
  'organizationData',
  'registeredEmail', // Temporal del registro
] as const;

/**
 * Limpia completamente todos los datos de sesión del usuario
 * Esta función debe ser la ÚNICA manera de hacer logout en la aplicación
 */
export function clearUserSession(): void {
  // Limpiar localStorage
  SESSION_STORAGE_KEYS.forEach(key => {
    localStorage.removeItem(key);
  });

  // Limpiar sessionStorage por seguridad adicional
  SESSION_STORAGE_KEYS.forEach(key => {
    sessionStorage.removeItem(key);
  });

  // Log para debugging (solo en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Sesión de usuario limpiada completamente');
    console.log('🗑️ Variables eliminadas:', SESSION_STORAGE_KEYS);
  }
}

/**
 * Realiza logout completo y redirige al login
 * Incluye limpieza de sesión y recarga forzada para limpiar memoria
 */
export function performLogout(): void {
  try {
    // Limpiar todos los datos de sesión
    clearUserSession();
    
    // Forzar navegación al login con recarga completa
    // Esto asegura que cualquier estado en memoria se limpia
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('Error durante logout:', error);
    
    // Fallback: intentar redirigir de todas formas
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
}

/**
 * Verifica si el usuario está autenticado
 */
export function isUserAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  
  const accessToken = localStorage.getItem('access_token');
  const userData = localStorage.getItem('userData');
  
  return !!accessToken && !!userData;
}

/**
 * Obtiene el ID del usuario logueado de manera segura
 */
export function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const userData = getUserData();
    return userData?.id || null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

/**
 * Obtiene los datos del usuario logueado
 */
export function getUserData(): UserData | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
}

/**
 * Obtiene los datos de la organización
 */
export function getOrganizationData(): OrganizationData | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const orgData = localStorage.getItem('organizationData');
    return orgData ? JSON.parse(orgData) : null;
  } catch (error) {
    console.error('Error parsing organization data:', error);
    return null;
  }
}

/**
 * Obtiene el access token
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

/**
 * Obtiene el refresh token
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token');
}

/**
 * Obtiene el rol del usuario
 */
export function getUserRole(): string | null {
  const userData = getUserData();
  return userData?.rol || null;
}

/**
 * Obtiene los permisos del usuario
 */
export function getUserPermissions(): string[] {
  const userData = getUserData();
  return Array.isArray(userData?.permisos) ? userData!.permisos! : [];
}

/**
 * Obtiene el email del usuario
 */
export function getUserEmail(): string | null {
  const userData = getUserData();
  return userData?.correo_electronico || null;
}

/**
 * Obtiene el nombre del usuario
 */
export function getUserName(): string | null {
  const userData = getUserData();
  return userData?.nombre || null;
}

/**
 * Obtiene el nombre de la organización
 */
export function getOrganizationName(): string | null {
  const orgData = getOrganizationData();
  return orgData?.nombre || null;
}

/**
 * Verifica si el usuario tiene un rol específico
 */
export function hasRole(role: string): boolean {
  const userRole = getUserRole();
  return userRole === role;
}

/**
 * Verifica si el usuario es admin
 */
export function isAdmin(): boolean {
  return hasRole('ADMINITRADOR') || hasRole('super_admin');
}

/**
 * Verifica si el usuario tiene un permiso específico
 */
export function hasPermission(permiso: string): boolean {
  if (isAdmin()) return true;
  const permisos = getUserPermissions();
  return permisos.includes(permiso);
}

/**
 * Verifica si el usuario es cliente
 */
export function isCliente(): boolean {
  return hasRole('cliente');
}
