import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint proxy para generar QR de WhatsApp
 * Actúa como intermediario entre el cliente y el orquestador de WhatsApp
 */
export async function GET(request: NextRequest) {
  try {
    const orchestratorUrl = process.env.WHATSAPP_ORCHESTRATOR_URL || 'http://localhost:3001';
    const generateQREndpoint = '/generate-qr';

    console.log('🔄 Proxy: Generando QR de WhatsApp...');

    // Hacer la petición al orquestador de WhatsApp
    const response = await fetch(`${orchestratorUrl}${generateQREndpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Timeout de 30 segundos
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      console.error('❌ Error del orquestador:', response.status, response.statusText);
      return NextResponse.json(
        {
          success: false,
          message: `Error del orquestador: ${response.status} ${response.statusText}`
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.success) {
      console.error('❌ Error en respuesta del orquestador:', data.message);
      return NextResponse.json(
        {
          success: false,
          message: data.message || 'Error al generar QR'
        },
        { status: 400 }
      );
    }

    console.log('✅ Proxy: QR generado exitosamente con sessionId:', data.sessionId);

    // Retornar la respuesta del orquestador sin modificaciones
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error en proxy de generación de QR:', error);

    let errorMessage = 'Error desconocido al generar QR';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.name === 'TimeoutError') {
        errorMessage = 'Timeout al generar QR. El orquestador no respondió en tiempo esperado';
        statusCode = 408;
      } else {
        errorMessage = `Error al generar QR: ${error.message}`;
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: errorMessage
      },
      { status: statusCode }
    );
  }
}
