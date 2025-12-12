-- Create separate table for Web Chat AI settings (isolated from ia_default_settings)
CREATE TABLE IF NOT EXISTS public.webchat_ai_settings (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  system_prompt TEXT NOT NULL DEFAULT 'Eres un asistente virtual amigable para un sitio web. Responde de manera concisa y útil a las consultas de los visitantes.',
  cashier_numbers TEXT NOT NULL DEFAULT '',
  cbu TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  max_tokens INTEGER NOT NULL DEFAULT 500,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.webchat_ai_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own webchat AI settings"
ON public.webchat_ai_settings
FOR SELECT
USING (user_id = get_account_owner_id(auth.uid()));

CREATE POLICY "Users can insert their own webchat AI settings"
ON public.webchat_ai_settings
FOR INSERT
WITH CHECK (user_id = get_account_owner_id(auth.uid()));

CREATE POLICY "Users can update their own webchat AI settings"
ON public.webchat_ai_settings
FOR UPDATE
USING (user_id = get_account_owner_id(auth.uid()));

CREATE POLICY "Users can delete their own webchat AI settings"
ON public.webchat_ai_settings
FOR DELETE
USING (user_id = get_account_owner_id(auth.uid()));