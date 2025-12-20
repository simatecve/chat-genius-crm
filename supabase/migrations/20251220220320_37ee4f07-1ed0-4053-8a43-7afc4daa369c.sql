-- Agregar columna puede_gestionar_ia para controlar acceso a la pestaña de IA
ALTER TABLE public.user_permissions 
ADD COLUMN IF NOT EXISTS puede_gestionar_ia boolean DEFAULT false;