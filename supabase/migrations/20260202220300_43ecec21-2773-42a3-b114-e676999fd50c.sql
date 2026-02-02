-- Función RPC para obtener conteo de mensajes no leídos de forma eficiente
-- Evita traer todas las filas y calcular en JavaScript
CREATE OR REPLACE FUNCTION get_unread_count(user_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(unread_count), 0)::INTEGER
  FROM conversations
  WHERE user_id = get_account_owner_id(user_uuid) AND unread_count > 0;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;