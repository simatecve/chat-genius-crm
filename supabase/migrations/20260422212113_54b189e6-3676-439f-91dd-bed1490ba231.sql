CREATE UNIQUE INDEX IF NOT EXISTS idx_consumption_alert_settings_dedupe
ON public.consumption_alert_settings (
  account_owner_id,
  COALESCE(target_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
);