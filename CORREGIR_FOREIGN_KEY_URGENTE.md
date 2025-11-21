# 🚨 CORRECCIÓN URGENTE - Foreign Key User Subscriptions

## Problema Identificado
La tabla `user_subscriptions` tiene una foreign key que apunta incorrectamente a `auth.users` en lugar de `public.profiles`. Esto causa el error PGRST204 al intentar hacer JOIN con la tabla `profiles`.

## Solución Inmediata

### Paso 1: Acceder al SQL Editor de Supabase
1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. En el menú lateral, haz clic en **"SQL Editor"**
3. Haz clic en **"New query"**

### Paso 2: Ejecutar el Script de Corrección
Copia y pega exactamente este código en el SQL Editor:

```sql
-- Script para corregir la foreign key de user_subscriptions
-- La foreign key actualmente apunta a auth.users pero debe apuntar a public.profiles

-- 1. Eliminar la foreign key existente que apunta a auth.users
ALTER TABLE public.user_subscriptions 
DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_fkey;

-- 2. Crear la nueva foreign key que apunte a public.profiles
ALTER TABLE public.user_subscriptions 
ADD CONSTRAINT user_subscriptions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Verificar que la foreign key se haya creado correctamente
SELECT conname, conrelid::regclass, confrelid::regclass 
FROM pg_constraint 
WHERE conname = 'user_subscriptions_user_id_fkey';
```

### Paso 3: Ejecutar
1. Haz clic en **"Run"** o presiona **Ctrl+Enter**
2. Deberías ver un mensaje de éxito
3. La última consulta SELECT debe mostrar que la foreign key ahora apunta a `public.profiles`

## Resultado Esperado
Después de ejecutar este script:
- ✅ La foreign key `user_subscriptions_user_id_fkey` apuntará a `public.profiles(id)`
- ✅ Las consultas JOIN entre `user_subscriptions` y `profiles` funcionarán correctamente
- ✅ El error PGRST204 desaparecerá
- ✅ El superadmin podrá ver todas las suscripciones con información de usuarios

## ⚠️ Importante
- **EJECUTA ESTE SCRIPT INMEDIATAMENTE** para resolver el problema
- Si hay datos existentes, asegúrate de que todos los `user_id` en `user_subscriptions` existan en `profiles`
- Este cambio es seguro y no afectará datos existentes

---
**Archivo de script:** `fix_foreign_key_user_subscriptions.sql`