-- Migration to fix RLS policies for profiles table
-- This ensures proper permissions for user creation

-- Create the RPC function for creating user profiles
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id UUID,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_company_name TEXT DEFAULT NULL,
  p_profile_type profile_type DEFAULT 'cliente'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert the profile with elevated permissions
  INSERT INTO profiles (
    id,
    first_name,
    last_name,
    phone,
    company_name,
    profile_type,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    p_first_name,
    p_last_name,
    p_phone,
    p_company_name,
    p_profile_type,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    company_name = EXCLUDED.company_name,
    profile_type = EXCLUDED.profile_type,
    updated_at = NOW();
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile TO service_role;
GRANT EXECUTE ON FUNCTION create_user_profile TO anon;

-- Enable RLS on profiles table if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Create policy to allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create policy to allow service role to insert profiles
CREATE POLICY "Service role can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);

-- Create policy to allow service role to update profiles
CREATE POLICY "Service role can update profiles" ON profiles
  FOR UPDATE USING (true);

-- Create policy to allow service role to delete profiles
CREATE POLICY "Service role can delete profiles" ON profiles
  FOR DELETE USING (true);

-- Create policy to allow authenticated users with admin role to manage all profiles
CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.profile_type = 'admin'
    )
  );

-- Create policy to allow superadmin to insert profiles
CREATE POLICY "Superadmin can insert profiles" ON profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.profile_type = 'superadmin'
    )
  );

-- Create policy to allow superadmin to manage all profiles
CREATE POLICY "Superadmin can manage all profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.profile_type = 'superadmin'
    )
  );