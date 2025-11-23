// Tipos para autenticación
export interface LoginCredentials {
  correo_electronico: string;
  contrasena: string;
}

// Interfaz para la organización
export interface OrganizacionData {
  id: string;
  nombre: string;
  website?: string | null;
  logo?: string | null;
}

// Tipos para usuarios
export interface UsuarioData {
  id?: string;              // UUID de auth
  correo_electronico?: string;
  nombre?: string;
  telefono?: string;
  codigo_pais?: string;
  rol?: string;
  activo?: boolean;
  organizacion_id?: string; // UUID de la organización
  organizacion?: OrganizacionData; // Datos completos de la organización
  creado_en?: string;
  actualizado_en?: string;
}

// Response de Supabase Auth
export interface SupabaseAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  refresh_token: string;
  user: {
    id: string;
    aud: string;
    role?: string;
    email?: string;
    email_confirmed_at?: string;
    phone?: string;
    confirmed_at?: string;
    last_sign_in_at?: string;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
    identities?: unknown[];
    created_at?: string;
    updated_at?: string;
  };
}

export interface UsuarioResponse {
  id: string;               // UUID
  email?: string;
  nombre: string;
  telefono?: string;
  codigo_pais?: string;
  rol: string;
  activo: boolean;
  organizacion_id: string;
  organizacion?: OrganizacionData;
  access_token?: string;
  refresh_token?: string;
  creado_en?: string;
  actualizado_en?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  message?: string;
}

export interface ToggleStatusRequest {
  activo: boolean;
}