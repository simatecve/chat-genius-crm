
-- Create casino_api_configs table
CREATE TABLE public.casino_api_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  api_base_url text,
  api_key text,
  agent_username text,
  parent_id text,
  skin_id text,
  webhook_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.casino_api_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage account casino configs"
ON public.casino_api_configs FOR ALL TO authenticated
USING (user_id = get_account_owner_id(auth.uid()));

-- Add casino_api_config_id to workspaces
ALTER TABLE public.workspaces ADD COLUMN casino_api_config_id uuid REFERENCES public.casino_api_configs(id);
