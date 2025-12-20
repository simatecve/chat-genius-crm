-- Agregar columnas de permisos faltantes para todas las funcionalidades del sistema

-- Campañas Masivas
ALTER TABLE user_permissions 
ADD COLUMN IF NOT EXISTS puede_ver_campanas_masivas boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS puede_crear_campanas_masivas boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS puede_editar_campanas_masivas boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS puede_eliminar_campanas_masivas boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS puede_enviar_campanas_masivas boolean DEFAULT false;

-- Listas de Contactos
ALTER TABLE user_permissions 
ADD COLUMN IF NOT EXISTS puede_ver_listas_contactos boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS puede_crear_listas_contactos boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS puede_editar_listas_contactos boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS puede_eliminar_listas_contactos boolean DEFAULT false;

-- Agentes IA
ALTER TABLE user_permissions 
ADD COLUMN IF NOT EXISTS puede_ver_agentes_ia boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS puede_crear_agentes_ia boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS puede_editar_agentes_ia boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS puede_eliminar_agentes_ia boolean DEFAULT false;

-- Calendario
ALTER TABLE user_permissions 
ADD COLUMN IF NOT EXISTS puede_ver_calendario boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS puede_editar_tareas boolean DEFAULT false;

-- Chat Landing/Web
ALTER TABLE user_permissions 
ADD COLUMN IF NOT EXISTS puede_ver_chat_landing boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS puede_responder_chat_landing boolean DEFAULT false;

-- Chat Interno
ALTER TABLE user_permissions 
ADD COLUMN IF NOT EXISTS puede_ver_chat_interno boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS puede_enviar_chat_interno boolean DEFAULT false;

-- Configuración Bot
ALTER TABLE user_permissions 
ADD COLUMN IF NOT EXISTS puede_configurar_bot boolean DEFAULT false;

-- Etiquetas
ALTER TABLE user_permissions 
ADD COLUMN IF NOT EXISTS puede_gestionar_etiquetas boolean DEFAULT false;

-- Espacios de Trabajo
ALTER TABLE user_permissions 
ADD COLUMN IF NOT EXISTS puede_gestionar_workspaces boolean DEFAULT false;

-- Integraciones (APIs)
ALTER TABLE user_permissions 
ADD COLUMN IF NOT EXISTS puede_gestionar_integraciones boolean DEFAULT false;