/**
 * Servicio para integración con Koonetxa WhatsApp HTTP API
 * 
 * Esta API proporciona una alternativa a Baileys para gestionar sesiones de WhatsApp
 * a través de HTTP en lugar de WebSocket directo.
 */

// Configuración de la API
const KOONETXA_CONFIG = {
    baseUrl: process.env.KOONETXA_API_URL || 'https://ws.koonetxa.cloud',
    apiKey: process.env.KOONETXA_API_KEY || 'XAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOieyJ0e',
    timeout: 30000,
};

// Tipos de datos
export interface KoonetxaSession {
    sessionId: string;
    phoneNumber?: string;
    status: 'pending' | 'qr_ready' | 'connected' | 'disconnected';
    qrCode?: string;
    webhookUrl?: string;
}

export interface KoonetxaSendMessageRequest {
    sessionId: string;
    to: string;
    message: string;
    type?: 'text' | 'image' | 'video' | 'audio' | 'document';
    mediaUrl?: string;
    caption?: string;
}

export interface KoonetxaWebhookPayload {
    event: 'message' | 'status' | 'qr_update';
    sessionId: string;
    data: any;
    timestamp: string;
}

/**
 * Clase principal para interactuar con Koonetxa API
 */
export class KoonetxaService {
    private baseUrl: string;
    private apiKey: string;
    private timeout: number;

    constructor() {
        this.baseUrl = KOONETXA_CONFIG.baseUrl;
        this.apiKey = KOONETXA_CONFIG.apiKey;
        this.timeout = KOONETXA_CONFIG.timeout;
    }

    /**
     * Headers comunes para todas las peticiones
     */
    private getHeaders(): HeadersInit {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'application/json',
        };
    }

    /**
     * Crear una nueva sesión de WhatsApp
     */
    async createSession(sessionId: string, webhookUrl?: string): Promise<KoonetxaSession> {
        try {
            const response = await fetch(`${this.baseUrl}/sessions`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    sessionId,
                    webhookUrl: webhookUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/koonetxa/webhook`,
                }),
                signal: AbortSignal.timeout(this.timeout),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Error creating session: ${error.message || response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating Koonetxa session:', error);
            throw error;
        }
    }

    /**
     * Obtener el código QR de una sesión
     */
    async getQRCode(sessionId: string): Promise<{ qrCode: string; status: string }> {
        try {
            const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/qr`, {
                method: 'GET',
                headers: this.getHeaders(),
                signal: AbortSignal.timeout(this.timeout),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Error getting QR: ${error.message || response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting QR code:', error);
            throw error;
        }
    }

    /**
     * Actualizar una sesión
     */
    async updateSession(sessionId: string, data: Partial<KoonetxaSession>): Promise<KoonetxaSession> {
        try {
            const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
                method: 'PATCH',
                headers: this.getHeaders(),
                body: JSON.stringify(data),
                signal: AbortSignal.timeout(this.timeout),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Error updating session: ${error.message || response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating session:', error);
            throw error;
        }
    }

    /**
     * Obtener el estado de una sesión
     */
    async getSessionStatus(sessionId: string): Promise<KoonetxaSession> {
        try {
            const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
                method: 'GET',
                headers: this.getHeaders(),
                signal: AbortSignal.timeout(this.timeout),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Error getting session status: ${error.message || response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting session status:', error);
            throw error;
        }
    }

    /**
     * Desconectar una sesión
     */
    async disconnectSession(sessionId: string): Promise<{ success: boolean; message: string }> {
        try {
            const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/disconnect`, {
                method: 'POST',
                headers: this.getHeaders(),
                signal: AbortSignal.timeout(this.timeout),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Error disconnecting session: ${error.message || response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error disconnecting session:', error);
            throw error;
        }
    }

    /**
     * Eliminar una sesión
     */
    async deleteSession(sessionId: string): Promise<{ success: boolean; message: string }> {
        try {
            const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: this.getHeaders(),
                signal: AbortSignal.timeout(this.timeout),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Error deleting session: ${error.message || response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error deleting session:', error);
            throw error;
        }
    }

    /**
     * Enviar un mensaje de texto
     */
    async sendTextMessage(sessionId: string, to: string, message: string): Promise<{ success: boolean; messageId: string }> {
        try {
            const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/messages`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    to,
                    type: 'text',
                    message,
                }),
                signal: AbortSignal.timeout(this.timeout),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Error sending message: ${error.message || response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error sending text message:', error);
            throw error;
        }
    }

    /**
     * Enviar un mensaje con media (imagen, video, etc.)
     */
    async sendMediaMessage(request: KoonetxaSendMessageRequest): Promise<{ success: boolean; messageId: string }> {
        try {
            const response = await fetch(`${this.baseUrl}/sessions/${request.sessionId}/messages`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    to: request.to,
                    type: request.type || 'text',
                    message: request.message,
                    mediaUrl: request.mediaUrl,
                    caption: request.caption,
                }),
                signal: AbortSignal.timeout(this.timeout),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Error sending media message: ${error.message || response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error sending media message:', error);
            throw error;
        }
    }

    /**
     * Listar todas las sesiones
     */
    async listSessions(): Promise<KoonetxaSession[]> {
        try {
            const response = await fetch(`${this.baseUrl}/sessions`, {
                method: 'GET',
                headers: this.getHeaders(),
                signal: AbortSignal.timeout(this.timeout),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Error listing sessions: ${error.message || response.statusText}`);
            }

            const data = await response.json();
            return data.sessions || [];
        } catch (error) {
            console.error('Error listing sessions:', error);
            throw error;
        }
    }

    /**
     * Verificar si el servicio está disponible
     */
    async healthCheck(): Promise<{ status: string; version?: string }> {
        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                headers: this.getHeaders(),
                signal: AbortSignal.timeout(this.timeout),
            });

            if (!response.ok) {
                throw new Error(`Health check failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Health check failed:', error);
            throw error;
        }
    }
}

// Exportar instancia singleton
export const koonetxaService = new KoonetxaService();

// Utilidades
export const validatePhoneNumber = (phoneNumber: string): boolean => {
    // Formato esperado: número con código de país, sin espacios ni caracteres especiales
    const phonePattern = /^\d{10,15}$/;
    return phonePattern.test(phoneNumber.replace(/[+\s-]/g, ''));
};

export const formatPhoneNumber = (phoneNumber: string): string => {
    // Remover caracteres no numéricos excepto el +
    let formatted = phoneNumber.replace(/[^\d+]/g, '');

    // Si no empieza con +, agregarlo
    if (!formatted.startsWith('+')) {
        formatted = '+' + formatted;
    }

    return formatted;
};
