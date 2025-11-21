-- Script para corregir el aislamiento de datos en el panel de cliente
-- Ejecutar este script en el SQL Editor de Supabase Dashboard

-- =====================================================
-- TABLA: leads
-- =====================================================

-- Habilitar RLS en la tabla leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can manage own leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can manage all leads" ON public.leads;
DROP POLICY IF EXISTS "Superadmins can manage all leads" ON public.leads;

-- Crear política para que usuarios solo vean sus propios leads
CREATE POLICY "Users can view own leads" ON public.leads
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Crear política para que usuarios puedan insertar sus propios leads
CREATE POLICY "Users can insert own leads" ON public.leads
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Crear política para que usuarios puedan actualizar sus propios leads
CREATE POLICY "Users can update own leads" ON public.leads
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Crear política para que usuarios puedan eliminar sus propios leads
CREATE POLICY "Users can delete own leads" ON public.leads
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Política para superadmins (acceso completo)
CREATE POLICY "Superadmins can manage all leads" ON public.leads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.profile_type = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.profile_type = 'superadmin'
    )
  );

-- =====================================================
-- TABLA: lead_columns
-- =====================================================

-- Habilitar RLS en la tabla lead_columns
ALTER TABLE public.lead_columns ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view own lead_columns" ON public.lead_columns;
DROP POLICY IF EXISTS "Users can manage own lead_columns" ON public.lead_columns;
DROP POLICY IF EXISTS "Superadmins can manage all lead_columns" ON public.lead_columns;

-- Crear política para que usuarios solo vean sus propias columnas
CREATE POLICY "Users can view own lead_columns" ON public.lead_columns
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Crear política para que usuarios puedan insertar sus propias columnas
CREATE POLICY "Users can insert own lead_columns" ON public.lead_columns
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Crear política para que usuarios puedan actualizar sus propias columnas
CREATE POLICY "Users can update own lead_columns" ON public.lead_columns
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Crear política para que usuarios puedan eliminar sus propias columnas
CREATE POLICY "Users can delete own lead_columns" ON public.lead_columns
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Política para superadmins (acceso completo)
CREATE POLICY "Superadmins can manage all lead_columns" ON public.lead_columns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.profile_type = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.profile_type = 'superadmin'
    )
  );

-- =====================================================
-- TABLA: conversations
-- =====================================================

-- Habilitar RLS en la tabla conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can manage own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Superadmins can manage all conversations" ON public.conversations;

-- Crear política para que usuarios solo vean sus propias conversaciones
CREATE POLICY "Users can view own conversations" ON public.conversations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Crear política para que usuarios puedan insertar sus propias conversaciones
CREATE POLICY "Users can insert own conversations" ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Crear política para que usuarios puedan actualizar sus propias conversaciones
CREATE POLICY "Users can update own conversations" ON public.conversations
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Crear política para que usuarios puedan eliminar sus propias conversaciones
CREATE POLICY "Users can delete own conversations" ON public.conversations
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Política para superadmins (acceso completo)
CREATE POLICY "Superadmins can manage all conversations" ON public.conversations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.profile_type = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.profile_type = 'superadmin'
    )
  );

-- =====================================================
-- TABLA: messages
-- =====================================================

-- Habilitar RLS en la tabla messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can manage own messages" ON public.messages;
DROP POLICY IF EXISTS "Superadmins can manage all messages" ON public.messages;

-- Crear política para que usuarios solo vean mensajes de sus conversaciones
CREATE POLICY "Users can view own messages" ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Crear política para que usuarios puedan insertar mensajes en sus conversaciones
CREATE POLICY "Users can insert own messages" ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Crear política para que usuarios puedan actualizar mensajes de sus conversaciones
CREATE POLICY "Users can update own messages" ON public.messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Crear política para que usuarios puedan eliminar mensajes de sus conversaciones
CREATE POLICY "Users can delete own messages" ON public.messages
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Política para superadmins (acceso completo)
CREATE POLICY "Superadmins can manage all messages" ON public.messages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.profile_type = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.profile_type = 'superadmin'
    )
  );

-- =====================================================
-- TABLA: mass_campaigns
-- =====================================================

-- Habilitar RLS en la tabla mass_campaigns
ALTER TABLE public.mass_campaigns ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view own campaigns" ON public.mass_campaigns;
DROP POLICY IF EXISTS "Users can manage own campaigns" ON public.mass_campaigns;
DROP POLICY IF EXISTS "Superadmins can manage all campaigns" ON public.mass_campaigns;

-- Crear política para que usuarios solo vean sus propias campañas
CREATE POLICY "Users can view own campaigns" ON public.mass_campaigns
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Crear política para que usuarios puedan insertar sus propias campañas
CREATE POLICY "Users can insert own campaigns" ON public.mass_campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Crear política para que usuarios puedan actualizar sus propias campañas
CREATE POLICY "Users can update own campaigns" ON public.mass_campaigns
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Crear política para que usuarios puedan eliminar sus propias campañas
CREATE POLICY "Users can delete own campaigns" ON public.mass_campaigns
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Política para superadmins (acceso completo)
CREATE POLICY "Superadmins can manage all campaigns" ON public.mass_campaigns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.profile_type = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.profile_type = 'superadmin'
    )
  );

