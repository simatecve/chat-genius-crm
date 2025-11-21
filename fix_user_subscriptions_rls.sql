-- Script para corregir inmediatamente los problemas de RLS en user_subscriptions
-- Ejecutar este script en el SQL Editor de Supabase Dashboard

-- 1. Verificar si la tabla existe, si no, crearla
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'expired', 'suspended', 'pending')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON public.user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires_at ON public.user_subscriptions(expires_at);

-- 3. Habilitar RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Superadmins can manage all user subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Allow superadmin full access to user_subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Allow users to view own subscriptions" ON public.user_subscriptions;

-- 5. Crear política para superadmins (acceso completo)
CREATE POLICY "Allow superadmin full access to user_subscriptions" ON public.user_subscriptions
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

-- 6. Crear política para usuarios regulares (solo lectura de sus propias suscripciones)
CREATE POLICY "Allow users to view own subscriptions" ON public.user_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 7. Crear función y trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON public.user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Verificar que todo esté configurado correctamente
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'user_subscriptions';

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_subscriptions';