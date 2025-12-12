-- Drop and recreate channel_type check constraint on ai_agents to include 'webchat'
ALTER TABLE public.ai_agents DROP CONSTRAINT IF EXISTS ai_agents_channel_type_check;
ALTER TABLE public.ai_agents ADD CONSTRAINT ai_agents_channel_type_check 
  CHECK (channel_type IN ('all', 'whatsapp', 'telegram', 'twilio', 'webchat'));

-- Drop and recreate channel_type check constraint on conversations to include 'webchat'
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_channel_type_check;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_channel_type_check 
  CHECK (channel_type IN ('whatsapp', 'telegram', 'twilio', 'webchat'));