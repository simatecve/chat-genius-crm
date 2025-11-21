# Instrucciones para Aplicar Migración de user_subscriptions

## Problema Identificado
La tabla `user_subscriptions` no tiene políticas RLS (Row Level Security) configuradas correctamente, lo que impide que las suscripciones se muestren en el panel de administración.

## Solución
Aplicar la migración manualmente en el dashboard de Supabase.

## Pasos a Seguir

### 1. Acceder al Dashboard de Supabase
1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Inicia sesión en tu cuenta
3. Selecciona tu proyecto

### 2. Ir al Editor SQL
1. En el menú lateral, haz clic en **SQL Editor**
2. Haz clic en **New Query**

### 3. Ejecutar la Migración
Copia y pega el siguiente código SQL en el editor:

```sql
-- Migration to create user_subscriptions table with proper RLS policies

-- Create user_subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'expired')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON public.user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires_at ON public.user_subscriptions(expires_at);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Superadmins can manage all user subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.user_subscriptions;

-- Create RLS policies
-- Policy for superadmins to manage all subscriptions
CREATE POLICY "Superadmins can manage all user subscriptions" ON public.user_subscriptions
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

-- Policy for users to view their own subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.user_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create trigger for updated_at
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
```

### 4. Ejecutar la Query
1. Haz clic en **Run** para ejecutar la migración
2. Verifica que no haya errores en la consola

### 5. Verificar la Tabla
1. Ve a **Table Editor** en el menú lateral
2. Busca la tabla `user_subscriptions`
3. Verifica que tenga las columnas correctas:
   - id (UUID)
   - user_id (UUID)
   - plan_id (UUID)
   - status (TEXT)
   - started_at (TIMESTAMP)
   - expires_at (TIMESTAMP)
   - created_at (TIMESTAMP)
   - updated_at (TIMESTAMP)

### 6. Verificar Políticas RLS
1. En la tabla `user_subscriptions`, haz clic en la pestaña **RLS Policies**
2. Verifica que existan las siguientes políticas:
   - "Superadmins can manage all user subscriptions"
   - "Users can view their own subscriptions"

## Resultado Esperado
Después de aplicar esta migración:
1. La tabla `user_subscriptions` existirá con la estructura correcta
2. Las políticas RLS permitirán que los superadmins vean y gestionen todas las suscripciones
3. Los usuarios regulares solo podrán ver sus propias suscripciones
4. El panel de administración podrá crear, leer, actualizar y eliminar suscripciones correctamente

## Notas Importantes
- Esta migración es segura de ejecutar múltiples veces (usa `IF NOT EXISTS` y `DROP IF EXISTS`)
- Si ya existen datos en la tabla, no se perderán
- Las políticas RLS son esenciales para la seguridad de los datos