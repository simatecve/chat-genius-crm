ALTER TABLE IF EXISTS public.email_inboxes
  ADD COLUMN IF NOT EXISTS signature_text text,
  ADD COLUMN IF NOT EXISTS signature_html text;

