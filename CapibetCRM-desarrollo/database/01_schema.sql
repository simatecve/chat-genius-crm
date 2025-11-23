# ============================================================================
# CAPIBET CRM - SCHEMA COMPLETO DE BASE DE DATOS
# ============================================================================
# Versión: 1.0.0
# Descripción: Schema completo para CRM multicanal con WhatsApp
# ============================================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para búsquedas de texto

-- ============================================================================
-- TIPOS ENUMERADOS (ENUMS)
-- ============================================================================

-- Estados de sesión
CREATE TYPE session_status AS ENUM ('activo', 'desconectado', 'expirado');

-- Tipos de canales de comunicación
CREATE TYPE channel_type AS ENUM (
  'whatsapp_qr', 
  'whatsapp_api', 
  'messenger', 
  'instagram', 
  'telegram', 
  'telegram_bot', 
  'gmail', 
  'outlook',
  'web_chat'
);

-- Estados de sesión de WhatsApp
CREATE TYPE whatsapp_session_status AS ENUM ('connected', 'disconnected', 'expired', 'pending');

-- Tipos de notificación
CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error');

-- Roles de usuario
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'agente', 'supervisor', 'viewer');

-- ============================================================================
-- TABLA: organizaciones
-- Organizaciones/empresas que usan el CRM
-- ============================================================================
CREATE TABLE organizaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  website TEXT,
  logo TEXT,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_organizaciones_nombre ON organizaciones(nombre);

-- ============================================================================
-- TABLA: usuarios
-- Usuarios del sistema (agentes, administradores)
-- Vinculados con Supabase Auth
-- ============================================================================
CREATE TABLE usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  telefono TEXT,
  codigo_pais TEXT DEFAULT '+57',
  rol user_role DEFAULT 'agente',
  activo BOOLEAN DEFAULT true,
  organizacion_id UUID REFERENCES organizaciones(id) ON DELETE CASCADE,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_usuarios_organizacion ON usuarios(organizacion_id);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_usuarios_activo ON usuarios(activo);

-- ============================================================================
-- TABLA: espacios_de_trabajo
-- Espacios de trabajo para organizar embudos
-- ============================================================================
CREATE TABLE espacios_de_trabajo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  organizacion_id UUID REFERENCES organizaciones(id) ON DELETE CASCADE,
  orden BIGINT DEFAULT 0,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_espacios_organizacion ON espacios_de_trabajo(organizacion_id);
CREATE INDEX idx_espacios_orden ON espacios_de_trabajo(orden);

-- ============================================================================
-- TABLA: embudos
-- Embudos de ventas / pipelines
-- ============================================================================
CREATE TABLE embudos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  espacio_id UUID REFERENCES espacios_de_trabajo(id) ON DELETE CASCADE,
  orden BIGINT DEFAULT 0,
  color TEXT DEFAULT '#3B82F6',
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_embudos_espacio ON embudos(espacio_id);
CREATE INDEX idx_embudos_orden ON embudos(orden);

-- ============================================================================
-- TABLA: contactos
-- Contactos/clientes del CRM
-- ============================================================================
CREATE TABLE contactos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  apellido TEXT,
  nombre_completo TEXT GENERATED ALWAYS AS (nombre || ' ' || COALESCE(apellido, '')) STORED,
  correo TEXT,
  telefono TEXT,
  whatsapp_jid TEXT, -- JID de WhatsApp para casos especiales (@lid)
  notas TEXT,
  direccion TEXT,
  cumpleaños DATE,
  sitio_web TEXT,
  genero TEXT,
  fecha_cumpleaños DATE,
  origen TEXT, -- De dónde vino el contacto
  creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  agente UUID REFERENCES usuarios(id) ON DELETE SET NULL, -- Agente asignado
  organizacion_id UUID REFERENCES organizaciones(id) ON DELETE CASCADE,
  etiquetas TEXT[], -- Array de etiquetas
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_contactos_organizacion ON contactos(organizacion_id);
CREATE INDEX idx_contactos_telefono ON contactos(telefono);
CREATE INDEX idx_contactos_whatsapp_jid ON contactos(whatsapp_jid);
CREATE INDEX idx_contactos_nombre ON contactos USING gin(nombre gin_trgm_ops);
CREATE INDEX idx_contactos_correo ON contactos(correo);
CREATE INDEX idx_contactos_agente ON contactos(agente);
CREATE INDEX idx_contactos_etiquetas ON contactos USING gin(etiquetas);

