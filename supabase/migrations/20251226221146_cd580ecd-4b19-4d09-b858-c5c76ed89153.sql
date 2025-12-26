-- Corregir leads existentes con last_inbound_message_time NULL
-- usando el timestamp de sus conversaciones asociadas
UPDATE leads l
SET last_inbound_message_time = (
  SELECT MAX(c.last_inbound_message_time)
  FROM conversations c
  WHERE c.lead_id = l.id
    AND c.last_inbound_message_time IS NOT NULL
)
WHERE l.last_inbound_message_time IS NULL
  AND EXISTS (
    SELECT 1 FROM conversations c 
    WHERE c.lead_id = l.id 
    AND c.last_inbound_message_time IS NOT NULL
  );