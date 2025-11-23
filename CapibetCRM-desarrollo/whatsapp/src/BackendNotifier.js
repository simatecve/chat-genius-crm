/**
 * Clase para manejar las notificaciones al backend principal
 * Personaliza estas funciones según los endpoints de tu backend
 */
export class BackendNotifier {
    constructor(options = {}) {
        this.backendBaseUrl = options.backendBaseUrl || 'http://localhost:3000'; // URL de tu backend principal
        this.apiKey = options.apiKey || null; // API Key si es necesario
        this.timeout = options.timeout || 30000; // Timeout para requests (30 segundos)
        this.retries = options.retries || 3; // Reintentos en caso de error
    }

    /**
     * Headers comunes para todas las requests
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'WhatsApp-Orchestrator/1.0'
        };

        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
            // O headers['X-API-Key'] = this.apiKey; según tu implementación
        }

        return headers;
    }

    /**
     * Método genérico para hacer requests al backend
     */
    async makeRequest(endpoint, payload, method = 'POST') {
        const url = `${this.backendBaseUrl}${endpoint}`;

        for (let attempt = 1; attempt <= this.retries; attempt++) {
            try {
                console.log(`[BACKEND NOTIFY] Intento ${attempt}/${this.retries} - ${method} ${url}`);

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);

                const response = await fetch(url, {
                    method,
                    headers: this.getHeaders(),
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();
                console.log(`[BACKEND NOTIFY] Éxito:`, result);
                return result;

            } catch (error) {
                console.error(`[BACKEND NOTIFY] Error en intento ${attempt}:`, error.message);

                if (attempt === this.retries) {
                    console.error(`[BACKEND NOTIFY] Falló después de ${this.retries} intentos`);
                    throw error;
                }

                // Esperar antes del siguiente intento (backoff exponencial)
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    /**
     * Notifica cambios de estado de sesión al backend principal
     * 
     * @param {string} sessionId - ID de la sesión
     * @param {string} status - Estado: 'connected', 'disconnected', 'connecting', 'error'
     * @param {string|null} error - Mensaje de error si aplica
     */
    async notifyStatusChange(sessionId, status, error = null) {
        const payload = {
            session_id: sessionId,
            status: status,
            error_message: error,
            timestamp: new Date().toISOString(),
            last_seen: status === 'connected' ? new Date().toISOString() : null
        };

        try {
            // Endpoint para actualizar estado en tu tabla whatsapp_sessions
            await this.makeRequest('/api/whatsapp/sessions/status-update', payload);
        } catch (err) {
            console.error(`[BACKEND NOTIFY] Error notificando cambio de estado:`, err);
        }
    }

    /**
     * Notifica mensajes recibidos al backend principal
     * Para mensajes de imagen, envía la imagen comprimida en base64
     * 
     * @param {string} sessionId - ID de la sesión
     * @param {Object} messageData - Datos del mensaje
     */
    async notifyMessageReceived(sessionId, messageData) {
        const payload = {
            session_id: sessionId,

            // ID único del mensaje para prevenir duplicados
            message_id: messageData.messageId, // ID único de WhatsApp (CRÍTICO para idempotencia)

            // Información del remitente
            sender_name: messageData.senderName,
            sender_phone_number: messageData.senderPhoneNumber,
            sender_account_type: messageData.senderAccountType,
            sender_jid: messageData.senderJid,
            sender_participant: messageData.senderParticipant,

            // Información del destinatario
            recipient_name: messageData.recipientInfo?.name,
            recipient_phone_number: messageData.recipientInfo?.phoneNumber,
            recipient_whatsapp_id: messageData.recipientInfo?.whatsappId,
            recipient_account_type: messageData.recipientInfo?.accountType,
            recipient_session_id: messageData.recipientInfo?.sessionId,

            // Información del chat/conversación
            chat_jid: messageData.chatJid,

            // Contenido del mensaje
            message_content: messageData.messageContent,
            message_type: messageData.messageType,

            // Metadatos
            raw_message: messageData.rawMessage, // Mensaje completo de Baileys
            received_at: messageData.timestamp,
            phone_number_session: messageData.recipientPhoneNumber // Mantener compatibilidad
        };

        // Para mensajes de imagen, agregar imagen comprimida en base64
        if (messageData.messageType === 'image') {
            if (messageData.mediaInfo?.image_compressed) {
                payload.image_compressed = messageData.mediaInfo.image_compressed;
                payload.image_caption = messageData.mediaInfo.caption || null;
                payload.image_width = messageData.mediaInfo.width || null;
                payload.image_height = messageData.mediaInfo.height || null;
                payload.image_mimetype = messageData.mediaInfo.mimetype || 'image/jpeg';

                console.log(`[BACKEND NOTIFY] === MENSAJE DE IMAGEN COMPRIMIDA ===`);
                console.log(`[BACKEND NOTIFY] Imagen comprimida: ${payload.image_compressed.length} caracteres base64`);
                console.log(`[BACKEND NOTIFY] Dimensiones: ${payload.image_width}x${payload.image_height}`);
                console.log(`[BACKEND NOTIFY] MIME Type: ${payload.image_mimetype}`);
                console.log(`[BACKEND NOTIFY] Caption: ${payload.image_caption || 'Sin caption'}`);
            } else if (messageData.mediaInfo?.url) {
                // Fallback a URL si no se pudo comprimir
                payload.image_url = messageData.mediaInfo.url;
                payload.image_caption = messageData.mediaInfo.caption || null;
                payload.image_mimetype = messageData.mediaInfo.mimetype || 'image/jpeg';
                payload.image_width = messageData.mediaInfo.width || null;
                payload.image_height = messageData.mediaInfo.height || null;

                console.log(`[BACKEND NOTIFY] === IMAGEN FALLBACK URL ===`);
                console.log(`[BACKEND NOTIFY] URL de imagen: ${messageData.mediaInfo.url}`);
                console.log(`[BACKEND NOTIFY] MIME Type: ${payload.image_mimetype}`);
                console.log(`[BACKEND NOTIFY] Dimensiones: ${payload.image_width}x${payload.image_height}`);
                console.log(`[BACKEND NOTIFY] Caption: ${payload.image_caption || 'Sin caption'}`);
            }
        }

        // Log para otros tipos de multimedia (mantener información completa)
        if (messageData.messageType !== 'text' && messageData.messageType !== 'image') {
            payload.media_info = messageData.mediaInfo;
            payload.download_info = messageData.downloadInfo;

            console.log(`[BACKEND NOTIFY] === INFORMACIÓN MULTIMEDIA ENVIADA ===`);
            console.log(`[BACKEND NOTIFY] Tipo: ${messageData.messageType}`);
            console.log(`[BACKEND NOTIFY] Puede descargar: ${messageData.mediaInfo?.canDownload || false}`);
            console.log(`[BACKEND NOTIFY] Método de descarga: ${messageData.mediaInfo?.downloadMethod || 'N/A'}`);
            console.log(`[BACKEND NOTIFY] Tamaño: ${messageData.mediaInfo?.fileLength || 'N/A'} bytes`);
            console.log(`[BACKEND NOTIFY] MIME type: ${messageData.mediaInfo?.mimetype || 'N/A'}`);
            if (messageData.downloadInfo) {
                console.log(`[BACKEND NOTIFY] Nombre sugerido: ${messageData.downloadInfo.fileName}`);
            }
        }

        try {
            // Endpoint para procesar mensajes recibidos
            await this.makeRequest('/api/whatsapp/messages/received', payload);
        } catch (err) {
            console.error(`[BACKEND NOTIFY] Error notificando mensaje:`, err);
        }
    }

    /**
     * Notifica actualizaciones de QR al backend principal
     * 
     * @param {string} sessionId - ID de la sesión
     * @param {string} qrData - Datos del QR
     */
    async notifyQRUpdate(sessionId, qrData) {
        const payload = {
            session_id: sessionId,
            qr_data: qrData,
            generated_at: new Date().toISOString()
        };

        try {
            // Endpoint para notificar QR disponible
            await this.makeRequest('/api/whatsapp/sessions/qr-update', payload);
        } catch (err) {
            console.error(`[BACKEND NOTIFY] Error notificando QR:`, err);
        }
    }

    /**
     * Notifica cuando una nueva sesión se conecta completamente
     * Envía TODOS los datos necesarios para crear el registro en whatsapp_sessions
     * 
     * @param {string} sessionId - ID de la sesión generado automáticamente
     * @param {Object} sessionData - Datos completos de la sesión
     */
    async notifyNewSessionConnected(sessionId, sessionData) {
        // Validar que tenemos un número de teléfono válido
        const phoneNumber = sessionData.phoneNumber || sessionData.connectedUserPhoneNumber;
        if (!phoneNumber) {
            console.error(`[BACKEND NOTIFY] Error: No se puede notificar sesión conectada sin número de teléfono para ${sessionId}`);
            throw new Error(`Sesión ${sessionId} conectada sin número de teléfono válido`);
        }

        const payload = {
            session_id: sessionId,
            phone_number: phoneNumber,
            status: 'connected',
            last_seen: new Date().toISOString(),
            auth_folder_path: sessionData.authFolderPath,
            server_port: sessionData.serverPort || null,
            whatsapp_user_id: sessionData.whatsappUserId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        console.log(`[BACKEND NOTIFY] Notificando nueva sesión conectada:`, payload);

        try {
            // Endpoint para crear nuevo registro completo en whatsapp_sessions
            await this.makeRequest('/api/whatsapp_sessions/new-session-connected', payload);
        } catch (err) {
            console.error(`[BACKEND NOTIFY] Error notificando nueva sesión conectada:`, err);
        }
    }

    /**
     * Obtiene configuración de sesión desde el backend principal
     * 
     * @param {string} sessionId - ID de la sesión
     * @returns {Object|null} Configuración de la sesión
     */
    async getSessionConfig(sessionId) {
        try {
            const result = await this.makeRequest(
                `/api/whatsapp/sessions/${sessionId}/config`,
                {},
                'GET'
            );
            return result.data;
        } catch (err) {
            console.error(`[BACKEND NOTIFY] Error obteniendo configuración:`, err);
            return null;
        }
    }


    /**
     * Ping de health check al backend
     */
    async healthCheck() {
        try {
            const result = await this.makeRequest('/api/health', { service: 'whatsapp-orchestrator' });
            return result.success === true;
        } catch (err) {
            console.error(`[BACKEND NOTIFY] Health check falló:`, err);
            return false;
        }
    }
}

/**
 * Ejemplo de configuración para diferentes entornos
 */
export const createBackendNotifier = (environment = 'development') => {
    const configs = {
        development: {
            backendBaseUrl: 'http://localhost:3000',
            timeout: 30000,
            retries: 2
        },
        production: {
            backendBaseUrl: 'https://api.tudominio.com',
            timeout: 15000,
            retries: 5,
            apiKey: process.env.PRODUCTION_API_KEY
        }
    };

    const config = configs[environment] || configs.development;
    return new BackendNotifier(config);
};

/**
 * Función helper para validar respuestas del backend
 */
export const validateBackendResponse = (response, expectedFields = []) => {
    if (!response || typeof response !== 'object') {
        throw new Error('Respuesta del backend inválida');
    }

    for (const field of expectedFields) {
        if (!(field in response)) {
            throw new Error(`Campo requerido '${field}' faltante en respuesta del backend`);
        }
    }

    return true;
};
