-- Eliminar tablas con nombres incorrectos si existen
DROP TABLE IF EXISTS public.scheduled_messages CASCADE;
DROP TABLE IF EXISTS public.message_triggers CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.contact_list_members CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.kanban_columns CASCADE;

-- Crear tabla lead_columns (no kanban_columns)
CREATE TABLE public.lead_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  position INTEGER NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.lead_columns ENABLE ROW LEVEL SECURITY;

-- Tabla de leads con todos los campos necesarios
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  column_id UUID REFERENCES public.lead_columns(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  company TEXT,
  value DECIMAL(10,2),
  notes TEXT,
  position INTEGER NOT NULL,
  bot_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Tabla de contactos con phone_number
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT,
  company TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Tabla intermedia con contact_list_id
CREATE TABLE public.contact_list_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  contact_list_id UUID REFERENCES public.contact_lists(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (contact_id, contact_list_id)
);

ALTER TABLE public.contact_list_members ENABLE ROW LEVEL SECURITY;

-- Tabla de conversaciones con campos adicionales
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone_number TEXT NOT NULL,
  whatsapp_number TEXT,
  pushname TEXT,
  contact_name TEXT,
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Tabla de mensajes con campos de archivos
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  direction TEXT NOT NULL,
  status TEXT DEFAULT 'sent',
  file_url TEXT,
  attachment_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Tabla mass_campaigns (no campaigns)
CREATE TABLE public.mass_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  contact_list_id UUID REFERENCES public.contact_lists(id) ON DELETE CASCADE,
  whatsapp_connection_id UUID REFERENCES public.whatsapp_connections(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.mass_campaigns ENABLE ROW LEVEL SECURITY;

-- Tabla de disparadores de mensajes
CREATE TABLE public.message_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  column_id UUID REFERENCES public.lead_columns(id) ON DELETE CASCADE NOT NULL,
  message_title TEXT NOT NULL,
  message_content TEXT NOT NULL,
  delay_hours INTEGER DEFAULT 0,
  trigger_condition TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.message_triggers ENABLE ROW LEVEL SECURITY;

-- Tabla de mensajes programados
CREATE TABLE public.scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  trigger_id UUID REFERENCES public.message_triggers(id) ON DELETE CASCADE NOT NULL,
  phone_number TEXT NOT NULL,
  message_content TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

-- Tabla de uso (simplificada sin dependencias de planes)
CREATE TABLE public.user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  usage_month DATE NOT NULL,
  whatsapp_connections_used INTEGER DEFAULT 0,
  contacts_used INTEGER DEFAULT 0,
  campaigns_this_month INTEGER DEFAULT 0,
  bot_responses_this_month INTEGER DEFAULT 0,
  storage_used_mb INTEGER DEFAULT 0,
  device_sessions_used INTEGER DEFAULT 0,
  conversations_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, usage_month)
);

ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies básicas (todos pueden gestionar sus propios datos)
CREATE POLICY "Users can manage their own lead_columns"
  ON public.lead_columns FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own leads"
  ON public.leads FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own contacts"
  ON public.contacts FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own list members"
  ON public.contact_list_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.contact_lists
      WHERE id = contact_list_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own conversations"
  ON public.conversations FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own messages"
  ON public.messages FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own campaigns"
  ON public.mass_campaigns FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own triggers"
  ON public.message_triggers FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own scheduled messages"
  ON public.scheduled_messages FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own usage"
  ON public.user_usage FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all lead_columns"
  ON public.lead_columns FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can view all leads"
  ON public.leads FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can view all conversations"
  ON public.conversations FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can view all messages"
  ON public.messages FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'));

-- Triggers para updated_at
CREATE TRIGGER update_lead_columns_updated_at
  BEFORE UPDATE ON public.lead_columns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mass_campaigns_updated_at
  BEFORE UPDATE ON public.mass_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_message_triggers_updated_at
  BEFORE UPDATE ON public.message_triggers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_usage_updated_at
  BEFORE UPDATE ON public.user_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();