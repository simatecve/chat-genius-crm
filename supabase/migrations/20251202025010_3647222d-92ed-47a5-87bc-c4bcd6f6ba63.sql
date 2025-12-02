-- Crear tabla para buffer de respuestas de IA
CREATE TABLE ai_response_buffer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  first_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  message_count INTEGER NOT NULL DEFAULT 1,
  accumulated_messages JSONB NOT NULL DEFAULT '[]'::JSONB,
  channel_type TEXT NOT NULL DEFAULT 'whatsapp',
  session_name TEXT,
  telegram_bot_id UUID REFERENCES telegram_bots(id),
  twilio_connection_id UUID REFERENCES twilio_connections(id),
  phone_number TEXT NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para búsquedas eficientes de buffers pendientes
CREATE INDEX idx_ai_buffer_pending ON ai_response_buffer(processed, first_message_at) WHERE processed = FALSE;

-- Índice para búsqueda por conversación
CREATE INDEX idx_ai_buffer_conversation ON ai_response_buffer(conversation_id) WHERE processed = FALSE;

-- RLS policies
ALTER TABLE ai_response_buffer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own buffers"
  ON ai_response_buffer FOR SELECT
  USING (user_id = get_account_owner_id(auth.uid()));

CREATE POLICY "System can insert buffers"
  ON ai_response_buffer FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update buffers"
  ON ai_response_buffer FOR UPDATE
  USING (true);