-- ============================================================================
-- TABLA: sesiones
-- Sesiones de canales de comunicación
-- ============================================================================
CREATE TABLE sesiones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  estado session_status DEFAULT 'desconectado',
  type channel_type NOT NULL,
  embudo_id UUID REFERENCES embudos(id) ON DELETE SET NULL,
  organizacion_id UUID REFERENCES organizaciones(id) ON DELETE CASCADE,
  description TEXT,
  email TEXT, -- Para sesiones de email
  given_name TEXT,
  picture TEXT,
  whatsapp_session INTEGER, -- FK a whatsapp_sessions (se agregará después)
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_sesiones_usuario ON sesiones(usuario_id);
CREATE INDEX idx_sesiones_organizacion ON sesiones(organizacion_id);
CREATE INDEX idx_sesiones_type ON sesiones(type);
CREATE INDEX idx_sesiones_estado ON sesiones(estado);

-- ============================================================================
-- TABLA: whatsapp_sessions
-- Sesiones específicas de WhatsApp (Baileys.js)
-- ============================================================================
CREATE TABLE whatsapp_sessions (
  id SERIAL PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL, -- UUID del orquestador
  sesion_id UUID REFERENCES sesiones(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  status whatsapp_session_status DEFAULT 'pending',
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL,
  auth_folder_path TEXT NOT NULL,
  server_port INTEGER,
  whatsapp_user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_whatsapp_sessions_session_id ON whatsapp_sessions(session_id);
CREATE INDEX idx_whatsapp_sessions_sesion_id ON whatsapp_sessions(sesion_id);
CREATE INDEX idx_whatsapp_sessions_status ON whatsapp_sessions(status);

-- Actualizar FK en sesiones
ALTER TABLE sesiones 
  ADD CONSTRAINT fk_sesiones_whatsapp 
  FOREIGN KEY (whatsapp_session) 
  REFERENCES whatsapp_sessions(id) 
  ON DELETE SET NULL;

-- ============================================================================
-- TABLA: chats
-- Conversaciones entre sesiones y contactos
-- ============================================================================
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sesion_id UUID REFERENCES sesiones(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contactos(id) ON DELETE CASCADE,
  embudo_id UUID REFERENCES embudos(id) ON DELETE SET NULL,
  nuevos_mensajes BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint único: una sesión solo puede tener un chat con un contacto
  UNIQUE(sesion_id, contact_id)
);

-- Índices
CREATE INDEX idx_chats_sesion ON chats(sesion_id);
CREATE INDEX idx_chats_contact ON chats(contact_id);
CREATE INDEX idx_chats_embudo ON chats(embudo_id);
CREATE INDEX idx_chats_nuevos_mensajes ON chats(nuevos_mensajes) WHERE nuevos_mensajes = true;

-- ============================================================================
-- TABLA: mensajes
-- Mensajes dentro de los chats
-- ============================================================================
CREATE TABLE mensajes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  remitente_id UUID REFERENCES usuarios(id) ON DELETE SET NULL, -- NULL si es del contacto
  contacto_id UUID REFERENCES contactos(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  type channel_type NOT NULL,
  content JSONB NOT NULL, -- Contenido flexible del mensaje
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_mensajes_chat ON mensajes(chat_id);
CREATE INDEX idx_mensajes_contacto ON mensajes(contacto_id);
CREATE INDEX idx_mensajes_remitente ON mensajes(remitente_id);
CREATE INDEX idx_mensajes_creado_en ON mensajes(creado_en DESC);
CREATE INDEX idx_mensajes_content_whatsapp_id ON mensajes USING gin((content->'whatsapp_message_id'));

-- ============================================================================
-- TABLA: etiquetas
-- Etiquetas para clasificar contactos
-- ============================================================================
CREATE TABLE etiquetas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  descripcion TEXT,
  activa BOOLEAN DEFAULT true,
  creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  organizacion_id UUID REFERENCES organizaciones(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_etiquetas_organizacion ON etiquetas(organizacion_id);
CREATE INDEX idx_etiquetas_activa ON etiquetas(activa);

-- ============================================================================
-- TABLA: respuestas_rapidas
-- Respuestas predefinidas para agilizar comunicación
-- ============================================================================
CREATE TABLE respuestas_rapidas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo TEXT NOT NULL,
  contenido TEXT NOT NULL,
  categoria TEXT,
  activa BOOLEAN DEFAULT true,
  creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  organizacion_id UUID REFERENCES organizaciones(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_respuestas_organizacion ON respuestas_rapidas(organizacion_id);
CREATE INDEX idx_respuestas_activa ON respuestas_rapidas(activa);
CREATE INDEX idx_respuestas_categoria ON respuestas_rapidas(categoria);

-- ============================================================================
-- TABLA: plantilla_mensajes
-- Plantillas de mensajes para diferentes canales
-- ============================================================================
CREATE TABLE plantilla_mensajes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  canal channel_type NOT NULL,
  contenido TEXT NOT NULL,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  organizacion_id UUID REFERENCES organizaciones(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_plantilla_mensajes_organizacion ON plantilla_mensajes(organizacion_id);
CREATE INDEX idx_plantilla_mensajes_canal ON plantilla_mensajes(canal);

-- ============================================================================
-- TABLA: tareas
-- Tareas y recordatorios
-- ============================================================================
CREATE TABLE tareas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  prioridad TEXT DEFAULT 'media',
  categoria TEXT,
  fecha TIMESTAMP WITH TIME ZONE,
  creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  asignado UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  organizacion_id UUID REFERENCES organizaciones(id) ON DELETE CASCADE,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_tareas_organizacion ON tareas(organizacion_id);
CREATE INDEX idx_tareas_asignado ON tareas(asignado);
CREATE INDEX idx_tareas_fecha ON tareas(fecha);
CREATE INDEX idx_tareas_prioridad ON tareas(prioridad);

-- ============================================================================
-- TABLA: productos
-- Catálogo de productos
-- ============================================================================
CREATE TABLE productos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  precio NUMERIC(10, 2) NOT NULL,
  stock INTEGER DEFAULT 0,
  descripcion TEXT,
  organizacion_id UUID REFERENCES organizaciones(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_productos_organizacion ON productos(organizacion_id);
CREATE INDEX idx_productos_nombre ON productos USING gin(nombre gin_trgm_ops);

-- ============================================================================
-- TABLA: ventas
-- Registro de ventas
-- ============================================================================
CREATE TABLE ventas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES contactos(id) ON DELETE SET NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  vendedor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  organizacion_id UUID REFERENCES organizaciones(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_ventas_organizacion ON ventas(organizacion_id);
CREATE INDEX idx_ventas_producto ON ventas(producto_id);
CREATE INDEX idx_ventas_cliente ON ventas(cliente_id);
CREATE INDEX idx_ventas_vendedor ON ventas(vendedor_id);
CREATE INDEX idx_ventas_fecha ON ventas(fecha DESC);

-- ============================================================================
-- TABLA: notificaciones
-- Sistema de notificaciones para usuarios
-- ============================================================================
CREATE TABLE notificaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  tipo notification_type DEFAULT 'info',
  prioridad INTEGER DEFAULT 0,
  accion_url TEXT,
  data JSONB,
  leida BOOLEAN DEFAULT false,
  archivada_en TIMESTAMP WITH TIME ZONE,
  enviada_push BOOLEAN DEFAULT false,
  enviada_email BOOLEAN DEFAULT false,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX idx_notificaciones_leida ON notificaciones(leida) WHERE leida = false;
CREATE INDEX idx_notificaciones_tipo ON notificaciones(tipo);
CREATE INDEX idx_notificaciones_creado_en ON notificaciones(creado_en DESC);

-- ============================================================================
-- TRIGGERS PARA ACTUALIZAR updated_at / actualizado_en
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_updated_at_column_english()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar triggers
CREATE TRIGGER update_organizaciones_updated_at BEFORE UPDATE ON organizaciones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_espacios_updated_at BEFORE UPDATE ON espacios_de_trabajo FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_embudos_updated_at BEFORE UPDATE ON embudos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contactos_updated_at BEFORE UPDATE ON contactos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sesiones_updated_at BEFORE UPDATE ON sesiones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_sessions_updated_at BEFORE UPDATE ON whatsapp_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column_english();
CREATE TRIGGER update_plantilla_mensajes_updated_at BEFORE UPDATE ON plantilla_mensajes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tareas_updated_at BEFORE UPDATE ON tareas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notificaciones_updated_at BEFORE UPDATE ON notificaciones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMENTARIOS EN TABLAS
-- ============================================================================

COMMENT ON TABLE organizaciones IS 'Organizaciones/empresas que usan el CRM';
COMMENT ON TABLE usuarios IS 'Usuarios del sistema vinculados con Supabase Auth';
COMMENT ON TABLE espacios_de_trabajo IS 'Espacios de trabajo para organizar embudos';
COMMENT ON TABLE embudos IS 'Embudos de ventas / pipelines';
COMMENT ON TABLE contactos IS 'Contactos/clientes del CRM';
COMMENT ON TABLE sesiones IS 'Sesiones de canales de comunicación';
COMMENT ON TABLE whatsapp_sessions IS 'Sesiones específicas de WhatsApp (Baileys.js)';
COMMENT ON TABLE chats IS 'Conversaciones entre sesiones y contactos';
COMMENT ON TABLE mensajes IS 'Mensajes dentro de los chats';
COMMENT ON TABLE etiquetas IS 'Etiquetas para clasificar contactos';
COMMENT ON TABLE respuestas_rapidas IS 'Respuestas predefinidas';
COMMENT ON TABLE plantilla_mensajes IS 'Plantillas de mensajes para diferentes canales';
COMMENT ON TABLE tareas IS 'Tareas y recordatorios';
COMMENT ON TABLE productos IS 'Catálogo de productos';
COMMENT ON TABLE ventas IS 'Registro de ventas';
COMMENT ON TABLE notificaciones IS 'Sistema de notificaciones para usuarios';

-- ============================================================================
-- SUPER ADMIN SAAS - EXTENSIONES
-- ============================================================================

-- ============================================================================
-- TABLA: subscription_plans
-- Planes de suscripción con límites
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL UNIQUE, -- 'free', 'starter', 'pro', 'enterprise'
  nombre_display TEXT NOT NULL,
  descripcion TEXT,
  
  -- Precios (opcionales, pueden ser $0 para todos)
  precio_mensual NUMERIC(10, 2) DEFAULT 0,
  precio_anual NUMERIC(10, 2) DEFAULT 0,
  
  -- Límites del plan
  max_usuarios INTEGER DEFAULT 1,
  max_contactos INTEGER DEFAULT 100,
  max_mensajes_mes INTEGER DEFAULT 1000,
  max_sesiones_whatsapp INTEGER DEFAULT 1,
  max_sesiones_instagram INTEGER DEFAULT 0,
  max_sesiones_facebook INTEGER DEFAULT 0,
  max_sesiones_telegram INTEGER DEFAULT 0,
  max_espacios_trabajo INTEGER DEFAULT 1,
  max_embudos INTEGER DEFAULT 3,
  max_almacenamiento_mb INTEGER DEFAULT 100,
  
  -- Features habilitados (JSONB para flexibilidad)
  features JSONB DEFAULT '{
    "api_access": false,
    "integraciones": false,
    "reportes_avanzados": false,
    "exportar_datos": false,
    "whitelabel": false,
    "soporte": "email",
    "canales": {
      "whatsapp": true,
      "instagram": false,
      "facebook": false,
      "telegram": false,
      "email": true
    }
  }'::jsonb,
  
  -- Metadata
  activo BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,
  color TEXT DEFAULT '#3B82F6',
  
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_subscription_plans_activo ON subscription_plans(activo);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_orden ON subscription_plans(orden);

-- ============================================================================
-- TABLA: organization_subscriptions
-- Suscripciones de organizaciones
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizacion_id UUID REFERENCES organizaciones(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  
  -- Estado
  estado TEXT DEFAULT 'active', -- 'trial', 'active', 'past_due', 'canceled', 'expired'
  
  -- Fechas
  fecha_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_fin_trial TIMESTAMP WITH TIME ZONE,
  fecha_proximo_pago TIMESTAMP WITH TIME ZONE,
  fecha_cancelacion TIMESTAMP WITH TIME ZONE,
  
  -- Facturación (opcional)
  periodo_facturacion TEXT DEFAULT 'mensual', -- 'mensual', 'anual'
  monto_actual NUMERIC(10, 2),
  proveedor_pago TEXT, -- 'stripe', 'paypal', 'manual', null
  customer_id TEXT,
  subscription_id TEXT,
  
  -- Notas administrativas
  notas TEXT,
  
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(organizacion_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_organizacion ON organization_subscriptions(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_plan ON organization_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_estado ON organization_subscriptions(estado);

-- ============================================================================
-- TABLA: user_permissions
-- Permisos granulares por usuario
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  
  -- Permisos de módulos principales
  puede_ver_dashboard BOOLEAN DEFAULT true,
  
  -- Contactos
  puede_ver_contactos BOOLEAN DEFAULT true,
  puede_crear_contactos BOOLEAN DEFAULT true,
  puede_editar_contactos BOOLEAN DEFAULT true,
  puede_eliminar_contactos BOOLEAN DEFAULT false,
  puede_importar_contactos BOOLEAN DEFAULT false,
  
  -- Chats y Mensajes
  puede_ver_chats BOOLEAN DEFAULT true,
  puede_enviar_mensajes BOOLEAN DEFAULT true,
  puede_ver_mensajes_otros BOOLEAN DEFAULT false,
  puede_eliminar_mensajes BOOLEAN DEFAULT false,
  
  -- Embudos
  puede_ver_embudos BOOLEAN DEFAULT true,
  puede_crear_embudos BOOLEAN DEFAULT false,
  puede_editar_embudos BOOLEAN DEFAULT false,
  puede_eliminar_embudos BOOLEAN DEFAULT false,
  puede_mover_contactos_embudos BOOLEAN DEFAULT true,
  
  -- Ventas
  puede_ver_ventas BOOLEAN DEFAULT true,
  puede_crear_ventas BOOLEAN DEFAULT true,
  puede_editar_ventas BOOLEAN DEFAULT true,
  puede_eliminar_ventas BOOLEAN DEFAULT false,
  
  -- Tareas
  puede_ver_tareas BOOLEAN DEFAULT true,
  puede_crear_tareas BOOLEAN DEFAULT true,
  puede_asignar_tareas BOOLEAN DEFAULT false,
  puede_eliminar_tareas BOOLEAN DEFAULT false,
  
  -- Reportes y Datos
  puede_ver_reportes BOOLEAN DEFAULT true,
  puede_exportar_datos BOOLEAN DEFAULT false,
  puede_ver_analytics BOOLEAN DEFAULT false,
  
  -- Configuración
  puede_gestionar_usuarios BOOLEAN DEFAULT false,
  puede_ver_configuracion BOOLEAN DEFAULT false,
  puede_editar_configuracion BOOLEAN DEFAULT false,
  puede_gestionar_plantillas BOOLEAN DEFAULT false,
  puede_gestionar_respuestas_rapidas BOOLEAN DEFAULT false,
  
  -- Canales
  puede_gestionar_whatsapp BOOLEAN DEFAULT false,
  puede_gestionar_instagram BOOLEAN DEFAULT false,
  puede_gestionar_facebook BOOLEAN DEFAULT false,
  puede_gestionar_telegram BOOLEAN DEFAULT false,
  
  -- Permisos adicionales (JSONB para flexibilidad futura)
  permisos_custom JSONB DEFAULT '{}',
  
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(usuario_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_permissions_usuario ON user_permissions(usuario_id);

-- ============================================================================
-- TABLA: usage_tracking
-- Tracking de uso para enforcement de límites
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizacion_id UUID REFERENCES organizaciones(id) ON DELETE CASCADE,
  
  -- Período de tracking (mensual)
  periodo_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  periodo_fin TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Contadores de uso
  usuarios_activos INTEGER DEFAULT 0,
  contactos_totales INTEGER DEFAULT 0,
  mensajes_enviados INTEGER DEFAULT 0,
  mensajes_recibidos INTEGER DEFAULT 0,
  
  -- Sesiones por canal
  sesiones_whatsapp_activas INTEGER DEFAULT 0,
  sesiones_instagram_activas INTEGER DEFAULT 0,
  sesiones_facebook_activas INTEGER DEFAULT 0,
  sesiones_telegram_activas INTEGER DEFAULT 0,
  
  -- Otros recursos
  espacios_trabajo_totales INTEGER DEFAULT 0,
  embudos_totales INTEGER DEFAULT 0,
  almacenamiento_usado_mb NUMERIC(10, 2) DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(organizacion_id, periodo_inicio, periodo_fin)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_usage_tracking_organizacion ON usage_tracking(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_periodo ON usage_tracking(periodo_inicio, periodo_fin);

-- ============================================================================
-- TABLA: audit_logs
-- Logs de auditoría para super admin
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Quién hizo la acción
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario_email TEXT,
  usuario_nombre TEXT,
  
  -- Qué organización fue afectada
  organizacion_id UUID REFERENCES organizaciones(id) ON DELETE SET NULL,
  
  -- Detalles de la acción
  accion TEXT NOT NULL, -- 'create_organization', 'assign_plan', 'update_permissions', etc.
  entidad TEXT NOT NULL, -- 'organization', 'user', 'subscription', 'permissions', 'channel'
  entidad_id TEXT,
  
  -- Metadata
  detalles JSONB,
  ip_address TEXT,
  user_agent TEXT,
  
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_audit_logs_usuario ON audit_logs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organizacion ON audit_logs(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_accion ON audit_logs(accion);
CREATE INDEX IF NOT EXISTS idx_audit_logs_creado_en ON audit_logs(creado_en DESC);

-- ============================================================================
-- TABLA: instagram_sessions
-- Sesiones de Instagram
-- ============================================================================
CREATE TABLE IF NOT EXISTS instagram_sessions (
  id SERIAL PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  sesion_id UUID REFERENCES sesiones(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'connected', 'disconnected', 'error'
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  auth_data JSONB, -- Datos de autenticación encriptados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instagram_sessions_sesion ON instagram_sessions(sesion_id);
CREATE INDEX IF NOT EXISTS idx_instagram_sessions_status ON instagram_sessions(status);

-- ============================================================================
-- TABLA: facebook_sessions
-- Sesiones de Facebook Messenger
-- ============================================================================
CREATE TABLE IF NOT EXISTS facebook_sessions (
  id SERIAL PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  sesion_id UUID REFERENCES sesiones(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL,
  page_name TEXT,
  status TEXT DEFAULT 'pending',
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_token TEXT, -- Token de acceso encriptado
  auth_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facebook_sessions_sesion ON facebook_sessions(sesion_id);
CREATE INDEX IF NOT EXISTS idx_facebook_sessions_status ON facebook_sessions(status);

-- ============================================================================
-- TABLA: telegram_sessions
-- Sesiones de Telegram
-- ============================================================================
CREATE TABLE IF NOT EXISTS telegram_sessions (
  id SERIAL PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  sesion_id UUID REFERENCES sesiones(id) ON DELETE CASCADE,
  bot_token TEXT NOT NULL,
  bot_username TEXT,
  status TEXT DEFAULT 'pending',
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  webhook_url TEXT,
  auth_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_sessions_sesion ON telegram_sessions(sesion_id);
CREATE INDEX IF NOT EXISTS idx_telegram_sessions_status ON telegram_sessions(status);

-- ============================================================================
-- ACTUALIZAR TABLA organizaciones
-- ============================================================================
ALTER TABLE organizaciones 
  ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS onboarding_completado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS configuracion JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_organizaciones_estado ON organizaciones(estado);

-- ============================================================================
-- TRIGGERS PARA NUEVAS TABLAS
-- ============================================================================

CREATE TRIGGER update_subscription_plans_updated_at 
  BEFORE UPDATE ON subscription_plans 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_subscriptions_updated_at 
  BEFORE UPDATE ON organization_subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_permissions_updated_at 
  BEFORE UPDATE ON user_permissions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_tracking_updated_at 
  BEFORE UPDATE ON usage_tracking 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instagram_sessions_updated_at 
  BEFORE UPDATE ON instagram_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column_english();

CREATE TRIGGER update_facebook_sessions_updated_at 
  BEFORE UPDATE ON facebook_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column_english();

CREATE TRIGGER update_telegram_sessions_updated_at 
  BEFORE UPDATE ON telegram_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column_english();

-- ============================================================================
-- FUNCIÓN: Verificar límites del plan
-- ============================================================================
CREATE OR REPLACE FUNCTION check_plan_limit(
  p_organizacion_id UUID,
  p_recurso TEXT,
  p_cantidad_actual INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_limite INTEGER;
  v_plan_id UUID;
BEGIN
  -- Obtener el plan de la organización
  SELECT plan_id INTO v_plan_id
  FROM organization_subscriptions
  WHERE organizacion_id = p_organizacion_id
    AND estado IN ('active', 'trial');
  
  IF v_plan_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Obtener el límite según el recurso
  CASE p_recurso
    WHEN 'usuarios' THEN
      SELECT max_usuarios INTO v_limite FROM subscription_plans WHERE id = v_plan_id;
    WHEN 'contactos' THEN
      SELECT max_contactos INTO v_limite FROM subscription_plans WHERE id = v_plan_id;
    WHEN 'mensajes' THEN
      SELECT max_mensajes_mes INTO v_limite FROM subscription_plans WHERE id = v_plan_id;
    WHEN 'sesiones_whatsapp' THEN
      SELECT max_sesiones_whatsapp INTO v_limite FROM subscription_plans WHERE id = v_plan_id;
    WHEN 'sesiones_instagram' THEN
      SELECT max_sesiones_instagram INTO v_limite FROM subscription_plans WHERE id = v_plan_id;
    WHEN 'sesiones_facebook' THEN
      SELECT max_sesiones_facebook INTO v_limite FROM subscription_plans WHERE id = v_plan_id;
    WHEN 'sesiones_telegram' THEN
      SELECT max_sesiones_telegram INTO v_limite FROM subscription_plans WHERE id = v_plan_id;
    WHEN 'espacios_trabajo' THEN
      SELECT max_espacios_trabajo INTO v_limite FROM subscription_plans WHERE id = v_plan_id;
    WHEN 'embudos' THEN
      SELECT max_embudos INTO v_limite FROM subscription_plans WHERE id = v_plan_id;
    ELSE
      RETURN false;
  END CASE;
  
  -- -1 significa ilimitado
  IF v_limite = -1 THEN
    RETURN true;
  END IF;
  
  -- Verificar si está dentro del límite
  RETURN p_cantidad_actual < v_limite;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMENTARIOS PARA NUEVAS TABLAS
-- ============================================================================

COMMENT ON TABLE subscription_plans IS 'Planes de suscripción con límites y features';
COMMENT ON TABLE organization_subscriptions IS 'Asignación de planes a organizaciones';
COMMENT ON TABLE user_permissions IS 'Permisos granulares por usuario';
COMMENT ON TABLE usage_tracking IS 'Tracking de uso para enforcement de límites';
COMMENT ON TABLE audit_logs IS 'Logs de auditoría para acciones de super admin';
COMMENT ON TABLE instagram_sessions IS 'Sesiones activas de Instagram';
COMMENT ON TABLE facebook_sessions IS 'Sesiones activas de Facebook Messenger';
COMMENT ON TABLE telegram_sessions IS 'Sesiones activas de Telegram';
COMMENT ON FUNCTION check_plan_limit IS 'Verifica si una organización puede crear más recursos según su plan';
