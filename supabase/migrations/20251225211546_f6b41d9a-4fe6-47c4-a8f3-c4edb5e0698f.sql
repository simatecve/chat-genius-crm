-- Crear función para actualizar updated_at del lead cuando llega mensaje inbound
CREATE OR REPLACE FUNCTION public.update_lead_on_inbound_message()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.direction = 'inbound' THEN
    UPDATE public.leads l
    SET updated_at = NEW.created_at
    FROM public.conversations c
    WHERE c.id = NEW.conversation_id
      AND c.lead_id = l.id
      AND c.lead_id IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Crear trigger en tabla messages
CREATE TRIGGER trigger_update_lead_on_inbound_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_lead_on_inbound_message();

-- Actualizar leads existentes con el último mensaje inbound
UPDATE public.leads l
SET updated_at = c.last_inbound_message_time
FROM public.conversations c
WHERE c.lead_id = l.id
  AND c.last_inbound_message_time IS NOT NULL
  AND c.last_inbound_message_time > l.updated_at;