-- Script para corregir el error de ON CONFLICT en payment_methods
-- Ejecutar este script en la consola SQL de Supabase

-- Primero, verificar si la tabla existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'payment_methods'
);

-- Si la tabla no existe, crearla
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    provider VARCHAR(100) NOT NULL,
    api_key TEXT,
    secret_key TEXT,
    webhook_url TEXT,
    supported_currencies TEXT[] DEFAULT ARRAY['USD'],
    is_active BOOLEAN DEFAULT true,
    is_sandbox BOOLEAN DEFAULT false,
    configuration JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Crear índice único en provider (necesario para ON CONFLICT)
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_methods_provider_unique 
ON public.payment_methods(provider);

-- Crear otros índices
CREATE INDEX IF NOT EXISTS idx_payment_methods_active 
ON public.payment_methods(is_active);

-- Habilitar RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS si no existen
DO $$ 
BEGIN
    -- Política para superadmins
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payment_methods' 
        AND policyname = 'Superadmins can manage payment methods'
    ) THEN
        CREATE POLICY "Superadmins can manage payment methods" ON public.payment_methods
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.profile_type = 'superadmin'
                )
            );
    END IF;
    
    -- Política para usuarios
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payment_methods' 
        AND policyname = 'Users can view active payment methods'
    ) THEN
        CREATE POLICY "Users can view active payment methods" ON public.payment_methods
            FOR SELECT USING (
                is_active = true AND 
                auth.role() = 'authenticated'
            );
    END IF;
END $$;

-- Crear función para updated_at si no existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_payment_methods_updated_at'
    ) THEN
        CREATE TRIGGER update_payment_methods_updated_at
            BEFORE UPDATE ON public.payment_methods
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Insertar métodos de pago por defecto usando UPSERT
INSERT INTO public.payment_methods (name, provider, api_key, secret_key, supported_currencies, configuration, is_active)
VALUES 
    (
        'Stripe',
        'stripe',
        '',
        '',
        ARRAY['USD', 'EUR', 'ARS'],
        '{
            "webhook_secret": "",
            "environment": "test",
            "description": "Procesador de pagos internacional"
        }'::jsonb,
        false
    ),
    (
        'Mercado Pago Argentina',
        'mercadopago',
        '',
        '',
        ARRAY['ARS', 'USD'],
        '{
            "webhook_secret": "",
            "environment": "sandbox",
            "country": "AR",
            "description": "Procesador de pagos para Argentina"
        }'::jsonb,
        false
    )
ON CONFLICT (provider) DO UPDATE SET
    name = EXCLUDED.name,
    supported_currencies = EXCLUDED.supported_currencies,
    configuration = EXCLUDED.configuration,
    updated_at = timezone('utc'::text, now());

-- Verificar que todo se creó correctamente
SELECT 'Tabla payment_methods creada exitosamente' as status;
SELECT COUNT(*) as total_payment_methods FROM public.payment_methods;