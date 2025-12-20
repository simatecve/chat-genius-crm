-- Tabla para tracking de límite diario de mensajes de Twilio (200 msgs/día)
CREATE TABLE IF NOT EXISTS twilio_daily_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  twilio_connection_id uuid NOT NULL REFERENCES twilio_connections(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  messages_sent integer DEFAULT 0,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(twilio_connection_id, usage_date)
);

-- Habilitar RLS
ALTER TABLE twilio_daily_usage ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios puedan ver y gestionar su uso
CREATE POLICY "Users can manage their Twilio usage"
ON twilio_daily_usage
FOR ALL
USING (user_id = get_account_owner_id(auth.uid()));

-- Índice para consultas rápidas por fecha y conexión
CREATE INDEX idx_twilio_daily_usage_lookup ON twilio_daily_usage(twilio_connection_id, usage_date);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_twilio_daily_usage_updated_at
BEFORE UPDATE ON twilio_daily_usage
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();