-- =====================================================
-- TABLA: contact_lists
-- =====================================================

-- Habilitar RLS en la tabla contact_lists
ALTER TABLE public.contact_lists ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view own contact_lists" ON public.contact_lists;
DROP POLICY IF EXISTS "Users can manage own contact_lists" ON public.contact_lists;
DROP POLICY IF EXISTS "Superadmins can manage all contact_lists" ON public.contact_lists;

-- Crear política para que usuarios solo vean sus propias listas de contactos
CREATE POLICY "Users can view own contact_lists" ON public.contact_lists
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Crear política para que usuarios puedan insertar sus propias listas
CREATE POLICY "Users can insert own contact_lists" ON public.contact_lists
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Crear política para que usuarios puedan actualizar sus propias listas
CREATE POLICY "Users can update own contact_lists" ON public.contact_lists
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Crear política para que usuarios puedan eliminar sus propias listas
CREATE POLICY "Users can delete own contact_lists" ON public.contact_lists
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Política para superadmins (acceso completo)
CREATE POLICY "Superadmins can manage all contact_lists" ON public.contact_lists
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.profile_type = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.profile_type = 'superadmin'
    )
  );

-- =====================================================
-- TABLA: contacts
-- =====================================================

-- Habilitar RLS en la tabla contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can manage own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Superadmins can manage all contacts" ON public.contacts;

-- Crear política para que usuarios solo vean contactos de sus listas
CREATE POLICY "Users can view own contacts" ON public.contacts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contact_lists
      WHERE contact_lists.id = contacts.list_id
      AND contact_lists.user_id = auth.uid()
    )
  );

-- Crear política para que usuarios puedan insertar contactos en sus listas
CREATE POLICY "Users can insert own contacts" ON public.contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contact_lists
      WHERE contact_lists.id = contacts.list_id
      AND contact_lists.user_id = auth.uid()
    )
  );

-- Crear política para que usuarios puedan actualizar contactos de sus listas
CREATE POLICY "Users can update own contacts" ON public.contacts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contact_lists
      WHERE contact_lists.id = contacts.list_id
      AND contact_lists.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contact_lists
      WHERE contact_lists.id = contacts.list_id
      AND contact_lists.user_id = auth.uid()
    )
  );

-- Crear política para que usuarios puedan eliminar contactos de sus listas
CREATE POLICY "Users can delete own contacts" ON public.contacts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contact_lists
      WHERE contact_lists.id = contacts.list_id
      AND contact_lists.user_id = auth.uid()
    )
  );

-- Política para superadmins (acceso completo)
CREATE POLICY "Superadmins can manage all contacts" ON public.contacts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.profile_type = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.profile_type = 'superadmin'
    )
  );

-- =====================================================
-- TABLA: whatsapp_connections
-- =====================================================

-- Habilitar RLS en la tabla whatsapp_connections
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view own whatsapp_connections" ON public.whatsapp_connections;
DROP POLICY IF EXISTS "Users can manage own whatsapp_connections" ON public.whatsapp_connections;
DROP POLICY IF EXISTS "Superadmins can manage all whatsapp_connections" ON public.whatsapp_connections;

-- Crear política para que usuarios solo vean sus propias conexiones
CREATE POLICY "Users can view own whatsapp_connections" ON public.whatsapp_connections
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Crear política para que usuarios puedan insertar sus propias conexiones
CREATE POLICY "Users can insert own whatsapp_connections" ON public.whatsapp_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Crear política para que usuarios puedan actualizar sus propias conexiones
CREATE POLICY "Users can update own whatsapp_connections" ON public.whatsapp_connections
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Crear política para que usuarios puedan eliminar sus propias conexiones
CREATE POLICY "Users can delete own whatsapp_connections" ON public.whatsapp_connections
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Política para superadmins (acceso completo)
CREATE POLICY "Superadmins can manage all whatsapp_connections" ON public.whatsapp_connections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.profile_type = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.profile_type = 'superadmin'
    )
  );

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Verificar que RLS esté habilitado en todas las tablas
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN (
  'leads', 'lead_columns', 'conversations', 'messages', 
  'mass_campaigns', 'contact_lists', 'contacts', 'whatsapp_connections'
)
AND schemaname = 'public'
ORDER BY tablename;

-- Verificar políticas creadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN (
  'leads', 'lead_columns', 'conversations', 'messages', 
  'mass_campaigns', 'contact_lists', 'contacts', 'whatsapp_connections'
)
AND schemaname = 'public'
ORDER BY tablename, policyname;