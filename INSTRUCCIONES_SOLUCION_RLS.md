# 🔧 Solución para Error de Creación de Usuarios

## ❌ Problema Identificado
**Error:** "new row violates row-level security policy for table 'profiles'"

## ✅ Solución Implementada

He modificado el código y creado los archivos necesarios para resolver este problema. Ahora necesitas aplicar la migración en tu base de datos de Supabase.

## 📋 Pasos para Aplicar la Solución

### 1. Acceder al Dashboard de Supabase
1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto: `qgdlrplbtgvkhjelqtio`
3. Ve a la sección **SQL Editor**

### 2. Ejecutar la Migración SQL
1. En el SQL Editor, crea una nueva consulta
2. Copia y pega el contenido completo del archivo:
   `supabase/migrations/20240101000000_fix_profiles_rls.sql`
3. Ejecuta la consulta haciendo clic en **Run**

### 3. Verificar que la Función RPC se Creó
Ejecuta esta consulta para verificar:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'create_user_profile';
```

### 4. Verificar las Políticas RLS
1. Ve a **Database** > **Tables** > **profiles**
2. Haz clic en la pestaña **RLS Policies**
3. Deberías ver las siguientes políticas activas:
   - "Users can view own profile"
   - "Users can update own profile"
   - "Service role can insert profiles"
   - "Service role can update profiles"
   - "Service role can delete profiles"
   - "Admins can manage all profiles"
   - "Superadmin can insert profiles"
   - "Superadmin can manage all profiles"

### 5. Probar la Creación de Usuarios
1. Regresa a tu aplicación
2. Ve al panel de administración de usuarios
3. Intenta crear un nuevo usuario
4. El error debería estar resuelto

## 🔍 Cambios Realizados en el Código

### Archivo Modificado: `AdminUsers.tsx`
- ✅ Cambié `supabase.auth.signUp()` por `supabase.auth.admin.createUser()`
- ✅ Agregué manejo de errores con función RPC de respaldo
- ✅ Mejoré el tiempo de espera para la creación del perfil
- ✅ Agregué auto-confirmación de email

### Archivos Creados:
- ✅ `supabase/migrations/20240101000000_fix_profiles_rls.sql` - Migración principal
- ✅ `supabase/functions/create_user_profile.sql` - Función RPC
- ✅ `supabase/README_RLS_FIX.md` - Documentación técnica

## 🚨 Importante

**Debes aplicar la migración SQL antes de probar la creación de usuarios.** Sin la migración, el error persistirá.

## 📞 Si Necesitas Ayuda

Si encuentras algún problema:
1. Verifica que ejecutaste toda la migración SQL
2. Asegúrate de que las políticas RLS estén activas
3. Revisa los logs en el dashboard de Supabase
4. Verifica que la función `create_user_profile` existe

---

**Una vez aplicada la migración, tu sistema de creación de usuarios debería funcionar correctamente.** ✨