-- Create facebook_connections table for Facebook Messenger and Instagram integration
CREATE TABLE public.facebook_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  page_id TEXT NOT NULL,
  page_name TEXT NOT NULL,
  page_access_token TEXT NOT NULL,
  instagram_account_id TEXT,
  instagram_username TEXT,
  workspace_id UUID,
  default_column_id UUID,
  ai_enabled BOOLEAN DEFAULT false,
  n8n_webhook_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add facebook_connection_id to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS facebook_connection_id UUID;

-- Create indexes for performance
CREATE INDEX idx_facebook_connections_user_id ON facebook_connections(user_id);
CREATE INDEX idx_facebook_connections_page_id ON facebook_connections(page_id);
CREATE INDEX idx_conversations_facebook_connection_id ON conversations(facebook_connection_id);

-- Enable RLS
ALTER TABLE facebook_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for facebook_connections
CREATE POLICY "Users can manage account facebook connections"
  ON facebook_connections FOR ALL
  USING (user_id = get_account_owner_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_facebook_connections_updated_at
  BEFORE UPDATE ON facebook_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();