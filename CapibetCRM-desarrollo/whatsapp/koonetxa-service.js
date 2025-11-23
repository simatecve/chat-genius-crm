import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de Koonetxa API
const KOONETXA_CONFIG = {
    baseUrl: 'https://ws.koonetxa.cloud',
    apiKey: 'XAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOieyJ0e',
    timeout: 30000
};

/**
 * Helper para hacer requests a Koonetxa API
 */
async function koonetxaRequest(endpoint, options = {}) {
    const url = `${KOONETXA_CONFIG.baseUrl}${endpoint}`;

    const headers = {
        'Content-Type': 'application/json',
        'X-Api-Key': KOONETXA_CONFIG.apiKey,
        ...options.headers
    };

    console.log(`[KOONETXA] ${options.method || 'GET'} ${url}`);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), KOONETXA_CONFIG.timeout);

        const response = await fetch(url, {
            ...options,
            headers,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok) {
            console.error(`[KOONETXA] Error ${response.status}:`, data);
            throw new Error(`Koonetxa API error: ${response.status} - ${JSON.stringify(data)}`);
        }

        console.log(`[KOONETXA] Success:`, data);
        return data;

    } catch (error) {
        console.error(`[KOONETXA] Request failed:`, error.message);
        throw error;
    }
}

// =============================================================================
// ENDPOINT SIMPLIFICADO: GENERAR QR (Compatible con frontend actual)
// =============================================================================

/**
 * GET /generate-qr - Endpoint simplificado que hace todo el flujo de Koonetxa
 * Este endpoint mantiene compatibilidad con el frontend actual
 */
app.get('/generate-qr', async (req, res) => {
    try {
        console.log('=== GENERANDO QR CON KOONETXA API ===');

        // 1. Crear sesión
        const sessionName = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`Paso 1: Creando sesión ${sessionName}`);

        const createResponse = await koonetxaRequest('/api/sessions', {
            method: 'POST',
            body: JSON.stringify({ name: sessionName })
        });

        console.log(`✅ Sesión creada: ${createResponse.name}`);

        // 2. Iniciar sesión
        console.log(`Paso 2: Iniciando sesión ${sessionName}`);

        const startResponse = await koonetxaRequest(`/api/sessions/${sessionName}/start`, {
            method: 'POST'
        });

        console.log(`✅ Sesión iniciada: ${startResponse.status}`);

        // 3. Esperar un momento para que se genere el QR
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 4. Obtener QR
        console.log(`Paso 3: Obteniendo QR de sesión ${sessionName}`);

        const qrResponse = await koonetxaRequest(`/api/${sessionName}/auth/qr`, {
            method: 'GET'
        });

        console.log(`✅ QR obtenido exitosamente`);

        // Respuesta compatible con el formato actual
        res.json({
            success: true,
            sessionId: sessionName,
            qr: qrResponse.qr,
            qrText: qrResponse.qrText || qrResponse.qr,
            message: 'QR generado. Escanea con WhatsApp para conectar.',
            koonetxaSession: {
                name: sessionName,
                status: qrResponse.status
            }
        });

    } catch (error) {
        console.error('Error al generar QR con Koonetxa:', error);
        res.status(500).json({
            success: false,
            message: 'Error al generar código QR',
            error: error.message
        });
    }
});

// =============================================================================
// ENDPOINTS ESTILO KOONETXA (Acceso directo a la API)
// =============================================================================

/**
 * POST /api/sessions - Crear sesión
 */
app.post('/api/sessions', async (req, res) => {
    try {
        const { name } = req.body;
        const sessionName = name || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const response = await koonetxaRequest('/api/sessions', {
            method: 'POST',
            body: JSON.stringify({ name: sessionName })
        });

        res.json({
            success: true,
            ...response
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating session',
            error: error.message
        });
    }
});

/**
 * POST /api/sessions/:session/start - Iniciar sesión
 */
app.post('/api/sessions/:session/start', async (req, res) => {
    try {
        const { session } = req.params;

        const response = await koonetxaRequest(`/api/sessions/${session}/start`, {
            method: 'POST'
        });

        res.json({
            success: true,
            ...response
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error starting session',
            error: error.message
        });
    }
});

/**
 * GET /api/:session/auth/qr - Obtener QR
 */
app.get('/api/:session/auth/qr', async (req, res) => {
    try {
        const { session } = req.params;

        const response = await koonetxaRequest(`/api/${session}/auth/qr`, {
            method: 'GET'
        });

        res.json({
            success: true,
            ...response
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error getting QR',
            error: error.message
        });
    }
});

/**
 * GET /api/sessions - Listar todas las sesiones
 */
app.get('/api/sessions', async (req, res) => {
    try {
        const response = await koonetxaRequest('/api/sessions', {
            method: 'GET'
        });

        res.json({
            success: true,
            data: response,
            count: Array.isArray(response) ? response.length : 0
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error listing sessions',
            error: error.message
        });
    }
});

/**
 * GET /api/sessions/:session - Obtener estado de sesión
 */
app.get('/api/sessions/:session', async (req, res) => {
    try {
        const { session } = req.params;

        const response = await koonetxaRequest(`/api/sessions/${session}`, {
            method: 'GET'
        });

        res.json({
            success: true,
            data: response
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error getting session',
            error: error.message
        });
    }
});

