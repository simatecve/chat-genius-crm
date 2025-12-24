-- Add responded_by column to messages table to track who actually sent each message
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS responded_by uuid REFERENCES public.profiles(id);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_messages_responded_by ON public.messages(responded_by);

-- Create audit_logs table for tracking all important actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for efficient queries on audit_logs
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Superadmins can view all audit logs
CREATE POLICY "Superadmins can view all audit logs" ON public.audit_logs
  FOR SELECT USING (has_role(auth.uid(), 'superadmin'));

-- Account owners can manage their audit logs
CREATE POLICY "Account owners can manage audit logs" ON public.audit_logs
  FOR ALL USING (user_id = get_account_owner_id(auth.uid()));

-- Create system_status table for monitoring
CREATE TABLE IF NOT EXISTS public.system_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_name text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'healthy',
  last_check_at timestamp with time zone DEFAULT now(),
  error_message text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create index for system_status queries
CREATE INDEX idx_system_status_component ON public.system_status(component_name);
CREATE INDEX idx_system_status_status ON public.system_status(status);

-- Enable RLS on system_status
ALTER TABLE public.system_status ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view system status
CREATE POLICY "Authenticated users can view system status" ON public.system_status
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only superadmins can modify system status
CREATE POLICY "Superadmins can manage system status" ON public.system_status
  FOR ALL USING (has_role(auth.uid(), 'superadmin'));

-- Insert initial system components
INSERT INTO public.system_status (component_name, status, metadata) VALUES
  ('whatsapp-waha', 'unknown', '{"description": "WhatsApp WAHA Connection"}'),
  ('telegram-bots', 'unknown', '{"description": "Telegram Bot Webhooks"}'),
  ('twilio-sms', 'unknown', '{"description": "Twilio SMS/WhatsApp"}'),
  ('ai-agents', 'unknown', '{"description": "AI Agent Responses"}'),
  ('web-chat', 'unknown', '{"description": "Web Chat Widget"}'),
  ('mass-campaigns', 'unknown', '{"description": "Mass Campaign Sender"}')
ON CONFLICT (component_name) DO NOTHING;