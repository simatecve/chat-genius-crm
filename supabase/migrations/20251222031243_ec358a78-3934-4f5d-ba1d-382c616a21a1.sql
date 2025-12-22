-- =============================================
-- FASE 1: Arreglar políticas RLS de etiquetas
-- =============================================

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Users can view their own tags" ON public.etiquetas;
DROP POLICY IF EXISTS "Users can update their own tags" ON public.etiquetas;
DROP POLICY IF EXISTS "Users can delete their own tags" ON public.etiquetas;

-- Crear nuevas políticas usando get_account_owner_id para consistencia
CREATE POLICY "Users can view account tags" 
ON public.etiquetas FOR SELECT
USING (
  creado_por = get_account_owner_id(auth.uid()) 
  OR creado_por = auth.uid()
  OR organizacion_id IS NULL 
  OR creado_por IS NULL
);

CREATE POLICY "Users can update account tags" 
ON public.etiquetas FOR UPDATE
USING (creado_por = get_account_owner_id(auth.uid()) OR creado_por = auth.uid())
WITH CHECK (creado_por = get_account_owner_id(auth.uid()) OR creado_por = auth.uid());

CREATE POLICY "Users can delete account tags" 
ON public.etiquetas FOR DELETE
USING (creado_por = get_account_owner_id(auth.uid()) OR creado_por = auth.uid());

-- =============================================
-- FASE 2: Crear índices críticos para rendimiento
-- =============================================

-- Índices para conversations (críticos para velocidad)
CREATE INDEX IF NOT EXISTS idx_conversations_user_id 
ON public.conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_conversations_user_last_message 
ON public.conversations(user_id, last_message_time DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_phone 
ON public.conversations(phone_number);

CREATE INDEX IF NOT EXISTS idx_conversations_lead 
ON public.conversations(lead_id);

-- Índices para messages (críticos para velocidad)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
ON public.messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON public.messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_user_id 
ON public.messages(user_id);

-- Índices para leads
CREATE INDEX IF NOT EXISTS idx_leads_column_id 
ON public.leads(column_id);

CREATE INDEX IF NOT EXISTS idx_leads_user_id 
ON public.leads(user_id);

CREATE INDEX IF NOT EXISTS idx_leads_phone 
ON public.leads(phone);

-- Índices adicionales para etiquetas
CREATE INDEX IF NOT EXISTS idx_etiquetas_creado_por 
ON public.etiquetas(creado_por);