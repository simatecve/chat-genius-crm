# Configuración de Service Role Key para Operaciones Admin

## Problema
El error "user not allowed" ocurre porque las operaciones administrativas como `createUser`, `updateUserById`, etc., requieren permisos especiales que solo tiene la **service_role key** de Supabase.

## Solución

### Paso 1: Obtener la Service Role Key

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **Settings** → **API**
3. En la sección **Project API keys**, encontrarás:
   - `anon public` (ya configurada)
   - `service_role` ⚠️ **ESTA ES LA QUE NECESITAS**

### Paso 2: Configurar la Variable de Entorno

1. Abre el archivo `.env` en la raíz del proyecto
2. Reemplaza `TU_SERVICE_ROLE_KEY_AQUI` con tu service_role key real:

```env
VITE_SUPABASE_PROJECT_ID="qgdlrplbtgvkhjelqtio"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_SUPABASE_URL="https://qgdlrplbtgvkhjelqtio.supabase.co"
VITE_SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnZGxycGxidGd2a2hqZWxxdGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQxNDU3MSwiZXhwIjoyMDY5OTkwNTcxfQ.TU_SERVICE_ROLE_KEY_REAL"
```

### Paso 3: Reiniciar el Servidor de Desarrollo

```bash
npm run dev
```

## ⚠️ Importante - Seguridad

- **NUNCA** compartas tu service_role key públicamente
- **NUNCA** la subas a repositorios públicos
- Esta key tiene permisos completos sobre tu base de datos
- Solo úsala en el lado del servidor o en aplicaciones admin seguras

## Verificación

Después de configurar correctamente:

1. Ve a la página de **Administrar Usuarios**
2. Intenta crear un nuevo usuario
3. El error "user not allowed" debería desaparecer

## Cambios Realizados en el Código

### `src/integrations/supabase/client.ts`
- Se agregó un cliente admin separado (`supabaseAdmin`)
- Se configuró para usar la service_role key

### `src/pages/admin/AdminUsers.tsx`
- Se actualizó para usar `supabaseAdmin` en operaciones administrativas
- Se agregaron validaciones para verificar que la service_role key esté configurada

## Troubleshooting

Si sigues teniendo problemas:

1. **Verifica que la service_role key sea correcta**
2. **Asegúrate de haber reiniciado el servidor**
3. **Verifica que las políticas RLS estén aplicadas** (ver `INSTRUCCIONES_SOLUCION_RLS.md`)
4. **Revisa la consola del navegador** para errores adicionales