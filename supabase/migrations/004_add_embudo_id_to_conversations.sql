-- Add embudo_id to conversations table
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS embudo_id UUID REFERENCES public.embudos(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_conversations_embudo_id ON public.conversations(embudo_id);
