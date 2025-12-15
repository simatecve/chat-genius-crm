-- Add ai_enabled column to all connection tables for per-session AI activation

-- WhatsApp connections
ALTER TABLE whatsapp_connections ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT false;

-- Telegram bots
ALTER TABLE telegram_bots ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT false;

-- Twilio connections
ALTER TABLE twilio_connections ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT false;

-- Web chatbots
ALTER TABLE web_chatbots ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN whatsapp_connections.ai_enabled IS 'Whether unified AI is enabled for this WhatsApp session';
COMMENT ON COLUMN telegram_bots.ai_enabled IS 'Whether unified AI is enabled for this Telegram bot';
COMMENT ON COLUMN twilio_connections.ai_enabled IS 'Whether unified AI is enabled for this Twilio connection';
COMMENT ON COLUMN web_chatbots.ai_enabled IS 'Whether unified AI is enabled for this WebChat widget';