/**
 * POST /api/sessions/:session/stop - Detener sesión
 */
app.post('/api/sessions/:session/stop', async (req, res) => {
    try {
        const { session } = req.params;

        const response = await koonetxaRequest(`/api/sessions/${session}/stop`, {
            method: 'POST'
        });

        res.json({
            success: true,
            ...response
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error stopping session',
            error: error.message
        });
    }
});

/**
 * DELETE /api/sessions/:session - Eliminar sesión
 */
app.delete('/api/sessions/:session', async (req, res) => {
    try {
        const { session } = req.params;

        const response = await koonetxaRequest(`/api/sessions/${session}`, {
            method: 'DELETE'
        });

        res.json({
            success: true,
            ...response
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting session',
            error: error.message
        });
    }
});

/**
 * POST /api/:session/chats/send - Enviar mensaje
 */
app.post('/api/:session/chats/send', async (req, res) => {
    try {
        const { session } = req.params;
        const messageData = req.body;

        const response = await koonetxaRequest(`/api/${session}/chats/send`, {
            method: 'POST',
            body: JSON.stringify(messageData)
        });

        res.json({
            success: true,
            ...response
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error sending message',
            error: error.message
        });
    }
});

/**
 * POST /sessions/:sessionId/send-message - Endpoint compatible con formato actual
 */
app.post('/sessions/:sessionId/send-message', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { number, message } = req.body;

        if (!number || !message) {
            return res.status(400).json({
                success: false,
                message: 'Número y mensaje son requeridos'
            });
        }

        // Convertir al formato de Koonetxa
        const messageData = {
            chatId: `${number}@s.whatsapp.net`,
            text: message
        };

        const response = await koonetxaRequest(`/api/${sessionId}/chats/send`, {
            method: 'POST',
            body: JSON.stringify(messageData)
        });

        res.json({
            success: true,
            message: 'Mensaje enviado correctamente',
            data: response
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al enviar mensaje',
            error: error.message
        });
    }
});

/**
 * GET /health - Health check
 */
app.get('/health', async (req, res) => {
    try {
        // Intentar hacer ping a Koonetxa API
        const koonetxaHealth = await koonetxaRequest('/api/sessions', {
            method: 'GET'
        }).then(() => true).catch(() => false);

        res.json({
            success: true,
            service: 'Koonetxa WhatsApp Service Proxy',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            koonetxaApi: {
                connected: koonetxaHealth,
                baseUrl: KOONETXA_CONFIG.baseUrl
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Health check failed',
            error: error.message
        });
    }
});

/**
 * GET /sessions - Endpoint compatible con formato actual
 */
app.get('/sessions', async (req, res) => {
    try {
        const response = await koonetxaRequest('/api/sessions', {
            method: 'GET'
        });

        res.json({
            success: true,
            data: response,
            count: Array.isArray(response) ? response.length : 0
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener sesiones',
            error: error.message
        });
    }
});

/**
 * GET /sessions/:sessionId - Endpoint compatible con formato actual
 */
app.get('/sessions/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;

        const response = await koonetxaRequest(`/api/sessions/${sessionId}`, {
            method: 'GET'
        });

        res.json({
            success: true,
            data: response
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            message: 'Sesión no encontrada',
            error: error.message
        });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`=== KOONETXA WHATSAPP SERVICE PROXY ===`);
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log('');
    console.log('=== CONFIGURACIÓN ===');
    console.log(`Koonetxa API: ${KOONETXA_CONFIG.baseUrl}`);
    console.log(`API Key: ${KOONETXA_CONFIG.apiKey.substring(0, 20)}...`);
    console.log('');
    console.log('=== ENDPOINT PRINCIPAL ===');
    console.log(`🎯 Generar QR: GET http://localhost:${PORT}/generate-qr`);
    console.log('');
    console.log('=== ENDPOINTS KOONETXA ===');
    console.log(`📊 Listar sesiones: GET http://localhost:${PORT}/api/sessions`);
    console.log(`➕ Crear sesión: POST http://localhost:${PORT}/api/sessions`);
    console.log(`▶️  Iniciar sesión: POST http://localhost:${PORT}/api/sessions/{session}/start`);
    console.log(`📱 Obtener QR: GET http://localhost:${PORT}/api/{session}/auth/qr`);
    console.log(`💬 Enviar mensaje: POST http://localhost:${PORT}/api/{session}/chats/send`);
    console.log(`⏹️  Detener sesión: POST http://localhost:${PORT}/api/sessions/{session}/stop`);
    console.log(`🗑️  Eliminar sesión: DELETE http://localhost:${PORT}/api/sessions/{session}`);
    console.log('');
    console.log('=== ENDPOINTS COMPATIBLES ===');
    console.log(`📤 Enviar mensaje: POST http://localhost:${PORT}/sessions/{sessionId}/send-message`);
    console.log(`📊 Estado sesión: GET http://localhost:${PORT}/sessions/{sessionId}`);
    console.log('');
    console.log('⚙️  Health Check: http://localhost:${PORT}/health');
    console.log('===================================================');
});
