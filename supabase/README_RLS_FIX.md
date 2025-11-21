# Fix para Error de RLS en Creación de Usuarios

## Problema
Error: "new row violates row-level security policy for table 'profiles'"

## Solución

### 1. Aplicar la migración SQL

Ejecuta el siguiente comando en tu proyecto de Supabase:

```bash
# Si tienes Supabase CLI instalado
supabase db push

# O aplica manualmente el archivo de migración
# Copia el contenido de supabase/migrations/20240101000000_fix_profiles_rls.sql
# y ejecútalo en el SQL Editor de tu dashboard de Supabase
```

### 2. Verificar las políticas RLS

En el dashboard de Supabase, ve a:
1. Database > Tables > profiles
2. Verifica que las siguientes políticas estén activas:
   - "Users can view own profile"
   - "Users can update own profile"
   - "Service role can insert profiles"
   - "Service role can update profiles"
   - "Service role can delete profiles"
   - "Admins can manage all profiles"

### 3. Verificar la función RPC

En el SQL Editor, ejecuta:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'create_user_profile';
```

Deberías ver la función `create_user_profile` listada.

### 4. Configurar variables de entorno

Asegúrate de que tu aplicación esté usando la clave `service_role` para operaciones administrativas:

```env
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

### 5. Probar la creación de usuarios

Después de aplicar estos cambios:
1. Reinicia tu aplicación
2. Intenta crear un nuevo usuario desde el panel de administración
3. El error de RLS debería estar resuelto

## Explicación Técnica

El problema ocurría porque:
1. Las políticas RLS estaban bloqueando la inserción directa en la tabla `profiles`
2. La aplicación no tenía permisos suficientes para crear perfiles de otros usuarios

La solución implementa:
1. Una función RPC con `SECURITY DEFINER` que bypassa las políticas RLS
2. Políticas RLS más específicas que permiten operaciones administrativas
3. Uso de `supabase.auth.admin.createUser()` en lugar de `signUp()`

## Troubleshooting

Si el problema persiste:
1. Verifica que las políticas RLS estén aplicadas correctamente
2. Asegúrate de que la función RPC esté creada
3. Verifica que estés usando las credenciales correctas de Supabase
4. Revisa los logs de Supabase para más detalles del error