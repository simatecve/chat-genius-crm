CREATE TABLE IF NOT EXISTS public.consumption_alert_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_owner_id UUID NOT NULL,
  target_user_id UUID NULL,
  twilio_monthly_cost_threshold NUMERIC NOT NULL DEFAULT 150,
  twilio_monthly_message_threshold INTEGER NOT NULL DEFAULT 2500,
  whatsapp_api_unusual_growth_percent NUMERIC NOT NULL DEFAULT 40,
  agent_monthly_message_threshold INTEGER NOT NULL DEFAULT 500,
  minimum_savings_percent NUMERIC NOT NULL DEFAULT 35,
  enable_twilio_cost_alert BOOLEAN NOT NULL DEFAULT true,
  enable_whatsapp_api_unusual_alert BOOLEAN NOT NULL DEFAULT true,
  enable_agent_volume_alert BOOLEAN NOT NULL DEFAULT true,
  enable_low_savings_alert BOOLEAN NOT NULL DEFAULT true,
  default_severity TEXT NOT NULL DEFAULT 'warning',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (account_owner_id, target_user_id)
);

CREATE TABLE IF NOT EXISTS public.consumption_alert_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_owner_id UUID NOT NULL,
  target_user_id UUID NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  threshold_value NUMERIC NOT NULL DEFAULT 0,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.consumption_alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumption_alert_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view account consumption alert settings"
ON public.consumption_alert_settings
FOR SELECT
USING (account_owner_id = public.get_account_owner_id(auth.uid()));

CREATE POLICY "Users can create account consumption alert settings"
ON public.consumption_alert_settings
FOR INSERT
WITH CHECK (account_owner_id = public.get_account_owner_id(auth.uid()));

CREATE POLICY "Users can update account consumption alert settings"
ON public.consumption_alert_settings
FOR UPDATE
USING (account_owner_id = public.get_account_owner_id(auth.uid()))
WITH CHECK (account_owner_id = public.get_account_owner_id(auth.uid()));

CREATE POLICY "Users can delete account consumption alert settings"
ON public.consumption_alert_settings
FOR DELETE
USING (account_owner_id = public.get_account_owner_id(auth.uid()));

CREATE POLICY "Users can view account consumption alert history"
ON public.consumption_alert_history
FOR SELECT
USING (account_owner_id = public.get_account_owner_id(auth.uid()));

CREATE POLICY "Users can create account consumption alert history"
ON public.consumption_alert_history
FOR INSERT
WITH CHECK (account_owner_id = public.get_account_owner_id(auth.uid()));

CREATE POLICY "Users can update account consumption alert history"
ON public.consumption_alert_history
FOR UPDATE
USING (account_owner_id = public.get_account_owner_id(auth.uid()))
WITH CHECK (account_owner_id = public.get_account_owner_id(auth.uid()));

CREATE POLICY "Users can delete account consumption alert history"
ON public.consumption_alert_history
FOR DELETE
USING (account_owner_id = public.get_account_owner_id(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_consumption_alert_settings_account
ON public.consumption_alert_settings (account_owner_id);

CREATE INDEX IF NOT EXISTS idx_consumption_alert_history_account_created
ON public.consumption_alert_history (account_owner_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_consumption_alert_history_dedupe
ON public.consumption_alert_history (
  account_owner_id,
  alert_type,
  COALESCE(target_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
  period_start,
  period_end
);

DROP TRIGGER IF EXISTS update_consumption_alert_settings_updated_at ON public.consumption_alert_settings;
CREATE TRIGGER update_consumption_alert_settings_updated_at
BEFORE UPDATE ON public.consumption_alert_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();