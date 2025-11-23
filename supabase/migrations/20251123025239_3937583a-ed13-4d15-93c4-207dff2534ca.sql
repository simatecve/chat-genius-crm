-- Crear tabla para tracking de envíos de campaña
CREATE TABLE IF NOT EXISTS public.campaign_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.mass_campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  message_sent TEXT NOT NULL,
  was_personalized BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.campaign_sends ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo vean sus propios envíos
CREATE POLICY "Users can manage their own campaign sends"
  ON public.campaign_sends
  FOR ALL
  USING (auth.uid() = user_id);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_campaign_sends_campaign_id ON public.campaign_sends(campaign_id);
CREATE INDEX idx_campaign_sends_status ON public.campaign_sends(status);
CREATE INDEX idx_campaign_sends_user_id ON public.campaign_sends(user_id);