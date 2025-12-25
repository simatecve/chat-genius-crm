-- 1. Agregar columna last_inbound_message_time a leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_inbound_message_time TIMESTAMPTZ;

-- 2. Crear índice para ordenamiento rápido por columna y tiempo
CREATE INDEX IF NOT EXISTS idx_leads_last_inbound_message_time 
ON public.leads(column_id, last_inbound_message_time DESC NULLS LAST);

-- 3. Actualizar función del trigger para también actualizar last_inbound_message_time en leads
CREATE OR REPLACE FUNCTION public.update_lead_on_inbound_message()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.direction = 'inbound' THEN
    UPDATE public.leads l
    SET 
      updated_at = NEW.created_at,
      last_inbound_message_time = NEW.created_at
    FROM public.conversations c
    WHERE c.id = NEW.conversation_id
      AND c.lead_id IS NOT NULL
      AND l.id = c.lead_id
      AND (l.last_inbound_message_time IS NULL OR NEW.created_at > l.last_inbound_message_time);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Poblar datos existentes desde conversaciones
UPDATE public.leads l
SET last_inbound_message_time = sub.max_inbound_time
FROM (
  SELECT c.lead_id, MAX(c.last_inbound_message_time) as max_inbound_time
  FROM public.conversations c
  WHERE c.lead_id IS NOT NULL AND c.last_inbound_message_time IS NOT NULL
  GROUP BY c.lead_id
) sub
WHERE l.id = sub.lead_id;