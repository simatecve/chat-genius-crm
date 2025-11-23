export interface ChatData {
  id?: string;
  sesion_id: string;
  contact_id: string;
  embudo_id: string;
  nuevos_mensajes?: boolean;
}

export interface ChatResponse {
  id: string;
  sesion_id: string;
  contact_id: string;
  embudo_id: string;
  created_at: string;
  nuevos_mensajes: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

export interface IChat extends ChatData {}
