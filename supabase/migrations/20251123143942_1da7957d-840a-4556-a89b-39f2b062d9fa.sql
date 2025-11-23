-- Crear tabla para mensajes internos entre usuarios
CREATE TABLE IF NOT EXISTS public.internal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_internal_messages_sender ON public.internal_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_internal_messages_receiver ON public.internal_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_internal_messages_created_at ON public.internal_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_messages_conversation ON public.internal_messages(sender_id, receiver_id, created_at DESC);

-- Habilitar RLS
ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver mensajes donde son sender o receiver
CREATE POLICY "Users can view their own messages"
ON public.internal_messages
FOR SELECT
USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- Política: Los usuarios pueden insertar mensajes donde son el sender
CREATE POLICY "Users can send messages"
ON public.internal_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
);

-- Política: Los usuarios pueden actualizar mensajes donde son el receiver (para marcar como leído)
CREATE POLICY "Users can update received messages"
ON public.internal_messages
FOR UPDATE
USING (
  auth.uid() = receiver_id
)
WITH CHECK (
  auth.uid() = receiver_id
);

-- Política: Los usuarios pueden eliminar sus mensajes enviados
CREATE POLICY "Users can delete sent messages"
ON public.internal_messages
FOR DELETE
USING (
  auth.uid() = sender_id
);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_internal_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_internal_messages_updated_at_trigger
BEFORE UPDATE ON public.internal_messages
FOR EACH ROW
EXECUTE FUNCTION update_internal_messages_updated_at();

-- Habilitar realtime para mensajes internos
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_messages;