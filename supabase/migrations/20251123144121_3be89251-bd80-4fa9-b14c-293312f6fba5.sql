-- Reemplazar función existente con search_path correcto
CREATE OR REPLACE FUNCTION update_internal_messages_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;