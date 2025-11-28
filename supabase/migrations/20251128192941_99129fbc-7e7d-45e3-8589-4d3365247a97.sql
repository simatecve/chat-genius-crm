-- Drop the problematic recursive policies for roles and permissions
DROP POLICY IF EXISTS "Admins can view their cashiers roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view their cashiers permissions" ON user_permissions;

-- Create safe policies using get_account_owner_id
CREATE POLICY "Users can view roles in their account"
ON user_roles
FOR SELECT
TO authenticated
USING (
  get_account_owner_id(user_id) = get_account_owner_id(auth.uid())
  OR user_id = auth.uid()
);

CREATE POLICY "Users can view permissions in their account"
ON user_permissions
FOR SELECT
TO authenticated
USING (
  get_account_owner_id(user_id) = get_account_owner_id(auth.uid())
  OR user_id = auth.uid()
);