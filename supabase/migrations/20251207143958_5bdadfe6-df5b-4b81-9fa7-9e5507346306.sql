-- Create landing chat conversations table
CREATE TABLE public.landing_chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  visitor_name TEXT,
  visitor_email TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID NOT NULL
);

-- Create landing chat messages table
CREATE TABLE public.landing_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.landing_chat_conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID NOT NULL
);

-- Create landing chat configuration table
CREATE TABLE public.landing_chat_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cashier_number TEXT DEFAULT '',
  cbu TEXT DEFAULT '',
  user_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.landing_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_chat_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversations
CREATE POLICY "Users can manage account landing conversations"
ON public.landing_chat_conversations
FOR ALL
USING (user_id = get_account_owner_id(auth.uid()));

-- RLS policies for messages
CREATE POLICY "Users can manage account landing messages"
ON public.landing_chat_messages
FOR ALL
USING (user_id = get_account_owner_id(auth.uid()));

-- RLS policies for config
CREATE POLICY "Users can manage account landing config"
ON public.landing_chat_config
FOR ALL
USING (user_id = get_account_owner_id(auth.uid()));

-- Create indexes
CREATE INDEX idx_landing_chat_messages_conversation ON public.landing_chat_messages(conversation_id);
CREATE INDEX idx_landing_chat_conversations_user ON public.landing_chat_conversations(user_id);
CREATE INDEX idx_landing_chat_conversations_session ON public.landing_chat_conversations(session_id);