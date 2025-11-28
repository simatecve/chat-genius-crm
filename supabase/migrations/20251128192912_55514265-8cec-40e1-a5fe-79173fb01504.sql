-- Create a safe policy for admins to view their cashiers
-- This uses the existing get_account_owner_id function which is security definer
-- and doesn't cause recursion
CREATE POLICY "Users can view profiles in their account"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- Can view profiles that belong to the same account
  get_account_owner_id(id) = get_account_owner_id(auth.uid())
  OR id = auth.uid()  -- Can always view own profile
);