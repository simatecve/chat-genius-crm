-- Create web_chatbots table for embeddable chat widgets
CREATE TABLE public.web_chatbots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  logo_url text,
  primary_color text DEFAULT '#00a884',
  welcome_message text DEFAULT '¡Hola! ¿En qué puedo ayudarte?',
  placeholder_text text DEFAULT 'Escribe tu mensaje...',
  position text DEFAULT 'bottom-right',
  ai_agent_id uuid REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  allowed_domains text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.web_chatbots ENABLE ROW LEVEL SECURITY;

-- RLS Policy for account-level access
CREATE POLICY "Users can manage account web chatbots" 
ON public.web_chatbots 
FOR ALL 
USING (user_id = get_account_owner_id(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_web_chatbots_updated_at
BEFORE UPDATE ON public.web_chatbots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add channel_type 'webchat' support to conversations
-- (conversations table already has channel_type text column)