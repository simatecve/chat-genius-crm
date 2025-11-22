-- Asignar permisos por defecto a cada rol
-- Superadmin tiene todos los permisos
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'superadmin'::app_role, id FROM public.permissions
ON CONFLICT DO NOTHING;

-- Admin tiene casi todos excepto gestionar usuarios
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin'::app_role, id FROM public.permissions WHERE name != 'manage_users'
ON CONFLICT DO NOTHING;

-- User tiene permisos básicos
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'user'::app_role, id FROM public.permissions 
WHERE name IN ('view_dashboard', 'view_conversations', 'send_messages', 'view_contacts', 'view_leads', 'view_campaigns', 'view_reports')
ON CONFLICT DO NOTHING;

-- Cashier tiene permisos de operación
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'cashier'::app_role, id FROM public.permissions 
WHERE name IN ('view_dashboard', 'view_conversations', 'send_messages', 'view_contacts', 'manage_contacts', 'view_leads', 'manage_leads', 'view_campaigns')
ON CONFLICT DO NOTHING;