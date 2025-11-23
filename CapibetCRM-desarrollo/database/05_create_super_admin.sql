-- ============================================================================
-- CREAR PRIMER SUPER ADMIN
-- ============================================================================
-- IMPORTANTE: Primero debes crear el usuario en Supabase Authentication
-- Luego ejecuta este script con el UUID del usuario creado
-- ============================================================================

-- ============================================================================
-- PASO 1: Crear usuario en Supabase Auth
-- ============================================================================
-- 1. Ir a Supabase Dashboard → Authentication → Users
-- 2. Click "Add user" → "Create new user"
-- 3. Email: admin@capibet.com (o el que prefieras)
-- 4. Password: (elige una contraseña segura)
-- 5. Copiar el UUID del usuario creado

-- ============================================================================
-- PASO 2: Insertar Super Admin en tabla usuarios
-- ============================================================================
-- REEMPLAZA 'UUID_DEL_USUARIO_AUTH' con el UUID real del paso 1

INSERT INTO usuarios (
  id,
  nombre,
  email,
  rol,
  activo,
  organizacion_id,
  creado_en
) VALUES (
  'UUID_DEL_USUARIO_AUTH',  -- ⚠️ REEMPLAZAR CON UUID REAL
  'Super Admin',
  'admin@capibet.com',      -- ⚠️ REEMPLAZAR CON EMAIL REAL
  'super_admin',
  true,
  NULL,                      -- Super admin no pertenece a ninguna organización
  NOW()
);

-- ============================================================================
-- PASO 3: Verificar Super Admin creado
-- ============================================================================

SELECT 
  id,
  nombre,
  email,
  rol,
  activo,
  organizacion_id,
  creado_en
FROM usuarios
WHERE rol = 'super_admin';

-- ============================================================================
-- PASO 4: Verificar que puede ver todas las organizaciones (RLS)
-- ============================================================================

-- Esto debería retornar todas las organizaciones si RLS funciona correctamente
SELECT COUNT(*) as total_organizaciones FROM organizaciones;

-- ============================================================================
-- PASO 5: Verificar planes de suscripción
-- ============================================================================

SELECT 
  nombre,
  nombre_display,
  precio_mensual,
  max_usuarios,
  max_contactos,
  max_mensajes_mes,
  activo
FROM subscription_plans
ORDER BY orden;

-- Debería mostrar 4 planes: free, starter, pro, enterprise

-- ============================================================================
-- PASO 6: Crear organización de prueba (OPCIONAL)
-- ============================================================================

INSERT INTO organizaciones (
  nombre,
  estado,
  fecha_registro,
  onboarding_completado
) VALUES (
  'Organización Demo',
  'active',
  NOW(),
  false
) RETURNING id, nombre, estado;

-- ============================================================================
-- PASO 7: Asignar plan a organización de prueba (OPCIONAL)
-- ============================================================================

-- REEMPLAZA 'UUID_ORGANIZACION' con el UUID retornado en el paso 6

INSERT INTO organization_subscriptions (
  organizacion_id,
  plan_id,
  estado,
  fecha_inicio
) VALUES (
  'UUID_ORGANIZACION',  -- ⚠️ REEMPLAZAR
  (SELECT id FROM subscription_plans WHERE nombre = 'free'),
  'active',
  NOW()
) RETURNING id, organizacion_id, plan_id, estado;

-- ============================================================================
-- PASO 8: Crear usuario admin de prueba en la organización (OPCIONAL)
-- ============================================================================

-- Primero crear en Supabase Auth, luego:

INSERT INTO usuarios (
  id,
  nombre,
  email,
  rol,
  activo,
  organizacion_id
) VALUES (
  'UUID_USUARIO_ADMIN',     -- ⚠️ REEMPLAZAR con UUID de Supabase Auth
  'Admin Demo',
  'admin@demo.com',         -- ⚠️ REEMPLAZAR
  'admin',
  true,
  'UUID_ORGANIZACION'       -- ⚠️ REEMPLAZAR
);

-- ============================================================================
-- PASO 9: Asignar permisos por defecto al admin (OPCIONAL)
-- ============================================================================

INSERT INTO user_permissions (
  usuario_id,
  puede_ver_dashboard,
  puede_ver_contactos,
  puede_crear_contactos,
  puede_editar_contactos,
  puede_ver_chats,
  puede_enviar_mensajes,
  puede_ver_embudos,
  puede_crear_embudos,
  puede_ver_ventas,
  puede_crear_ventas,
  puede_ver_tareas,
  puede_crear_tareas,
  puede_gestionar_usuarios,
  puede_ver_configuracion,
  puede_editar_configuracion,
  puede_gestionar_whatsapp
) VALUES (
  'UUID_USUARIO_ADMIN',  -- ⚠️ REEMPLAZAR
  true,  -- dashboard
  true,  -- ver contactos
  true,  -- crear contactos
  true,  -- editar contactos
  true,  -- ver chats
  true,  -- enviar mensajes
  true,  -- ver embudos
  true,  -- crear embudos
  true,  -- ver ventas
  true,  -- crear ventas
  true,  -- ver tareas
  true,  -- crear tareas
  true,  -- gestionar usuarios
  true,  -- ver configuración
  true,  -- editar configuración
  true   -- gestionar whatsapp
);

-- ============================================================================
-- VERIFICACIONES FINALES
-- ============================================================================

-- Ver todos los usuarios
SELECT id, nombre, email, rol, organizacion_id FROM usuarios;

-- Ver todas las organizaciones
SELECT id, nombre, estado, fecha_registro FROM organizaciones;

-- Ver suscripciones activas
SELECT 
  os.id,
  o.nombre as organizacion,
  sp.nombre_display as plan,
  os.estado,
  os.fecha_inicio
FROM organization_subscriptions os
JOIN organizaciones o ON o.id = os.organizacion_id
JOIN subscription_plans sp ON sp.id = os.plan_id;

-- Ver permisos de usuarios
SELECT 
  u.nombre,
  u.email,
  u.rol,
  up.puede_gestionar_usuarios,
  up.puede_ver_configuracion
FROM usuarios u
LEFT JOIN user_permissions up ON up.usuario_id = u.id;

-- ============================================================================
-- VERIFICAR FUNCIONES RLS
-- ============================================================================

-- Verificar que las funciones helper existen
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('is_super_admin', 'user_organization_id', 'is_admin')
ORDER BY routine_name;

-- Verificar que RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'usuarios', 'organizaciones', 'subscription_plans', 
    'organization_subscriptions', 'user_permissions'
  )
ORDER BY tablename;

-- Contar políticas por tabla
SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ============================================================================
-- ✅ DEPLOYMENT COMPLETADO
-- ============================================================================
