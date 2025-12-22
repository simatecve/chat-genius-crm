-- Índice compuesto optimizado para consultas de webchat
-- Cubre: WHERE user_id = X AND channel_type = 'webchat' ORDER BY last_message_time DESC
CREATE INDEX IF NOT EXISTS idx_conversations_user_channel_time 
ON public.conversations(user_id, channel_type, last_message_time DESC);