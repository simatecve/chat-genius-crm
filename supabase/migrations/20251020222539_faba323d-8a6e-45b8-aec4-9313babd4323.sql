-- Crear tabla para configuración de bot por usuario
CREATE TABLE IF NOT EXISTS public.user_bot_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_stop_on_human_reply BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_bot_settings UNIQUE (user_id)
);

-- Habilitar RLS
ALTER TABLE public.user_bot_settings ENABLE ROW LEVEL SECURITY;

-- Política para SELECT
CREATE POLICY "Los usuarios pueden ver su propia configuración"
ON public.user_bot_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Política para INSERT
CREATE POLICY "Los usuarios pueden crear su propia configuración"
ON public.user_bot_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Política para UPDATE
CREATE POLICY "Los usuarios pueden actualizar su propia configuración"
ON public.user_bot_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Política para DELETE
CREATE POLICY "Los usuarios pueden eliminar su propia configuración"
ON public.user_bot_settings
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_user_bot_settings_updated_at
BEFORE UPDATE ON public.user_bot_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();