-- Corregir leads existentes con last_inbound_message_time NULL
-- Usando el timestamp de sus conversaciones o created_at como fallback
UPDATE leads l
SET last_inbound_message_time = COALESCE(
  (
    SELECT MAX(c.last_inbound_message_time)
    FROM conversations c
    WHERE c.lead_id = l.id
      AND c.last_inbound_message_time IS NOT NULL
  ),
  l.created_at
)
WHERE l.last_inbound_message_time IS NULL;