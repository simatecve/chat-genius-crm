-- Migration to create user_subscriptions table with proper RLS policies

-- Create user_subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'expired')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON public.user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires_at ON public.user_subscriptions(expires_at);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Superadmins can manage all user subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.user_subscriptions;

-- Create RLS policies
-- Policy for superadmins to manage all subscriptions
CREATE POLICY "Superadmins can manage all user subscriptions" ON public.user_subscriptions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.profile_type = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.profile_type = 'superadmin'
    )
  );

-- Policy for users to view their own subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.user_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON public.user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();