ALTER TABLE IF EXISTS public.email_inboxes
  ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_webhook_url text;

