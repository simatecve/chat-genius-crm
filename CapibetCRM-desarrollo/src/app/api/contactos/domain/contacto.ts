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

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

export interface IContacto extends ContactData {}