-- Primero, mover mensajes de conversaciones duplicadas a la conversación principal (la más antigua)
WITH primary_convs AS (
  SELECT DISTINCT ON (user_id, phone_number, whatsapp_number, channel_type)
    id as primary_id, user_id, phone_number, whatsapp_number, channel_type
  FROM conversations
  WHERE channel_type = 'whatsapp'
  ORDER BY user_id, phone_number, whatsapp_number, channel_type, created_at ASC
),
duplicates AS (
  SELECT c.id as duplicate_id, p.primary_id
  FROM conversations c
  JOIN primary_convs p ON 
    c.user_id = p.user_id AND
    c.phone_number = p.phone_number AND
    COALESCE(c.whatsapp_number, '') = COALESCE(p.whatsapp_number, '') AND
    c.channel_type = p.channel_type
  WHERE c.id != p.primary_id AND c.channel_type = 'whatsapp'
)
UPDATE messages m
SET conversation_id = d.primary_id
FROM duplicates d
WHERE m.conversation_id = d.duplicate_id;

-- Eliminar conversaciones duplicadas de WhatsApp (mantener la más antigua)
DELETE FROM conversations c1
USING conversations c2
WHERE c1.id > c2.id 
  AND c1.user_id = c2.user_id
  AND c1.phone_number = c2.phone_number
  AND COALESCE(c1.whatsapp_number, '') = COALESCE(c2.whatsapp_number, '')
  AND c1.channel_type = c2.channel_type
  AND c1.channel_type = 'whatsapp';

-- Crear índice UNIQUE parcial solo para conversaciones WhatsApp
CREATE UNIQUE INDEX IF NOT EXISTS conversations_unique_whatsapp_session 
ON conversations (user_id, phone_number, whatsapp_number, channel_type)
WHERE channel_type = 'whatsapp' AND whatsapp_number IS NOT NULL;