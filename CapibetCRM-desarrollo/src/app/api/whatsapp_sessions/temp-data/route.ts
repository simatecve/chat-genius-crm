import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Directorio temporal para almacenar archivos JSON
const TEMP_DIR = path.join(process.cwd(), 'temp-sessions');

/**
 * Asegurar que el directorio temporal existe
 */
async function ensureTempDir() {
  try {
    await fs.access(TEMP_DIR);
  } catch {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  }
}

/**
 * POST /api/whatsapp_sessions/temp-data
 * Almacena temporalmente los datos del formulario asociados a un sessionId
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, data } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'sessionId es requerido'
      }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json({
        success: false,
        error: 'data es requerido'
      }, { status: 400 });
    }

    await ensureTempDir();

    const tempData = {
      ...data,
      timestamp: Date.now()
    };

    const filePath = path.join(TEMP_DIR, `${sessionId}.json`);
    await fs.writeFile(filePath, JSON.stringify(tempData, null, 2));

    // Cleanup automático después de 10 minutos
    setTimeout(async () => {
      try {
        await fs.unlink(filePath);
      } catch {
        // Ignorar si el archivo ya no existe
      }
    }, 600000); // 10 minutos

    console.log('📝 Datos temporales almacenados para sessionId:', sessionId);

    return NextResponse.json({
      success: true,
      message: 'Datos almacenados temporalmente'
    });

  } catch (error) {
    console.error('Error storing temp data:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

/**
 * GET /api/whatsapp_sessions/temp-data?sessionId=xxx
 * Recupera los datos temporales del formulario
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'sessionId es requerido'
      }, { status: 400 });
    }

    const filePath = path.join(TEMP_DIR, `${sessionId}.json`);
    
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(fileContent);
      
      // Verificar si los datos no han expirado (10 minutos)
      if (Date.now() - data.timestamp > 600000) {
        // Eliminar archivo expirado
        await fs.unlink(filePath);
        return NextResponse.json({
          success: false,
          error: 'Datos temporales expirados'
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data
      });

    } catch {
      // Archivo no encontrado o error de lectura
      return NextResponse.json({
        success: false,
        error: 'Datos temporales no encontrados o expirados'
      }, { status: 404 });
    }

  } catch (error) {
    console.error('Error retrieving temp data:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/whatsapp_sessions/temp-data?sessionId=xxx
 * Elimina los datos temporales del formulario
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'sessionId es requerido'
      }, { status: 400 });
    }

    const filePath = path.join(TEMP_DIR, `${sessionId}.json`);
    
    try {
      await fs.unlink(filePath);
      return NextResponse.json({
        success: true,
        message: 'Datos eliminados'
      });
    } catch {
      // Archivo no encontrado
      return NextResponse.json({
        success: true,
        message: 'Datos no encontrados'
      });
    }

  } catch (error) {
    console.error('Error deleting temp data:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
