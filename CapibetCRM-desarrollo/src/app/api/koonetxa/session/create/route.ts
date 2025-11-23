import { NextRequest, NextResponse } from 'next/server';

const KOONETXA_BASE_URL = 'https://ws.koonetxa.cloud';
const KOONETXA_API_KEY = process.env.KOONETXA_API_KEY || 'XAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOieyJ0e';

/**
 * POST /api/koonetxa/session/create
 * Crea una nueva sesión de WhatsApp usando Koonetxa API
 */
export async function POST(request: NextRequest) {
    try {
        const { sessionId, webhookUrl } = await request.json();

        if (!sessionId) {
            return NextResponse.json({
                success: false,
                error: 'sessionId es requerido',
            }, { status: 400 });
        }

        // Intentar crear sesión - ajustar endpoint según documentación real
        const response = await fetch(`${KOONETXA_BASE_URL}/api/session/start`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${KOONETXA_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId,
                webhookUrl: webhookUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/koonetxa/webhook`,
            }),
            signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error from Koonetxa:', response.status, errorText);

            return NextResponse.json({
                success: false,
                error: 'Error al crear sesión en Koonetxa',
                details: errorText,
                status: response.status,
            }, { status: response.status });
        }

        const data = await response.json();

        return NextResponse.json({
            success: true,
            data,
        });

    } catch (error) {
        console.error('Error creating Koonetxa session:', error);
        return NextResponse.json({
            success: false,
            error: 'Error interno del servidor',
            details: error instanceof Error ? error.message : 'Error desconocido',
        }, { status: 500 });
    }
}
