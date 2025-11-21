-- Crear tabla user_bot_settings para configuración de auto-stop del bot
CREATE TABLE IF NOT EXISTS public.user_bot_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_stop_on_human_reply BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Crear tabla contacto_bloqueado_bot para bloquear bots en contactos específicos
CREATE TABLE IF NOT EXISTS public.contacto_bloqueado_bot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  pushname TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, numero)
);

-- Crear tabla automated_message_logs para logs de mensajes automáticos
CREATE TABLE IF NOT EXISTS public.automated_message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_id UUID REFERENCES public.message_triggers(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  message_content TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Renombrar tabla message_triggers a column_message_triggers si es necesario
-- Primero verificamos si existe message_triggers y no existe column_message_triggers
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'message_triggers') 
     AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'column_message_triggers') THEN
    ALTER TABLE public.message_triggers RENAME TO column_message_triggers;
  END IF;
END $$;

-- Agregar columnas faltantes a mass_campaigns
ALTER TABLE public.mass_campaigns 
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_connection_name TEXT,
  ADD COLUMN IF NOT EXISTS campaign_message TEXT,
  ADD COLUMN IF NOT EXISTS edit_with_ai BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_delay INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_delay INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS attachment_urls TEXT[],
  ADD COLUMN IF NOT EXISTS attachment_names TEXT[];

-- Agregar columna name a whatsapp_connections
ALTER TABLE public.whatsapp_connections 
  ADD COLUMN IF NOT EXISTS name TEXT;

-- Agregar columnas faltantes a messages
ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT false;

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.user_bot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacto_bloqueado_bot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automated_message_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_bot_settings
DROP POLICY IF EXISTS "Users can manage their own bot settings" ON public.user_bot_settings;
CREATE POLICY "Users can manage their own bot settings" 
  ON public.user_bot_settings 
  FOR ALL 
  USING (auth.uid() = user_id);

-- Políticas RLS para contacto_bloqueado_bot
DROP POLICY IF EXISTS "Users can manage their own blocked contacts" ON public.contacto_bloqueado_bot;
CREATE POLICY "Users can manage their own blocked contacts" 
  ON public.contacto_bloqueado_bot 
  FOR ALL 
  USING (auth.uid() = user_id);

-- Políticas RLS para automated_message_logs
DROP POLICY IF EXISTS "Users can manage their own automated message logs" ON public.automated_message_logs;
CREATE POLICY "Users can manage their own automated message logs" 
  ON public.automated_message_logs 
  FOR ALL 
  USING (auth.uid() = user_id);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_user_bot_settings_user_id ON public.user_bot_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_contacto_bloqueado_bot_user_numero ON public.contacto_bloqueado_bot(user_id, numero);
CREATE INDEX IF NOT EXISTS idx_automated_message_logs_user_id ON public.automated_message_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_automated_message_logs_status ON public.automated_message_logs(status);
CREATE INDEX IF NOT EXISTS idx_automated_message_logs_scheduled_for ON public.automated_message_logs(scheduled_for);