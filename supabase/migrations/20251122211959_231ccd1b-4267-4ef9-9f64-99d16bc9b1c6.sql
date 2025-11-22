-- Agregar el nuevo valor al enum de roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cashier';

-- Crear tabla de permisos del sistema
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  category text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Crear tabla de relación roles-permisos
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_id uuid REFERENCES public.permissions(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(role, permission_id)
);

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para permissions (solo superadmins pueden gestionar)
CREATE POLICY "Superadmins can manage permissions"
ON public.permissions
FOR ALL
USING (has_role(auth.uid(), 'superadmin'));

-- Políticas RLS para role_permissions (solo superadmins pueden gestionar)
CREATE POLICY "Superadmins can manage role permissions"
ON public.role_permissions
FOR ALL
USING (has_role(auth.uid(), 'superadmin'));

-- Insertar permisos base del sistema
INSERT INTO public.permissions (name, description, category) VALUES
('view_dashboard', 'Ver dashboard principal', 'Dashboard'),
('view_conversations', 'Ver conversaciones', 'Conversaciones'),
('send_messages', 'Enviar mensajes', 'Conversaciones'),
('view_contacts', 'Ver contactos', 'Contactos'),
('manage_contacts', 'Crear y editar contactos', 'Contactos'),
('delete_contacts', 'Eliminar contactos', 'Contactos'),
('view_leads', 'Ver leads', 'Leads'),
('manage_leads', 'Crear y editar leads', 'Leads'),
('delete_leads', 'Eliminar leads', 'Leads'),
('view_campaigns', 'Ver campañas', 'Campañas'),
('manage_campaigns', 'Crear y editar campañas', 'Campañas'),
('delete_campaigns', 'Eliminar campañas', 'Campañas'),
('view_ai_agents', 'Ver agentes IA', 'IA'),
('manage_ai_agents', 'Crear y editar agentes IA', 'IA'),
('view_whatsapp_connections', 'Ver conexiones WhatsApp', 'WhatsApp'),
('manage_whatsapp_connections', 'Gestionar conexiones WhatsApp', 'WhatsApp'),
('view_reports', 'Ver reportes', 'Reportes'),
('manage_users', 'Gestionar usuarios', 'Administración'),
('manage_settings', 'Gestionar configuración', 'Administración')
ON CONFLICT (name) DO NOTHING;