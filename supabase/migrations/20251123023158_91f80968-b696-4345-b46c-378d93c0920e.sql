-- Función para crear workspace y embudo por defecto al registrar un usuario
CREATE OR REPLACE FUNCTION public.setup_default_workspace_and_funnel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_workspace_id uuid;
  new_column_id uuid;
BEGIN
  -- Crear workspace por defecto
  INSERT INTO public.workspaces (user_id, name, position)
  VALUES (NEW.id, 'Mi Espacio de Trabajo', 0)
  RETURNING id INTO new_workspace_id;

  -- Crear columna de leads por defecto en ese workspace
  INSERT INTO public.lead_columns (user_id, workspace_id, name, color, position, is_default)
  VALUES (NEW.id, new_workspace_id, 'Nuevos Contactos', '#22c55e', 0, true)
  RETURNING id INTO new_column_id;

  RETURN NEW;
END;
$$;

-- Trigger que se ejecuta después de crear un perfil
DROP TRIGGER IF EXISTS on_profile_created_setup_workspace ON public.profiles;
CREATE TRIGGER on_profile_created_setup_workspace
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.setup_default_workspace_and_funnel();

COMMENT ON FUNCTION public.setup_default_workspace_and_funnel() IS 'Crea automáticamente un workspace y embudo por defecto cuando se registra un nuevo usuario';