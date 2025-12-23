-- Corregir leads existentes: crear nuevo lead para la conversación del canal +19786482121

-- Paso 1: Obtener la columna por defecto del canal 2121 (PRINCIPAL en workspace 0a86c8b2)
-- La conversación bb572aac-e180-4559-b8a7-6a36f09515ad está asociada al canal 2121

-- Crear nuevo lead para el canal 2121 en la columna PRINCIPAL
INSERT INTO public.leads (
  user_id, 
  column_id, 
  name, 
  phone, 
  position, 
  notes, 
  bot_active
)
SELECT 
  'aceeab1a-ec2e-44c7-90c5-7382102955fd' as user_id,
  tc.default_column_id as column_id,
  c.pushname as name,
  c.phone_number as phone,
  COALESCE((SELECT MAX(position) + 1 FROM leads WHERE column_id = tc.default_column_id), 0) as position,
  'Lead creado desde Twilio canal +19786482121 (corregido)' as notes,
  true as bot_active
FROM conversations c
JOIN twilio_connections tc ON tc.id = c.twilio_connection_id
WHERE c.id = 'bb572aac-e180-4559-b8a7-6a36f09515ad'
  AND tc.default_column_id IS NOT NULL
  AND NOT EXISTS (
    -- Verificar que no existe ya un lead para este teléfono en columnas del mismo workspace
    SELECT 1 FROM leads l 
    JOIN lead_columns lc ON lc.id = l.column_id
    WHERE l.phone = c.phone_number 
      AND l.user_id = 'aceeab1a-ec2e-44c7-90c5-7382102955fd'
      AND lc.workspace_id = tc.workspace_id
  );

-- Paso 2: Actualizar la conversación para que apunte al nuevo lead (si se creó)
UPDATE conversations c
SET lead_id = (
  SELECT l.id 
  FROM leads l
  JOIN lead_columns lc ON lc.id = l.column_id
  JOIN twilio_connections tc ON tc.workspace_id = lc.workspace_id
  WHERE l.phone = c.phone_number 
    AND tc.id = c.twilio_connection_id
    AND l.user_id = c.user_id
  ORDER BY l.created_at DESC
  LIMIT 1
)
WHERE c.id = 'bb572aac-e180-4559-b8a7-6a36f09515ad';