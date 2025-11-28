-- Create user_permissions table for granular per-user permissions
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dashboard & General
  puede_ver_dashboard BOOLEAN DEFAULT true,
  
  -- Contactos
  puede_ver_contactos BOOLEAN DEFAULT true,
  puede_crear_contactos BOOLEAN DEFAULT false,
  puede_editar_contactos BOOLEAN DEFAULT false,
  puede_eliminar_contactos BOOLEAN DEFAULT false,
  puede_importar_contactos BOOLEAN DEFAULT false,
  
  -- Chats
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
  puede_ver_ventas BOOLEAN DEFAULT false,
  puede_crear_ventas BOOLEAN DEFAULT false,
  puede_editar_ventas BOOLEAN DEFAULT false,
  puede_eliminar_ventas BOOLEAN DEFAULT false,
  
  -- Tareas
  puede_ver_tareas BOOLEAN DEFAULT true,
  puede_crear_tareas BOOLEAN DEFAULT false,
  puede_asignar_tareas BOOLEAN DEFAULT false,
  puede_eliminar_tareas BOOLEAN DEFAULT false,
  
  -- Reportes
  puede_ver_reportes BOOLEAN DEFAULT false,
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
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Enable RLS but allow users to see their own permissions
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own permissions
CREATE POLICY "Users can view their own permissions"
ON public.user_permissions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Client admins can manage permissions for users in their account
CREATE POLICY "Admins can manage user permissions"
ON public.user_permissions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.profile_type = 'client'
  )
);

-- Create trigger to update updated_at
CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_user_permissions_user_id ON public.user_permissions(user_id);