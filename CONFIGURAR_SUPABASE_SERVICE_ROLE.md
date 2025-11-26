# Configuración del Service Role Key de Supabase

## ⚠️ IMPORTANTE: Error "Invalid API Key"

Si ves el error **"Invalid API key"** al crear usuarios, es porque el `service_role_key` no está configurado correctamente.

## Problema Identificado

El archivo `.env` actual tiene un `service_role_key` de un proyecto diferente de Supabase. Necesitas usar el key correcto para tu proyecto actual.

**Tu proyecto actual es:** `pxvembsxhwvpotydtiqa`

## Solución: Obtener el Service Role Key Correcto

### Paso 1: Acceder a tu Dashboard de Supabase

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard/project/pxvembsxhwvpotydtiqa)
2. Asegúrate de estar en el proyecto correcto: **pxvembsxhwvpotydtiqa**

### Paso 2: Obtener el Service Role Key

1. En el menú lateral, ve a **Settings** ⚙️
2. Haz clic en **API**
3. En la sección **Project API keys**, encontrarás dos keys:
   - `anon` / `public` - Esta ya está configurada ✅
   - `service_role` - **ESTA ES LA QUE NECESITAS** ⚠️

4. Copia el valor completo del **service_role key**

### Paso 3: Actualizar la Variable de Entorno

1. Abre el archivo `.env.local` en la raíz del proyecto
2. Reemplaza el valor de `VITE_SUPABASE_SERVICE_ROLE_KEY` con el key que copiaste:

```env
VITE_SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4dmVtYnN4aHd2cG90eWR0aXFhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzA1OTQzNywiZXhwIjoyMDUyNjM1NDM3fQ.TU_SERVICE_ROLE_KEY_AQUI"
```

### Paso 4: Reiniciar la Aplicación

1. Detén el servidor (Ctrl + C)
2. Vuelve a iniciar: `npm run dev`
3. Intenta crear un usuario nuevamente

## ⚠️ Seguridad Importante

- **NUNCA** compartas tu `service_role_key` públicamente
- **NUNCA** lo subas a repositorios públicos de GitHub
- El archivo `.env.local` está en `.gitignore` para protegerlo
- Este key tiene permisos de administrador total sobre tu base de datos

## Verificación

Para verificar que todo funciona:

1. Ve a **Dashboard → Configuración → Usuarios**
2. Haz clic en **+ Nuevo Usuario**
3. Completa el formulario
4. Si está configurado correctamente, el usuario se creará sin errores

## Si Sigues Teniendo Problemas

Verifica que:

1. El `service_role_key` es del proyecto correcto (`pxvembsxhwvpotydtiqa`)
2. Copiaste el key completo (empieza con `eyJ...`)
3. No hay espacios antes o después del key
4. Reiniciaste la aplicación después del cambio
5. El proyecto de Supabase está activo y funcionando

## Proyectos de Supabase

- **Proyecto actual:** pxvembsxhwvpotydtiqa
- **URL:** https://pxvembsxhwvpotydtiqa.supabase.co

Si tienes múltiples proyectos, asegúrate de estar usando las credenciales del proyecto correcto.
