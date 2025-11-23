// Tipos para sesiones
export interface SesionData {
  id?: string;
  usuario_id: string;
  nombre: string;
  estado?: string;
  creado_en?: string;
  actualizado_en?: string;
  type: 'whatsapp_qr' | 'whatsapp_api' | 'messenger' | 'instagram' | 'telegram' | 'telegram_bot' | 'gmail' | 'outlook';
  embudo_id: string;
  organizacion_id?: string;
  description?: string;
  email?: string;
  given_name?: string;
  picture?: string;
  whatsapp_session?: string; // UUID de la sesión de WhatsApp
}

export interface SesionResponse {
  id: string;
  usuario_id: string;
  nombre: string;
  estado: string;
  creado_en: string;
  actualizado_en: string;
  type: 'whatsapp_qr' | 'whatsapp_api' | 'messenger' | 'instagram' | 'telegram' | 'telegram_bot' | 'gmail' | 'outlook';
  embudo_id: string;
  organizacion_id?: string;
  description?: string;
  email?: string;
  given_name?: string;
  picture?: string;
  whatsapp_session?: string; // UUID de la sesión de WhatsApp
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}
