// Tipos compartidos entre diferentes módulos de la aplicación

// Tipos para canales
export interface Canal {
  id?: number;
  usuario_id: number;
  espacio_id: number;
  tipo: 'whatsapp' | 'whatsappApi' | 'email' | 'instagram' | 'messenger' | 'telegram' | 'telegramBot' | 'webChat';
  descripcion: string;
  configuracion?: Record<string, unknown>;
  activo?: boolean;
  creado_en?: string;
  actualizado_en?: string;
  creado_por?: number;
}

export interface CanalData {
  usuario_id: number;
  espacio_id: number;
  tipo: Canal['tipo'];
  descripcion: string;
  configuracion?: Record<string, unknown>;
  activo?: boolean;
  creado_por?: number;
}

// Tipos para sesiones (actualizados para usar la nueva estructura con UUIDs)
export interface Sesion {
  id: string;
  usuario_id: string;
  nombre: string;
  estado: 'activo' | 'desconectado' | 'expirado';
  creado_en: string;
  actualizado_en: string;
  type: 'whatsapp_qr' | 'whatsapp_api' | 'messenger' | 'instagram' | 'telegram' | 'telegram_bot' | 'gmail' | 'outlook';
  embudo_id: string;
  organizacion_id?: string;
  description?: string;
  email?: string;
  given_name?: string;
  picture?: string;
  whatsapp_session?: string;
}

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
  whatsapp_session?: string;
}
