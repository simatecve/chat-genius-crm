import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware de autenticación para API Routes
 * 
 * Valida que todas las peticiones a /api/* incluyan un token válido
 * en el header Authorization Bearer, excepto rutas públicas.
 */

// Rutas públicas que NO requieren autenticación
const PUBLIC_ROUTES = [
  '/api/usuarios/login',
  '/api/usuarios/register',
  '/api/usuarios/refresh-token',
  '/api/whatsapp/messages', // Webhook de WhatsApp
];

/**
 * Verifica si una ruta es pública
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Extrae el token del header Authorization
 */
function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return null;
  }
  
  // Formato esperado: "Bearer <token>"
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Valida el token con Supabase Auth
 */
async function validateToken(token: string): Promise<boolean> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase credentials not configured');
      return false;
    }
    
    // Verificar el token con Supabase Auth
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseAnonKey
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
}

/**
 * Middleware principal
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Solo aplicar middleware a rutas de API
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // Permitir rutas públicas
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }
  
  // Extraer token del header
  const token = extractToken(request);
  
  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: 'No se proporcionó token de autenticación',
        message: 'Se requiere Authorization Bearer token'
      },
      { status: 401 }
    );
  }
  
  // Validar token
  const isValid = await validateToken(token);
  
  if (!isValid) {
    return NextResponse.json(
      {
        success: false,
        error: 'Token inválido o expirado',
        message: 'El token proporcionado no es válido'
      },
      { status: 401 }
    );
  }
  
  // Token válido, continuar con la petición
  return NextResponse.next();
}

/**
 * Configuración del middleware
 * Define en qué rutas se ejecuta
 */
export const config = {
  matcher: '/api/:path*'
};

