-- Create table for blocked bot contacts
CREATE TABLE public.contacto_bloqueado_bot (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pushname TEXT,
  numero TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, numero)
);

-- Enable RLS
ALTER TABLE public.contacto_bloqueado_bot ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own blocked contacts"
ON public.contacto_bloqueado_bot
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own blocked contacts"
ON public.contacto_bloqueado_bot
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own blocked contacts"
ON public.contacto_bloqueado_bot
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own blocked contacts"
ON public.contacto_bloqueado_bot
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_contacto_bloqueado_bot_updated_at
BEFORE UPDATE ON public.contacto_bloqueado_bot
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();