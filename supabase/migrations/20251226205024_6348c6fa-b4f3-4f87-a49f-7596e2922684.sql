-- Repoblar last_inbound_message_time de todos los leads
-- usando el máximo last_inbound_message_time de las conversaciones asociadas
UPDATE public.leads l
SET last_inbound_message_time = sub.max_inbound
FROM (
  SELECT c.lead_id, MAX(c.last_inbound_message_time) as max_inbound
  FROM public.conversations c
  WHERE c.lead_id IS NOT NULL 
    AND c.last_inbound_message_time IS NOT NULL
  GROUP BY c.lead_id
) sub
WHERE l.id = sub.lead_id
  AND (l.last_inbound_message_time IS NULL OR sub.max_inbound > l.last_inbound_message_time);