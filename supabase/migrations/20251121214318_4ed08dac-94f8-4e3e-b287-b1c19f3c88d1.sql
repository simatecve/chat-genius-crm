-- Agregar columna added_at a contact_list_members
ALTER TABLE public.contact_list_members 
  ADD COLUMN IF NOT EXISTS added_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Agregar columnas faltantes a profiles para subscripciones
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.payment_plans(id),
  ADD COLUMN IF NOT EXISTS plan_type TEXT;

-- Crear tabla ai_bots (alias para ai_agents si es necesario)
-- En realidad vamos a corregir el código para usar ai_agents en su lugar

-- Agregar columnas faltantes a automated_message_logs
ALTER TABLE public.automated_message_logs
  ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP WITH TIME ZONE;

-- Crear función increment_usage si no existe
CREATE OR REPLACE FUNCTION public.increment_usage(
  p_user_id UUID,
  p_resource_type TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insertar o actualizar el uso del usuario
  INSERT INTO public.user_usage (
    user_id,
    usage_month,
    contacts_used,
    conversations_used,
    campaigns_this_month,
    bot_responses_this_month,
    whatsapp_connections_used,
    device_sessions_used,
    storage_used_mb
  )
  VALUES (
    p_user_id,
    DATE_TRUNC('month', CURRENT_DATE)::date,
    CASE WHEN p_resource_type = 'contacts' THEN p_amount ELSE 0 END,
    CASE WHEN p_resource_type = 'conversations' THEN p_amount ELSE 0 END,
    CASE WHEN p_resource_type = 'campaigns' THEN p_amount ELSE 0 END,
    CASE WHEN p_resource_type = 'bot_responses' THEN p_amount ELSE 0 END,
    CASE WHEN p_resource_type = 'whatsapp_connections' THEN p_amount ELSE 0 END,
    CASE WHEN p_resource_type = 'device_sessions' THEN p_amount ELSE 0 END,
    CASE WHEN p_resource_type = 'storage' THEN p_amount ELSE 0 END
  )
  ON CONFLICT (user_id, usage_month) 
  DO UPDATE SET
    contacts_used = CASE WHEN p_resource_type = 'contacts' 
      THEN user_usage.contacts_used + p_amount 
      ELSE user_usage.contacts_used END,
    conversations_used = CASE WHEN p_resource_type = 'conversations' 
      THEN user_usage.conversations_used + p_amount 
      ELSE user_usage.conversations_used END,
    campaigns_this_month = CASE WHEN p_resource_type = 'campaigns' 
      THEN user_usage.campaigns_this_month + p_amount 
      ELSE user_usage.campaigns_this_month END,
    bot_responses_this_month = CASE WHEN p_resource_type = 'bot_responses' 
      THEN user_usage.bot_responses_this_month + p_amount 
      ELSE user_usage.bot_responses_this_month END,
    whatsapp_connections_used = CASE WHEN p_resource_type = 'whatsapp_connections' 
      THEN user_usage.whatsapp_connections_used + p_amount 
      ELSE user_usage.whatsapp_connections_used END,
    device_sessions_used = CASE WHEN p_resource_type = 'device_sessions' 
      THEN user_usage.device_sessions_used + p_amount 
      ELSE user_usage.device_sessions_used END,
    storage_used_mb = CASE WHEN p_resource_type = 'storage' 
      THEN user_usage.storage_used_mb + p_amount 
      ELSE user_usage.storage_used_mb END,
    updated_at = now();
END;
$$;

-- Asegurar que la tabla message_triggers tenga el nombre correcto
-- Ya hicimos el rename en la migración anterior, así que esto es solo para confirmar

-- Crear índices adicionales para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_profiles_plan_id ON public.profiles(plan_id);
CREATE INDEX IF NOT EXISTS idx_contact_list_members_added_at ON public.contact_list_members(added_at);

-- Actualizar trigger de updated_at para profiles si no existe
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();