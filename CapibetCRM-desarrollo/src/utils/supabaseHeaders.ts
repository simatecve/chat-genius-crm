import { NextRequest } from 'next/server';
import { supabaseConfig } from '@/config/supabase';

/**
 * Extrae el access_token del header Authorization de la request
 * @param request - NextRequest con el header Authorization
 * @returns El access_token o null si no existe
 */
export function extractAccessToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remover 'Bearer '
}

/**
 * Genera los headers necesarios para peticiones a Supabase REST API
 * Usa el access_token del usuario si está disponible, sino usa el serviceRoleKey
 * 
 * @param request - NextRequest para extraer el token del usuario
 * @param options - Opciones adicionales para los headers
 * @returns HeadersInit para usar en fetch
 */
export function getSupabaseHeaders(
  request: NextRequest | null = null,
  options: {
    preferRepresentation?: boolean;
    additionalHeaders?: Record<string, string>;
  } = {}
): HeadersInit {
  const { preferRepresentation = false, additionalHeaders = {} } = options;
  
  // Intentar extraer el token del usuario
  const userToken = request ? extractAccessToken(request) : null;
  
  // Si hay token del usuario, usarlo. Sino, usar serviceRoleKey (para operaciones internas)
  const authToken = userToken || supabaseConfig.serviceRoleKey;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'apikey': supabaseConfig.anonKey || '',
    'Authorization': `Bearer ${authToken}`,
    ...additionalHeaders
  };
  
  // Agregar header Prefer si se solicita
  if (preferRepresentation) {
    headers['Prefer'] = 'return=representation';
  }
  
  return headers;
}
