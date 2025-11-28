-- Allow admins to view profiles of their cashiers (cajeros)
CREATE POLICY "Admins can view their cashiers profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- User can view profiles where they are the parent (admin viewing their cajeros)
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND profiles.parent_user_id = p.id
    AND p.profile_type = 'client'
  )
);

-- Allow admins to view user_roles of their cashiers
CREATE POLICY "Admins can view their cashiers roles"
ON user_roles
FOR SELECT
TO authenticated
USING (
  -- Admin can view roles of users they created (their cajeros)
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = user_roles.user_id
    AND profiles.parent_user_id = auth.uid()
  )
);

-- Allow admins to view user_permissions of their cashiers
CREATE POLICY "Admins can view their cashiers permissions"
ON user_permissions
FOR SELECT
TO authenticated
USING (
  -- Admin can view permissions of users they created (their cajeros)
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = user_permissions.user_id
    AND profiles.parent_user_id = auth.uid()
  )
);