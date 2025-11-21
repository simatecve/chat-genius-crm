-- Crear enum para roles de usuario
CREATE TYPE public.app_role AS ENUM ('superadmin', 'admin', 'user');

-- Crear enum para tipos de perfil
CREATE TYPE public.profile_type AS ENUM ('superadmin', 'client');

-- Tabla de perfiles de usuario
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  phone TEXT,
  profile_type public.profile_type DEFAULT 'client',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Tabla de roles de usuario (separada por seguridad)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Función security definer para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Tabla de conexiones de WhatsApp
CREATE TABLE public.whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone_number TEXT NOT NULL,
  qr_code TEXT,
  status TEXT DEFAULT 'disconnected',
  session_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;

-- Tabla de listas de contactos
CREATE TABLE public.contact_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contact_lists ENABLE ROW LEVEL SECURITY;

-- Tabla de contactos
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  company TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Tabla intermedia para contactos y listas
CREATE TABLE public.contact_list_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  list_id UUID REFERENCES public.contact_lists(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (contact_id, list_id)
);

ALTER TABLE public.contact_list_members ENABLE ROW LEVEL SECURITY;

-- Tabla de columnas del kanban
CREATE TABLE public.kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  position INTEGER NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;

-- Tabla de leads (tarjetas del kanban)
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  column_id UUID REFERENCES public.kanban_columns(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  company TEXT,
  value DECIMAL(10,2),
  notes TEXT,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Tabla de conversaciones
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone_number TEXT NOT NULL,
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

-- Tabla de mensajes
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  direction TEXT NOT NULL,
  status TEXT DEFAULT 'sent',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Tabla de agentes de IA
CREATE TABLE public.ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  model TEXT DEFAULT 'gpt-3.5-turbo',
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 500,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

-- Tabla de claves API de IA
CREATE TABLE public.ai_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL,
  api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, provider)
);

ALTER TABLE public.ai_api_keys ENABLE ROW LEVEL SECURITY;

-- Tabla de campañas
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  contact_list_id UUID REFERENCES public.contact_lists(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Tabla de disparadores de mensajes
CREATE TABLE public.message_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  column_id UUID REFERENCES public.kanban_columns(id) ON DELETE CASCADE NOT NULL,
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

-- Tabla de planes de pago
CREATE TABLE public.payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  billing_period TEXT NOT NULL,
  features JSONB,
  limits JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;

-- Tabla de métodos de pago
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  api_key TEXT,
  secret_key TEXT,
  webhook_url TEXT,
  supported_currencies TEXT[],
  configuration JSONB,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (provider)
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Tabla de suscripciones de usuarios
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.payment_plans(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'active',
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  payment_provider TEXT,
  external_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Tabla de uso del sistema
CREATE TABLE public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  resource_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies para profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Superadmins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'));

-- RLS Policies para user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'));

-- RLS Policies para whatsapp_connections
CREATE POLICY "Users can manage their own connections"
  ON public.whatsapp_connections FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all connections"
  ON public.whatsapp_connections FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'));

-- RLS Policies para contact_lists
CREATE POLICY "Users can manage their own contact lists"
  ON public.contact_lists FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all contact lists"
  ON public.contact_lists FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'));

-- RLS Policies para contacts
CREATE POLICY "Users can manage their own contacts"
  ON public.contacts FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all contacts"
  ON public.contacts FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'));

-- RLS Policies para contact_list_members
CREATE POLICY "Users can manage their own list members"
  ON public.contact_list_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.contact_lists
      WHERE id = list_id AND user_id = auth.uid()
    )
  );

-- RLS Policies para kanban_columns
CREATE POLICY "Users can manage their own columns"
  ON public.kanban_columns FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all columns"
  ON public.kanban_columns FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'));

-- RLS Policies para leads
CREATE POLICY "Users can manage their own leads"
  ON public.leads FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all leads"
  ON public.leads FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'));

-- RLS Policies para conversations
CREATE POLICY "Users can manage their own conversations"
  ON public.conversations FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all conversations"
  ON public.conversations FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'));

-- RLS Policies para messages
CREATE POLICY "Users can manage their own messages"
  ON public.messages FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all messages"
  ON public.messages FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'));

-- RLS Policies para ai_agents
CREATE POLICY "Users can manage their own AI agents"
  ON public.ai_agents FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all AI agents"
  ON public.ai_agents FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'));

-- RLS Policies para ai_api_keys
CREATE POLICY "Users can manage their own API keys"
  ON public.ai_api_keys FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies para campaigns
CREATE POLICY "Users can manage their own campaigns"
  ON public.campaigns FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all campaigns"
  ON public.campaigns FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'));

-- RLS Policies para message_triggers
CREATE POLICY "Users can manage their own triggers"
  ON public.message_triggers FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies para scheduled_messages
CREATE POLICY "Users can manage their own scheduled messages"
  ON public.scheduled_messages FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies para payment_plans
CREATE POLICY "Anyone can view active payment plans"
  ON public.payment_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Superadmins can manage payment plans"
  ON public.payment_plans FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'));

-- RLS Policies para payment_methods
CREATE POLICY "Users can view active payment methods"
  ON public.payment_methods FOR SELECT
  USING (is_active = true);

CREATE POLICY "Superadmins can manage payment methods"
  ON public.payment_methods FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'));

-- RLS Policies para user_subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can manage all subscriptions"
  ON public.user_subscriptions FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'));

-- RLS Policies para usage_tracking
CREATE POLICY "Users can view their own usage"
  ON public.usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all usage"
  ON public.usage_tracking FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'));

-- Función para crear perfil al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, profile_type)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    COALESCE((NEW.raw_user_meta_data->>'profile_type')::profile_type, 'client')
  );
  RETURN NEW;
END;
$$;

-- Trigger para crear perfil automáticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_connections_updated_at
  BEFORE UPDATE ON public.whatsapp_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contact_lists_updated_at
  BEFORE UPDATE ON public.contact_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kanban_columns_updated_at
  BEFORE UPDATE ON public.kanban_columns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_agents_updated_at
  BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_api_keys_updated_at
  BEFORE UPDATE ON public.ai_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_message_triggers_updated_at
  BEFORE UPDATE ON public.message_triggers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_plans_updated_at
  BEFORE UPDATE ON public.payment_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();