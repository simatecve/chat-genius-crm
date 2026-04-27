DO $$
DECLARE
  r record;
  v_workspace_id uuid;
BEGIN
  TRUNCATE TABLE
    public.agent_presence,
    public.ai_agents,
    public.ai_api_keys,
    public.ai_response_buffer,
    public.assignment_settings,
    public.audit_logs,
    public.automated_message_logs,
    public.campaign_sends,
    public.casino_api_configs,
    public.column_message_triggers,
    public.consumption_alert_history,
    public.consumption_alert_settings,
    public.contact_details,
    public.contact_list_members,
    public.contact_lists,
    public.contact_sales,
    public.contacto_bloqueado_bot,
    public.contacts,
    public.conversations,
    public.etiquetas,
    public.facebook_connections,
    public.internal_messages,
    public.landing_chat_config,
    public.landing_chat_conversations,
    public.landing_chat_messages,
    public.lead_columns,
    public.leads,
    public.mass_campaigns,
    public.mensaje_landing,
    public.messages,
    public.monthly_channel_cost_snapshots,
    public.payment_methods,
    public.products,
    public.quick_replies,
    public.sales,
    public.scheduled_messages,
    public.tareas,
    public.telegram_bots,
    public.twilio_connections,
    public.twilio_daily_usage,
    public.usage_tracking,
    public.user_bot_settings,
    public.user_subscriptions,
    public.user_usage,
    public.web_chatbots,
    public.webchat_ai_settings,
    public.whatsapp_connections,
    public.workspaces
  RESTART IDENTITY CASCADE;

  FOR r IN
    SELECT id
    FROM public.profiles
    WHERE parent_user_id IS NULL
  LOOP
    INSERT INTO public.workspaces (user_id, name, position)
    VALUES (r.id, 'Mi Espacio de Trabajo', 0)
    RETURNING id INTO v_workspace_id;

    INSERT INTO public.lead_columns (user_id, workspace_id, name, color, position, is_default)
    VALUES (r.id, v_workspace_id, 'Nuevos Contactos', '#22c55e', 0, true);
  END LOOP;
END $$;