# SOLUCIÓN INMEDIATA - Error de RLS en user_subscriptions

## Problema Identificado
La tabla `user_subscriptions` no tiene las políticas RLS (Row Level Security) configuradas correctamente, lo que causa:
- Error al crear suscripciones (se guardan pero muestran error)
- Error al cargar la lista de suscripciones
- Errores 400 en la consola del navegador

## Solución Inmediata

### Paso 1: Acceder al Dashboard de Supabase
1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Inicia sesión en tu cuenta
3. Selecciona tu proyecto

### Paso 2: Abrir el SQL Editor
1. En el menú lateral, haz clic en "SQL Editor"
2. Haz clic en "New query" para crear una nueva consulta

### Paso 3: Ejecutar el Script de Corrección
1. Copia todo el contenido del archivo `fix_user_subscriptions_rls.sql`
2. Pégalo en el editor SQL
3. Haz clic en "Run" para ejecutar el script

### Paso 4: Verificar la Corrección
Después de ejecutar el script, deberías ver:
- Una tabla con información sobre `user_subscriptions` y `rowsecurity = true`
- Dos políticas creadas:
  - `Allow superadmin full access to user_subscriptions`
  - `Allow users to view own subscriptions`

### Paso 5: Probar la Aplicación
1. Regresa a tu aplicación
2. Intenta crear una nueva suscripción
3. Verifica que la lista de suscripciones se carga correctamente
4. Revisa la consola del navegador para confirmar que no hay errores

## ¿Qué hace este script?

1. **Crea la tabla** `user_subscriptions` si no existe
2. **Agrega índices** para mejor rendimiento
3. **Habilita RLS** en la tabla
4. **Elimina políticas antiguas** que puedan estar causando conflictos
5. **Crea nuevas políticas**:
   - Superadmins pueden hacer todo (crear, leer, actualizar, eliminar)
   - Usuarios regulares solo pueden ver sus propias suscripciones
6. **Configura trigger** para actualizar automáticamente `updated_at`
7. **Verifica la configuración** mostrando las políticas activas

## Resultado Esperado
Después de aplicar esta solución:
- ✅ Las suscripciones se crearán sin errores
- ✅ La lista de suscripciones se cargará correctamente
- ✅ No habrá errores 400 en la consola
- ✅ Los superadmins podrán gestionar todas las suscripciones
- ✅ Los usuarios regulares podrán ver solo sus suscripciones

## Nota Importante
Este script es seguro de ejecutar múltiples veces. Si ya existen elementos, los recreará correctamente sin duplicados.

---

**¡Ejecuta este script ahora para resolver el problema inmediatamente!**