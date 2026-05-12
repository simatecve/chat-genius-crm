ALTER TABLE IF EXISTS public.email_messages
  ADD COLUMN IF NOT EXISTS requires_human_followup boolean NOT NULL DEFAULT false;

