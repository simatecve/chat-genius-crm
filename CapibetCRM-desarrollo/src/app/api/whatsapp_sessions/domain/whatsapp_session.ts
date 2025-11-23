// Tipos para whatsapp_sessions
export interface WhatsAppSessionData {
  id?: number;
  session_id: string; // UUID único del orquestador
  sesion_id?: number; // FK a tabla sesiones (opcional al crear)
  phone_number: string; // Campo requerido en la DB
  status: 'connected' | 'disconnected' | 'expired' | 'pending';
  last_seen: string; // Campo requerido en la DB
  auth_folder_path: string; // Campo requerido en la DB
  server_port?: number | null;
  whatsapp_user_id: string; // Campo requerido en la DB
  created_at?: string;
  updated_at?: string;
}

export interface WhatsAppSessionResponse {
  id: number;
  session_id: string;
  sesion_id: number;
  phone_number: string; // Campo requerido en la DB
  status: 'connected' | 'disconnected' | 'expired' | 'pending';
  last_seen: string; // Campo requerido en la DB
  auth_folder_path: string; // Campo requerido en la DB
  server_port?: number | null;
  whatsapp_user_id: string; // Campo requerido en la DB
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Datos que recibimos del orquestador cuando se conecta una nueva sesión
export interface NewSessionConnectedData {
  session_id: string;
  phone_number?: string; // Puede venir vacío del orquestador
  status: 'connected';
  last_seen?: string; // Puede venir vacío del orquestador
  auth_folder_path?: string; // Puede venir vacío del orquestador
  whatsapp_user_id?: string; // Puede venir vacío del orquestador
  created_at?: string;
  updated_at?: string;
}

// Datos para crear una whatsapp_session temporal (antes de que se conecte)
export interface CreateWhatsAppSessionData {
  session_id: string; // UUID del orquestador
  sesion_id: number; // ID de la sesión creada en nuestra DB
  status: 'pending';
}

// Datos para actualizar una whatsapp_session cuando se conecta exitosamente
export interface UpdateWhatsAppSessionData {
  phone_number?: string;
  status: 'connected';
  last_seen?: string;
  auth_folder_path?: string;
  whatsapp_user_id?: string;
  updated_at: string;
}
