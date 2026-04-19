
-- Índices compuestos para acelerar las queries más frecuentes
-- (CONCURRENTLY no funciona dentro de migrations transaccionales, usamos CREATE INDEX IF NOT EXISTS)

-- Leads: filtros por usuario+columna+posición (Kanban board)
CREATE INDEX IF NOT EXISTS idx_leads_user_column_position 
  ON public.leads (user_id, column_id, position);

-- Messages: lectura por conversación ordenada por fecha (chat view)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
  ON public.messages (conversation_id, created_at DESC);

-- Messages: filtro por usuario + fecha (reportes)
CREATE INDEX IF NOT EXISTS idx_messages_user_created 
  ON public.messages (user_id, created_at DESC);

-- Conversations: lista por usuario ordenada por última actividad
CREATE INDEX IF NOT EXISTS idx_conversations_user_last_message 
  ON public.conversations (user_id, last_message_time DESC NULLS LAST);

-- Contact_details: búsqueda por conversación
CREATE INDEX IF NOT EXISTS idx_contact_details_conversation 
  ON public.contact_details (conversation_id) WHERE conversation_id IS NOT NULL;

-- Campaign_sends: búsqueda por campaña + estado (progreso de campañas)
CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign_status 
  ON public.campaign_sends (campaign_id, status);

-- AI response buffer: lookup por conversación + procesado
CREATE INDEX IF NOT EXISTS idx_ai_buffer_conversation_processed 
  ON public.ai_response_buffer (conversation_id, processed) WHERE processed = false;

-- Audit logs: búsqueda por usuario + fecha (panel de auditoría)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created 
  ON public.audit_logs (user_id, created_at DESC);

-- Scheduled messages: cron de envío de mensajes programados
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status_scheduled 
  ON public.scheduled_messages (status, scheduled_for) WHERE status = 'pending';

-- Automated message logs: cron de seguimiento
CREATE INDEX IF NOT EXISTS idx_automated_logs_status_scheduled 
  ON public.automated_message_logs (status, scheduled_for) WHERE status = 'pending';
