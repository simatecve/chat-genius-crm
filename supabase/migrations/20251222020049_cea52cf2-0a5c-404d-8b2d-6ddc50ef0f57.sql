-- Agregar columna channel_type a workspaces para distinguir entre WhatsApp, WebChat, Telegram
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS channel_type text DEFAULT 'whatsapp';

-- Comentario para documentación
COMMENT ON COLUMN public.workspaces.channel_type IS 'Tipo de canal: whatsapp, webchat, telegram, all';