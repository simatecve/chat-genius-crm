-- Agregar campo n8n_webhook_url a twilio_connections
ALTER TABLE twilio_connections 
ADD COLUMN IF NOT EXISTS n8n_webhook_url TEXT;

-- Agregar campo n8n_webhook_url a whatsapp_connections
ALTER TABLE whatsapp_connections 
ADD COLUMN IF NOT EXISTS n8n_webhook_url TEXT;