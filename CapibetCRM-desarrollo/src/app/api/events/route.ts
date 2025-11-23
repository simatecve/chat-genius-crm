import { NextRequest } from 'next/server';

// Store para mantener las conexiones SSE activas
const connections = new Set<ReadableStreamDefaultController>();

/**
 * Función para emitir eventos directamente a las conexiones SSE
 * Esta función se exporta para ser usada desde otros módulos
 */
export function broadcastSSEEvent(eventType: string, eventData: any): number {
  console.log(`📡 Intentando emitir evento ${eventType} a ${connections.size} conexiones activas`);
  
  const message = `data: ${JSON.stringify({ 
    type: eventType, 
    data: eventData, 
    timestamp: new Date().toISOString() 
  })}\n\n`;
  
  let sentCount = 0;
  const connectionsToRemove: ReadableStreamDefaultController[] = [];

  for (const controller of connections) {
    try {
      controller.enqueue(message);
      sentCount++;
      console.log(`✅ Evento ${eventType} enviado a una conexión`);
    } catch (error) {
      console.error(`❌ Error enviando evento a conexión:`, error);
      connectionsToRemove.push(controller);
    }
  }

  // Limpiar conexiones cerradas
  connectionsToRemove.forEach(controller => {
    connections.delete(controller);
  });

  console.log(`📊 Evento ${eventType} enviado a ${sentCount} conexiones, ${connectionsToRemove.length} conexiones cerradas eliminadas`);

  return sentCount;
}

/**
 * Obtiene el número de conexiones activas
 */
export function getActiveConnectionsCount(): number {
  return connections.size;
}

/**
 * GET /api/events
 * Endpoint para Server-Sent Events (SSE) para notificaciones en tiempo real
 */
export async function GET(request: NextRequest) {
  // Crear un stream para Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Agregar esta conexión al set de conexiones activas
      connections.add(controller);
      console.log(`🔗 Nueva conexión SSE establecida. Total: ${connections.size}`);
      
        // Enviar evento de conexión inicial
      controller.enqueue(`data: ${JSON.stringify({
        type: 'connected',
        message: 'Conectado al servidor de eventos'
      })}\n\n`);

      // Manejar cierre de conexión
      request.signal.addEventListener('abort', () => {
        connections.delete(controller);
        console.log(`🔌 Conexión SSE cerrada. Total restantes: ${connections.size}`);
        try {
          controller.close();
        } catch (error) {
          // La conexión ya estaba cerrada
        }
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}

/**
 * POST /api/events
 * Endpoint para emitir eventos a todas las conexiones SSE activas
 * Este endpoint está disponible para llamadas externas (ej: desde cURL)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Faltan campos requeridos: type, data'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    const sentCount = broadcastSSEEvent(type, data);

    return new Response(JSON.stringify({
      success: true,
      message: `Evento ${type} enviado a ${sentCount} conexiones`,
      activeConnections: connections.size
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error emitiendo evento SSE:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
