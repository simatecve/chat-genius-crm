CREATE TABLE IF NOT EXISTS public.monthly_channel_cost_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  month DATE NOT NULL,
  twilio_messages INTEGER NOT NULL DEFAULT 0,
  whatsapp_api_messages INTEGER NOT NULL DEFAULT 0,
  twilio_cost NUMERIC NOT NULL DEFAULT 0,
  whatsapp_api_cost NUMERIC NOT NULL DEFAULT 0,
  internal_cost NUMERIC NOT NULL DEFAULT 0,
  external_cost NUMERIC NOT NULL DEFAULT 0,
  total_savings NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, month)
);

ALTER TABLE public.monthly_channel_cost_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view account monthly cost snapshots"
ON public.monthly_channel_cost_snapshots
FOR SELECT
USING (user_id = public.get_account_owner_id(auth.uid()));

CREATE POLICY "Users can create account monthly cost snapshots"
ON public.monthly_channel_cost_snapshots
FOR INSERT
WITH CHECK (user_id = public.get_account_owner_id(auth.uid()));

CREATE POLICY "Users can update account monthly cost snapshots"
ON public.monthly_channel_cost_snapshots
FOR UPDATE
USING (user_id = public.get_account_owner_id(auth.uid()))
WITH CHECK (user_id = public.get_account_owner_id(auth.uid()));

CREATE POLICY "Users can delete account monthly cost snapshots"
ON public.monthly_channel_cost_snapshots
FOR DELETE
USING (user_id = public.get_account_owner_id(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_monthly_channel_cost_snapshots_user_month
ON public.monthly_channel_cost_snapshots (user_id, month DESC);

CREATE TRIGGER update_monthly_channel_cost_snapshots_updated_at
BEFORE UPDATE ON public.monthly_channel_cost_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();