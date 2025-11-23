// Supabase Configuration

export const supabaseConfig = {
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  restUrl: `${process.env.SUPABASE_URL}/rest/v1`
};

// API Endpoints
export const apiEndpoints = {
  usuarios: `${supabaseConfig.restUrl}/usuarios`,
  etiquetas: `${supabaseConfig.restUrl}/etiquetas`,
  respuestasRapidas: `${supabaseConfig.restUrl}/respuestas_rapidas`,
  contactos: `${supabaseConfig.restUrl}/contactos`,
  espacios_de_trabajo: `${supabaseConfig.restUrl}/espacios_de_trabajo`,
  embudos: `${supabaseConfig.restUrl}/embudos`,
  canales: `${supabaseConfig.restUrl}/canales`,
  sesiones: `${supabaseConfig.restUrl}/sesiones`,
  mensajes: `${supabaseConfig.restUrl}/mensajes`,
  productos: `${supabaseConfig.restUrl}/productos`,
  ventasFichasDigitales: `${supabaseConfig.restUrl}/ventas_fichas_digitales`
};
