import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Configuración de Koonetxa
const KOONETXA_BASE_URL = 'https://ws.koonetxa.cloud';
const KOONETXA_API_KEY = 'XAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOieyJ0e';

// Helper para hacer requests a Koonetxa
async function koonetxaFetch(endpoint, options = {}) {
    const url = `${KOONETXA_BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        'X-Api-Key': KOONETXA_API_KEY,
        ...options.headers
    };

    console.log(`[KOONETXA] ${options.method || 'GET'} ${url}`);

    const response = await fetch(url, {
        ...options,
        headers
    });

    const data = await response.json();

    if (!response.ok) {
        console.error(`[KOONETXA] Error:`, data);
        throw new Error(JSON.stringify(data));
    }

    console.log(`[KOONETXA] Success:`, data);
    return data;
}

// ENDPOINT PRINCIPAL: Generar QR (compatible con frontend actual)
app.get('/generate-qr', async (req, res) => {
    try {
        console.log('=== GENERANDO QR CON KOONETXA ===');

        const sessionName = `session_${Date.now()}`;

        // 1. Crear sesión
        console.log('1. Creando sesión...');
        await koonetxaFetch('/api/sessions', {
            method: 'POST',
            body: JSON.stringify({ name: sessionName })
        });

        // 2. Iniciar sesión
        console.log('2. Iniciando sesión...');
        await koonetxaFetch(`/api/sessions/${sessionName}/start`, {
            method: 'POST'
        });

        // 3. Esperar y obtener QR
        console.log('3. Esperando QR...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        const qrData = await koonetxaFetch(`/api/${sessionName}/auth/qr`);

        console.log('✅ QR generado exitosamente');

        res.json({
            success: true,
            sessionId: sessionName,
            qr: qrData.qr,
            qrText: qrData.qr,
            message: 'QR generado con Koonetxa API'
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al generar QR',
            error: error.message
        });
    }
});

// Listar sesiones
app.get('/sessions', async (req, res) => {
    try {
        const sessions = await koonetxaFetch('/api/sessions');
        res.json({
            success: true,
            data: sessions,
            count: sessions.length || 0
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Obtener sesión específica
app.get('/sessions/:sessionId', async (req, res) => {
    try {
        const session = await koonetxaFetch(`/api/sessions/${req.params.sessionId}`);
        res.json({
            success: true,
            data: session
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            error: error.message
        });
    }
});

// Enviar mensaje
app.post('/sessions/:sessionId/send-message', async (req, res) => {
    try {
        const { number, message } = req.body;

        const result = await koonetxaFetch(`/api/${req.params.sessionId}/chats/send`, {
            method: 'POST',
            body: JSON.stringify({
                chatId: `${number}@s.whatsapp.net`,
                text: message
            })
        });

        res.json({
            success: true,
            message: 'Mensaje enviado',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check
app.get('/health', async (req, res) => {
    try {
        await koonetxaFetch('/api/sessions');
        res.json({
            success: true,
            service: 'Koonetxa WhatsApp Proxy',
            koonetxaApi: KOONETXA_BASE_URL,
            status: 'connected'
        });
    } catch (error) {
        res.json({
            success: false,
            service: 'Koonetxa WhatsApp Proxy',
            status: 'error',
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('🚀 KOONETXA WHATSAPP PROXY INICIADO');
    console.log('='.repeat(60));
    console.log(`Puerto: ${PORT}`);
    console.log(`Koonetxa API: ${KOONETXA_BASE_URL}`);
    console.log('');
    console.log('📋 ENDPOINTS DISPONIBLES:');
    console.log(`  GET  /generate-qr - Generar QR`);
    console.log(`  GET  /sessions - Listar sesiones`);
    console.log(`  GET  /sessions/:id - Ver sesión`);
    console.log(`  POST /sessions/:id/send-message - Enviar mensaje`);
    console.log(`  GET  /health - Health check`);
    console.log('='.repeat(60));
});
