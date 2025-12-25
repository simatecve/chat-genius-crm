-- Agregar columna last_inbound_message_time a conversations
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS last_inbound_message_time TIMESTAMPTZ;

-- Popular la columna con datos existentes de mensajes entrantes
UPDATE public.conversations c
SET last_inbound_message_time = (
  SELECT MAX(created_at) 
  FROM public.messages m 
  WHERE m.conversation_id = c.id 
  AND m.direction = 'inbound'
);

-- Crear función para actualizar last_inbound_message_time
CREATE OR REPLACE FUNCTION public.update_last_inbound_message_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.direction = 'inbound' THEN
    UPDATE public.conversations 
    SET last_inbound_message_time = NEW.created_at
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Crear trigger para actualizar automáticamente cuando llega mensaje inbound
DROP TRIGGER IF EXISTS trigger_update_last_inbound_message_time ON public.messages;
CREATE TRIGGER trigger_update_last_inbound_message_time
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_last_inbound_message_time();