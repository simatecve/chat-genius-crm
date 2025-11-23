import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint de prueba para verificar la conexión con Koonetxa API
 */
export async function GET(request: NextRequest) {
    try {
        const baseUrl = 'https://ws.koonetxa.cloud';
        const apiKey = 'XAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOieyJ0e';

        // Intentar varios endpoints comunes para descubrir la estructura de la API
        const endpoints = [
            '/health',
            '/api/health',
            '/status',
            '/sessions',
            '/api/sessions',
            '/auth/session',
            '/api/auth/session',
        ];

        const results = [];

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(`${baseUrl}${endpoint}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    signal: AbortSignal.timeout(5000),
                });

                results.push({
                    endpoint,
                    status: response.status,
                    statusText: response.statusText,
                    ok: response.ok,
                });
            } catch (error) {
                results.push({
                    endpoint,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        return NextResponse.json({
            success: true,
            baseUrl,
            results,
            message: 'Prueba de endpoints completada',
        });

    } catch (error) {
        console.error('Error testing Koonetxa API:', error);
        return NextResponse.json({
            success: false,
            error: 'Error al probar la API',
            details: error instanceof Error ? error.message : 'Error desconocido',
        }, { status: 500 });
    }
}
