-- Corregir función update_contact_full_name con security definer y search_path
CREATE OR REPLACE FUNCTION update_contact_full_name()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.name = TRIM(CONCAT(COALESCE(NEW.first_name, ''), ' ', COALESCE(NEW.last_name, '')));
  RETURN NEW;
END;
$$;