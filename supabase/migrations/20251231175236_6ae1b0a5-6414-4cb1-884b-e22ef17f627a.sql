-- PASO 1: Eliminar mensajes duplicados por waha_id (mantener solo el primero creado)
DELETE FROM messages 
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (
             PARTITION BY metadata->>'waha_id' 
             ORDER BY created_at ASC
           ) as rn
    FROM messages 
    WHERE metadata->>'waha_id' IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- PASO 2: Crear índice único para mensajes por waha_id
CREATE UNIQUE INDEX IF NOT EXISTS messages_unique_waha_id 
ON messages ((metadata->>'waha_id')) 
WHERE metadata->>'waha_id' IS NOT NULL;

-- PASO 3: Función RPC para verificar si un mensaje ya existe por waha_id
CREATE OR REPLACE FUNCTION public.check_message_exists_by_waha_id(p_waha_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM messages 
    WHERE metadata->>'waha_id' = p_waha_id
  );
END;
$$;