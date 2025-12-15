-- Add column to track if casino user was already created in this conversation
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS casino_user_created BOOLEAN DEFAULT FALSE;