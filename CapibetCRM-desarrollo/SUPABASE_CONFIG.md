# 🔐 Configuración de Supabase - CapibetCRM

## Credenciales de Supabase

**URL del Proyecto:**
```
https://yhkmpwvwjyiepqniobmj.supabase.co
```

**Anon Key (Publishable):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inloa21wd3Z3anlpZXBxbmlvYm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIxNTI2NzUsImV4cCI6MjA0NzcyODY3NX0.DsxqizAhVu3Ox7jVO5xYTw_BOPlM_OU
```

**Service Role Key (Secret):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inloa21wd3Z3anlpZXBxbmlvYm1qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjE1MjY3NSwiZXhwIjoyMDQ3NzI4Njc1fQ.4_LfAxpN18_ZrJUX3VXPLw_5_xIOMXC
```

---

## 📋 Configuración de Variables de Entorno

### Paso 1: Crear archivo `.env.local`

Crea un archivo `.env.local` en la raíz del proyecto con el siguiente contenido:

```bash
# ============================================================================
# SUPABASE CONFIGURATION
# ============================================================================
NEXT_PUBLIC_SUPABASE_URL=https://yhkmpwvwjyiepqniobmj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inloa21wd3Z3anlpZXBxbmlvYm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIxNTI2NzUsImV4cCI6MjA0NzcyODY3NX0.DsxqizAhVu3Ox7jVO5xYTw_BOPlM_OU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inloa21wd3Z3anlpZXBxbmlvYm1qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjE1MjY3NSwiZXhwIjoyMDQ3NzI4Njc1fQ.4_LfAxpN18_ZrJUX3VXPLw_5_xIOMXC

# ============================================================================
# API CONFIGURATION
# ============================================================================
NEXT_PUBLIC_API_URL=http://localhost:3000

# ============================================================================
# ORCHESTRATOR URLS
# ============================================================================
WHATSAPP_ORCHESTRATOR_URL=http://localhost:3001
INSTAGRAM_ORCHESTRATOR_URL=http://localhost:3002
FACEBOOK_ORCHESTRATOR_URL=http://localhost:3003
TELEGRAM_ORCHESTRATOR_URL=http://localhost:3004

# ============================================================================
# SECURITY
# ============================================================================
SESSION_SECRET=capibet-super-secret-key-2024
FACEBOOK_VERIFY_TOKEN=capibet-facebook-webhook-token

# ============================================================================
# ENVIRONMENT
# ============================================================================
NODE_ENV=development
```

### Paso 2: Verificar configuración

Ejecuta el siguiente comando para verificar que Next.js puede leer las variables:

```bash
npm run dev
```

---

## 🗄️ Estado de la Base de Datos

### ✅ Ejecutado:
- [x] `database/01_schema.sql` - Schema completo con 24 tablas

### ⏳ Pendiente de Ejecutar:
- [ ] `database/03_deploy_rls.sql` - Políticas RLS y funciones helper
- [ ] `database/04_subscription_plans_seeds.sql` - Planes de suscripción

---

## 🚀 Próximos Pasos

1. **Ejecutar RLS Policies:**
   - Ir a Supabase Dashboard → SQL Editor
   - Copiar contenido de `database/03_deploy_rls.sql`
   - Ejecutar

2. **Ejecutar Seeds de Planes:**
   - En SQL Editor
   - Copiar contenido de `database/04_subscription_plans_seeds.sql`
   - Ejecutar

3. **Crear Super Admin:**
   ```sql
   -- En Supabase SQL Editor
   -- Primero crear usuario en Authentication → Users
   -- Luego ejecutar:
   INSERT INTO usuarios (id, nombre, rol, activo, organizacion_id)
   VALUES (
     'UUID_DEL_USUARIO_AUTH',  -- Reemplazar con UUID real
     'Super Admin',
     'super_admin',
     true,
     NULL
   );
   ```

4. **Verificar:**
   ```sql
   -- Ver funciones creadas
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name IN ('is_super_admin', 'user_organization_id', 'is_admin');
   
   -- Ver planes creados
   SELECT nombre, nombre_display, precio_mensual FROM subscription_plans;
   
   -- Ver super admin
   SELECT id, nombre, rol FROM usuarios WHERE rol = 'super_admin';
   ```

---

## ⚠️ Seguridad

- ✅ `.env.local` está en `.gitignore` (no se subirá a git)
- ✅ Service Role Key solo debe usarse en el backend
- ✅ Anon Key es segura para el frontend (tiene RLS)
- ⚠️ Nunca expongas el Service Role Key en el código del cliente

---

## 📞 Soporte

Si tienes problemas:
1. Verifica que las variables de entorno estén cargadas
2. Reinicia el servidor de desarrollo
3. Revisa la consola del navegador para errores de conexión
