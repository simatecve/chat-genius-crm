-- 1. Agregar columna parent_user_id a profiles para jerarquía de usuarios
ALTER TABLE profiles 
ADD COLUMN parent_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Índice para búsquedas eficientes
CREATE INDEX idx_profiles_parent_user_id ON profiles(parent_user_id);

-- Comentario explicativo
COMMENT ON COLUMN profiles.parent_user_id IS 'ID del usuario padre (admin) para usuarios cajero. NULL para superadmin y clients.';

-- 2. Crear función helper para obtener el ID del dueño de la cuenta
CREATE OR REPLACE FUNCTION get_account_owner_id(user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT parent_user_id FROM profiles WHERE id = user_id),
    user_id
  )
$$;

COMMENT ON FUNCTION get_account_owner_id IS 'Retorna el parent_user_id si es cajero, o el mismo user_id si es admin. Usado para compartir datos entre admin y cajeros.';

-- 3. Actualizar RLS policies para compartir datos dentro de la misma cuenta

-- Contacts
DROP POLICY IF EXISTS "Users can manage their own contacts" ON contacts;
CREATE POLICY "Users can manage account contacts" ON contacts
FOR ALL USING (
  user_id = get_account_owner_id(auth.uid())
);

-- Conversations
DROP POLICY IF EXISTS "Users can manage their own conversations" ON conversations;
CREATE POLICY "Users can manage account conversations" ON conversations
FOR ALL USING (
  user_id = get_account_owner_id(auth.uid())
);

-- Messages
DROP POLICY IF EXISTS "Users can manage their own messages" ON messages;
CREATE POLICY "Users can manage account messages" ON messages
FOR ALL USING (
  user_id = get_account_owner_id(auth.uid())
);

-- Leads
DROP POLICY IF EXISTS "Users can manage their own leads" ON leads;
CREATE POLICY "Users can manage account leads" ON leads
FOR ALL USING (
  user_id = get_account_owner_id(auth.uid())
);

-- Lead Columns
DROP POLICY IF EXISTS "Users can manage their own lead_columns" ON lead_columns;
CREATE POLICY "Users can manage account lead_columns" ON lead_columns
FOR ALL USING (
  user_id = get_account_owner_id(auth.uid())
);

-- Workspaces
DROP POLICY IF EXISTS "Users can manage their own workspaces" ON workspaces;
CREATE POLICY "Users can manage account workspaces" ON workspaces
FOR ALL USING (
  user_id = get_account_owner_id(auth.uid())
);

-- Contact Lists
DROP POLICY IF EXISTS "Users can manage their own contact lists" ON contact_lists;
CREATE POLICY "Users can manage account contact lists" ON contact_lists
FOR ALL USING (
  user_id = get_account_owner_id(auth.uid())
);

-- Mass Campaigns
DROP POLICY IF EXISTS "Users can manage their own campaigns" ON mass_campaigns;
CREATE POLICY "Users can manage account campaigns" ON mass_campaigns
FOR ALL USING (
  user_id = get_account_owner_id(auth.uid())
);

-- Quick Replies
DROP POLICY IF EXISTS "Users can manage their own quick replies" ON quick_replies;
CREATE POLICY "Users can manage account quick replies" ON quick_replies
FOR ALL USING (
  user_id = get_account_owner_id(auth.uid())
);

-- AI Agents
DROP POLICY IF EXISTS "Users can manage their own AI agents" ON ai_agents;
CREATE POLICY "Users can manage account AI agents" ON ai_agents
FOR ALL USING (
  user_id = get_account_owner_id(auth.uid())
);

-- WhatsApp Connections
DROP POLICY IF EXISTS "Users can manage their own connections" ON whatsapp_connections;
CREATE POLICY "Users can manage account connections" ON whatsapp_connections
FOR ALL USING (
  user_id = get_account_owner_id(auth.uid())
);

-- Telegram Bots
DROP POLICY IF EXISTS "Users can manage their own telegram bots" ON telegram_bots;
CREATE POLICY "Users can manage account telegram bots" ON telegram_bots
FOR ALL USING (
  user_id = get_account_owner_id(auth.uid())
);

-- Twilio Connections
DROP POLICY IF EXISTS "Users can manage their own twilio connections" ON twilio_connections;
CREATE POLICY "Users can manage account twilio connections" ON twilio_connections
FOR ALL USING (
  user_id = get_account_owner_id(auth.uid())
);

-- Products
DROP POLICY IF EXISTS "Users can manage their own products" ON products;
CREATE POLICY "Users can manage account products" ON products
FOR ALL USING (
  user_id = get_account_owner_id(auth.uid())
);

-- Sales
DROP POLICY IF EXISTS "Users can manage their own sales" ON sales;
CREATE POLICY "Users can manage account sales" ON sales
FOR ALL USING (
  user_id = get_account_owner_id(auth.uid())
);

-- Contact Details
DROP POLICY IF EXISTS "Users can manage their own contact details" ON contact_details;
CREATE POLICY "Users can manage account contact details" ON contact_details
FOR ALL USING (
  user_id = get_account_owner_id(auth.uid())
);

-- Contact Sales
DROP POLICY IF EXISTS "Users can manage their own contact sales" ON contact_sales;
CREATE POLICY "Users can manage account contact sales" ON contact_sales
FOR ALL USING (
  user_id = get_account_owner_id(auth.uid())
);

-- Automated Message Logs
DROP POLICY IF EXISTS "Users can manage their own automated message logs" ON automated_message_logs;
CREATE POLICY "Users can manage account automated message logs" ON automated_message_logs
FOR ALL USING (
  user_id = get_account_owner_id(auth.uid())
);

-- Campaign Sends
DROP POLICY IF EXISTS "Users can manage their own campaign sends" ON campaign_sends;
CREATE POLICY "Users can manage account campaign sends" ON campaign_sends
FOR ALL USING (
  user_id = get_account_owner_id(auth.uid())
);

-- Column Message Triggers
DROP POLICY IF EXISTS "Users can manage their own triggers" ON column_message_triggers;
CREATE POLICY "Users can manage account triggers" ON column_message_triggers
FOR ALL USING (
  user_id = get_account_owner_id(auth.uid())
);

-- Scheduled Messages
DROP POLICY IF EXISTS "Users can manage their own scheduled messages" ON scheduled_messages;
CREATE POLICY "Users can manage account scheduled messages" ON scheduled_messages
FOR ALL USING (
  user_id = get_account_owner_id(auth.uid())
);

-- Contacto Bloqueado Bot
DROP POLICY IF EXISTS "Users can manage their own blocked contacts" ON contacto_bloqueado_bot;
CREATE POLICY "Users can manage account blocked contacts" ON contacto_bloqueado_bot
FOR ALL USING (
  user_id = get_account_owner_id(auth.uid())
);

-- User Bot Settings
DROP POLICY IF EXISTS "Users can manage their own bot settings" ON user_bot_settings;
CREATE POLICY "Users can manage account bot settings" ON user_bot_settings
FOR ALL USING (
  user_id = get_account_owner_id(auth.uid())
);

-- AI API Keys
DROP POLICY IF EXISTS "Users can manage their own API keys" ON ai_api_keys;
CREATE POLICY "Users can manage account API keys" ON ai_api_keys
FOR ALL USING (
  user_id = get_account_owner_id(auth.uid())
);