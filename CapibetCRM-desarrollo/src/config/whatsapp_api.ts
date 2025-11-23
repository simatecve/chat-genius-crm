/**
 * Configuración para la API de WhatsApp con el orquestador
 */

// Configuración del orquestador de WhatsApp
export const WHATSAPP_CONFIG = {
  // URL base del orquestador de WhatsApp
  ORCHESTRATOR_BASE_URL: process.env.WHATSAPP_ORCHESTRATOR_URL || 'http://localhost:3001',

  // Endpoints del orquestador
  GENERATE_QR_ENDPOINT: '/generate-qr',
  DISCONNECT_SESSION_ENDPOINT: '/sessions',

  // Timeout para las peticiones (en milisegundos)
  REQUEST_TIMEOUT: 30000,

  // Reintento de conexión
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // 2 segundos
};

// Interfaces para las respuestas del orquestador
export interface GenerateQRResponse {
  success: boolean;
  sessionId: string;
  qr: string; // Base64 encoded image
  qrText: string;
  message: string;
}

export interface WhatsAppSessionData {
  session_id: string;
  phone_number: string;
  status: 'connected' | 'disconnected' | 'expired';
  last_seen: string;
  auth_folder_path: string;
  server_port: number | null;
  whatsapp_user_id: string;
  created_at: string;
  updated_at: string;
}

// Clase para manejar las peticiones al orquestador de WhatsApp
export class WhatsAppApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = WHATSAPP_CONFIG.ORCHESTRATOR_BASE_URL;
  }

  /**
   * Genera un QR para nueva sesión de WhatsApp
   */
  async generateQR(): Promise<GenerateQRResponse> {
    try {
      const response = await fetch(`${this.baseUrl}${WHATSAPP_CONFIG.GENERATE_QR_ENDPOINT}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(WHATSAPP_CONFIG.REQUEST_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Error del orquestador: ${response.status} ${response.statusText}`);
      }

      const data: GenerateQRResponse = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Error al generar QR');
      }

      return data;
    } catch (error) {
      console.error('Error generando QR:', error);

      if (error instanceof Error) {
        throw new Error(`Error al generar QR: ${error.message}`);
      }

      throw new Error('Error desconocido al generar QR');
    }
  }

  /**
   * Verifica el estado de una sesión
   */
  async checkSessionStatus(sessionId: string): Promise<{
    success: boolean;
    status: 'connected' | 'disconnected' | 'pending' | 'expired';
    message: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/session-status/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(WHATSAPP_CONFIG.REQUEST_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Error del orquestador: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error verificando estado de sesión:', error);
      return {
        success: false,
        status: 'disconnected',
        message: 'Error al verificar estado de sesión'
      };
    }
  }

  /**
   * Desconecta una sesión de WhatsApp QR
   */
  async disconnectSession(sessionId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}${WHATSAPP_CONFIG.DISCONNECT_SESSION_ENDPOINT}/${sessionId}/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(WHATSAPP_CONFIG.REQUEST_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Error del orquestador: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Error al desconectar sesión');
      }

      return data;
    } catch (error) {
      console.error('Error desconectando sesión:', error);

      if (error instanceof Error) {
        throw new Error(`Error al desconectar sesión: ${error.message}`);
      }

      throw new Error('Error desconocido al desconectar sesión');
    }
  }
}

// Instancia singleton del servicio
export const whatsAppApiService = new WhatsAppApiService();

// Utilitades para validación
export const validateSessionId = (sessionId: string): boolean => {
  // Formato esperado: session_timestamp_randomstring
  const sessionPattern = /^session_\d+_[a-zA-Z0-9]+$/;
  return sessionPattern.test(sessionId);
};

export const validatePhoneNumber = (phoneNumber: string): boolean => {
  // Formato esperado: número con código de país, sin espacios ni caracteres especiales
  const phonePattern = /^\d{10,15}$/;
  return phonePattern.test(phoneNumber.replace(/[+\s-]/g, ''));
};
