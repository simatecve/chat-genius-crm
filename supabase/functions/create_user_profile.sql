-- Function to create user profile with elevated permissions
-- This function bypasses RLS policies for admin operations

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
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile TO service_role;