// Tipos para mensajes
export interface MensajeData {
  id?: string;
  remitente_id: string;
  contacto_id: string;
  creado_en?: string;
  chat_id: string;
  type: 'whatsapp_qr' | 'whatsapp_api' | 'messenger' | 'instagram' | 'telegram' | 'telegram_bot' | 'gmail' | 'outlook' | 'web_chat';
  content: Record<string, unknown>;
}

export interface MensajeResponse {
  id: string;
  remitente_id: string | null;
  contacto_id: string;
  creado_en: string;
  chat_id: string;
  type: 'whatsapp_qr' | 'whatsapp_api' | 'messenger' | 'instagram' | 'telegram' | 'telegram_bot' | 'gmail' | 'outlook' | 'web_chat';
  content: Record<string, unknown>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}
