import { NextResponse } from 'next/server';

/**
 * Headers básicos para las respuestas HTTP
 */
function getResponseHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json'
  };
}

/**
 * Maneja las respuestas exitosas de la API
 */
export function handleSuccess<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    {
      status,
      headers: getResponseHeaders(),
    }
  );
}

/**
 * Maneja los errores de la API
 */
export function handleError(
  error: string, 
  status: number = 500, 
  details?: string
): NextResponse {
  console.error(`API Error [${status}]:`, error, details ? `- ${details}` : '');
  
  return NextResponse.json(
    {
      success: false,
      error,
      details,
    },
    {
      status,
      headers: getResponseHeaders(),
    }
  );
}

/**
 * Maneja las respuestas de validación
 */
export function handleValidationError(message: string): NextResponse {
  return handleError(message, 400);
}

/**
 * Maneja las respuestas cuando no se encuentra el recurso
 */
export function handleNotFound(resource: string = 'Recurso'): NextResponse {
  return handleError(`${resource} no encontrado`, 404);
}

/**
 * Maneja las respuestas para métodos no permitidos
 */
export function handleMethodNotAllowed(): NextResponse {
  return handleError('Método no permitido', 405);
}

/**
 * Maneja la respuesta de fetch a Supabase
 */
export const handleResponse = async (response: Response): Promise<Record<string, unknown> | null> => {
  let data = null;
  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    const responseText = await response.text();
    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { message: 'Operation completed successfully' };
      }
    } else {
      data = { message: 'Operation completed successfully' };
    }
  } else {
    data = { message: 'Operation completed successfully' };
  }
  
  return data;
};