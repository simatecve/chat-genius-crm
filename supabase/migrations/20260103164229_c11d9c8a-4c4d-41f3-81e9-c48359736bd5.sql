-- Paso 1: Crear tabla temporal con las conversaciones que necesitan nuevo lead
CREATE TEMP TABLE conversations_to_separate AS
WITH ranked_conversations AS (
  SELECT 
    c.id as conversation_id,
    c.lead_id,
    c.whatsapp_number,
    c.phone_number,
    c.pushname,
    c.user_id,
    c.created_at,
    l.name as lead_name,
    l.column_id,
    l.phone as lead_phone,
    l.email,
    l.company,
    l.notes as lead_notes,
    l.tags,
    l.value,
    l.bot_active,
    l.last_inbound_message_time,
    ROW_NUMBER() OVER (
      PARTITION BY c.lead_id 
      ORDER BY c.created_at ASC
    ) as rn
  FROM conversations c
  JOIN leads l ON c.lead_id = l.id
  WHERE c.channel_type = 'whatsapp'
    AND c.whatsapp_number IS NOT NULL
    AND c.lead_id IN (
      SELECT l2.id
      FROM leads l2
      JOIN conversations c2 ON c2.lead_id = l2.id
      WHERE c2.channel_type = 'whatsapp'
        AND c2.whatsapp_number IS NOT NULL
      GROUP BY l2.id
      HAVING COUNT(DISTINCT c2.whatsapp_number) > 1
    )
)
SELECT * FROM ranked_conversations WHERE rn > 1;

-- Paso 2: Crear nuevos leads para cada conversación (excepto la primera)
DO $$
DECLARE
  conv RECORD;
  new_lead_id UUID;
  next_position INT;
BEGIN
  FOR conv IN SELECT * FROM conversations_to_separate LOOP
    SELECT COALESCE(MAX(position), 0) + 1 INTO next_position
    FROM leads WHERE column_id = conv.column_id;
    
    INSERT INTO leads (
      id, user_id, name, phone, email, company, notes, tags, value,
      column_id, position, bot_active, last_inbound_message_time,
      created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      conv.user_id,
      conv.lead_name,
      conv.lead_phone,
      conv.email,
      conv.company,
      'Lead separado desde WhatsApp: ' || COALESCE(conv.whatsapp_number, 'desconocido'),
      conv.tags,
      conv.value,
      conv.column_id,
      next_position,
      conv.bot_active,
      conv.last_inbound_message_time,
      conv.created_at,
      NOW()
    ) RETURNING id INTO new_lead_id;
    
    UPDATE conversations 
    SET lead_id = new_lead_id
    WHERE id = conv.conversation_id;
  END LOOP;
END $$;

-- Paso 3: Limpiar
DROP TABLE IF EXISTS conversations_to_separate;