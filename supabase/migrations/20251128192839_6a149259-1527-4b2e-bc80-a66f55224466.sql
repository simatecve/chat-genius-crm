-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can view their cashiers profiles" ON profiles;

-- The existing "Users can view their own profile" policy is sufficient
-- because cajeros will see their own profile (cajero type)
-- and admins will see their own profile (client type)
-- The useAccountUsers hook handles fetching related users via application logic