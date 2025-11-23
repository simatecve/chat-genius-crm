// Tipos para plantilla de mensajes
export interface PlantillaMensajeData {
  id?: string;                    // UUID
  nombre?: string;                // Nombre de la plantilla
  canal?: string;                 // Canal de comunicación (whatsapp, email, sms, etc.)
  contenido?: string;             // Contenido del mensaje
  creado_en?: string;             // Timestamp de creación
  actualizado_en?: string;        // Timestamp de actualización
  creado_por?: string;            // UUID del usuario que creó la plantilla
  organizacion_id?: string;       // UUID de la organización
}

// Response de plantilla de mensajes
export interface PlantillaMensajeResponse {
  id: string;                     // UUID
  nombre: string;                 // Nombre de la plantilla
  canal: string;                  // Canal de comunicación
  contenido: string;              // Contenido del mensaje
  creado_en: string;              // Timestamp de creación
  actualizado_en: string;         // Timestamp de actualización
  creado_por: string;             // UUID del usuario que creó la plantilla
  organizacion_id: string;        // UUID de la organización
}

// Response genérico de la API
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  message?: string;
}
