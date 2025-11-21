-- Agregar campos de reintento a automated_message_logs
ALTER TABLE public.automated_message_logs
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS last_retry_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS scheduled_for timestamp with time zone;

-- Actualizar los registros existentes para que scheduled_for = sent_at
UPDATE public.automated_message_logs
SET scheduled_for = sent_at
WHERE scheduled_for IS NULL;

-- Crear índice para mejorar performance de consultas de mensajes pendientes
CREATE INDEX IF NOT EXISTS idx_automated_message_logs_pending 
ON public.automated_message_logs(status, scheduled_for) 
WHERE status = 'pending';