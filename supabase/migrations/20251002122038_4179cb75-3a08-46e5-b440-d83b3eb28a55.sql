-- Corregir función check_usage_limit para obtener el plan desde user_subscriptions
CREATE OR REPLACE FUNCTION public.check_usage_limit(p_user_id uuid, p_resource_type text, p_requested_amount integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_plan public.subscription_plans;
  current_usage public.user_usage;
  current_month date := date_trunc('month', now())::date;
BEGIN
  -- Obtener el plan desde user_subscriptions (suscripción activa)
  SELECT sp.* INTO current_plan
  FROM public.subscription_plans sp
  JOIN public.user_subscriptions us ON us.plan_id = sp.id
  WHERE us.user_id = p_user_id 
    AND us.status = 'active'
  ORDER BY us.created_at DESC
  LIMIT 1;
  
  IF current_plan IS NULL THEN
    RETURN false; -- Sin plan activo, sin acceso
  END IF;
  
  -- Obtener el uso actual del mes
  SELECT * INTO current_usage
  FROM public.user_usage
  WHERE user_id = p_user_id AND usage_month = current_month;
  
  -- Si no existe registro de uso, crear uno
  IF current_usage IS NULL THEN
    INSERT INTO public.user_usage (user_id, plan_id, usage_month)
    VALUES (p_user_id, current_plan.id, current_month)
    RETURNING * INTO current_usage;
  END IF;
  
  -- Verificar límites según el tipo de recurso
  CASE p_resource_type
    WHEN 'whatsapp_connections' THEN
      RETURN (current_usage.whatsapp_connections_used + p_requested_amount) <= current_plan.max_whatsapp_connections;
    WHEN 'contacts' THEN
      RETURN (current_usage.contacts_used + p_requested_amount) <= current_plan.max_contacts;
    WHEN 'campaigns' THEN
      RETURN (current_usage.campaigns_this_month + p_requested_amount) <= current_plan.max_monthly_campaigns;
    WHEN 'bot_responses' THEN
      RETURN (current_usage.bot_responses_this_month + p_requested_amount) <= current_plan.max_bot_responses;
    WHEN 'storage' THEN
      RETURN (current_usage.storage_used_mb + p_requested_amount) <= current_plan.max_storage_mb;
    WHEN 'device_sessions' THEN
      RETURN (current_usage.device_sessions_used + p_requested_amount) <= current_plan.max_device_sessions;
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- Corregir función increment_usage para obtener el plan desde user_subscriptions
CREATE OR REPLACE FUNCTION public.increment_usage(p_user_id uuid, p_resource_type text, p_amount integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_month date := date_trunc('month', now())::date;
  current_plan_id uuid;
BEGIN
  -- Obtener el plan_id desde user_subscriptions (suscripción activa)
  SELECT us.plan_id INTO current_plan_id
  FROM public.user_subscriptions us
  WHERE us.user_id = p_user_id 
    AND us.status = 'active'
  ORDER BY us.created_at DESC
  LIMIT 1;
  
  IF current_plan_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Insertar o actualizar el uso
  INSERT INTO public.user_usage (
    user_id, 
    plan_id, 
    usage_month, 
    whatsapp_connections_used, 
    contacts_used, 
    campaigns_this_month, 
    bot_responses_this_month, 
    storage_used_mb,
    device_sessions_used
  )
  VALUES (
    p_user_id, 
    current_plan_id, 
    current_month,
    CASE WHEN p_resource_type = 'whatsapp_connections' THEN p_amount ELSE 0 END,
    CASE WHEN p_resource_type = 'contacts' THEN p_amount ELSE 0 END,
    CASE WHEN p_resource_type = 'campaigns' THEN p_amount ELSE 0 END,
    CASE WHEN p_resource_type = 'bot_responses' THEN p_amount ELSE 0 END,
    CASE WHEN p_resource_type = 'storage' THEN p_amount ELSE 0 END,
    CASE WHEN p_resource_type = 'device_sessions' THEN p_amount ELSE 0 END
  )
  ON CONFLICT (user_id, usage_month) 
  DO UPDATE SET
    whatsapp_connections_used = CASE WHEN p_resource_type = 'whatsapp_connections' 
                                    THEN user_usage.whatsapp_connections_used + p_amount 
                                    ELSE user_usage.whatsapp_connections_used END,
    contacts_used = CASE WHEN p_resource_type = 'contacts' 
                         THEN user_usage.contacts_used + p_amount 
                         ELSE user_usage.contacts_used END,
    campaigns_this_month = CASE WHEN p_resource_type = 'campaigns' 
                                THEN user_usage.campaigns_this_month + p_amount 
                                ELSE user_usage.campaigns_this_month END,
    bot_responses_this_month = CASE WHEN p_resource_type = 'bot_responses' 
                                    THEN user_usage.bot_responses_this_month + p_amount 
                                    ELSE user_usage.bot_responses_this_month END,
    storage_used_mb = CASE WHEN p_resource_type = 'storage' 
                           THEN user_usage.storage_used_mb + p_amount 
                           ELSE user_usage.storage_used_mb END,
    device_sessions_used = CASE WHEN p_resource_type = 'device_sessions' 
                               THEN user_usage.device_sessions_used + p_amount 
                               ELSE user_usage.device_sessions_used END,
    updated_at = now();
    
  RETURN true;
END;
$$;