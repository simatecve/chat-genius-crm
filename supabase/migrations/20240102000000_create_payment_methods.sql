-- Crear tabla para métodos de pago
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    provider VARCHAR(100) NOT NULL, -- stripe, mercadopago, paypal, etc.
    api_key TEXT, -- Clave pública/API key
    secret_key TEXT, -- Clave secreta/privada
    webhook_url TEXT, -- URL para webhooks
    supported_currencies TEXT[], -- Array de monedas soportadas
    is_active BOOLEAN DEFAULT true,
    is_sandbox BOOLEAN DEFAULT false, -- Para distinguir entre producción y sandbox
    configuration JSONB, -- Configuración adicional específica del proveedor
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Crear índices
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_methods_provider_unique ON public.payment_methods(provider);
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON public.payment_methods(is_active);

-- Habilitar RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para payment_methods
-- Solo superadmins pueden gestionar métodos de pago
CREATE POLICY "Superadmins can manage payment methods" ON public.payment_methods
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.profile_type = 'superadmin'
        )
    );

-- Usuarios pueden ver métodos de pago activos (solo información básica)
CREATE POLICY "Users can view active payment methods" ON public.payment_methods
    FOR SELECT USING (
        is_active = true AND 
        auth.role() = 'authenticated'
    );

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_payment_methods_updated_at
    BEFORE UPDATE ON public.payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insertar métodos de pago por defecto
INSERT INTO public.payment_methods (name, description, provider, supported_currencies, is_active, is_sandbox, configuration) VALUES
(
    'Stripe',
    'Procesador de pagos internacional con soporte para múltiples monedas',
    'stripe',
    ARRAY['USD', 'EUR', 'MXN', 'ARS', 'CLP', 'COP', 'PEN'],
    false, -- Inactivo hasta configurar las claves
    true, -- Sandbox por defecto
    '{
        "public_key_placeholder": "pk_test_...",
        "secret_key_placeholder": "sk_test_...",
        "webhook_endpoint": "/api/webhooks/stripe",
        "supported_payment_methods": ["card", "bank_transfer"],
        "currency_default": "USD"
    }'::jsonb
),
(
    'Mercado Pago Argentina',
    'Procesador de pagos líder en Argentina y Latinoamérica',
    'mercadopago',
    ARRAY['ARS', 'USD'],
    false, -- Inactivo hasta configurar las claves
    true, -- Sandbox por defecto
    '{
        "access_token_placeholder": "APP_USR-...",
        "public_key_placeholder": "APP_USR-...",
        "webhook_endpoint": "/api/webhooks/mercadopago",
        "supported_payment_methods": ["credit_card", "debit_card", "bank_transfer", "cash"],
        "currency_default": "ARS",
        "country": "AR"
    }'::jsonb
)
ON CONFLICT (provider) DO NOTHING;

-- Comentarios para documentación
COMMENT ON TABLE public.payment_methods IS 'Tabla para almacenar configuración de métodos de pago';
COMMENT ON COLUMN public.payment_methods.provider IS 'Proveedor del método de pago (stripe, mercadopago, etc.)';
COMMENT ON COLUMN public.payment_methods.api_key IS 'Clave pública o API key del proveedor';
COMMENT ON COLUMN public.payment_methods.secret_key IS 'Clave secreta o privada del proveedor';
COMMENT ON COLUMN public.payment_methods.is_sandbox IS 'Indica si está en modo sandbox/prueba o producción';
COMMENT ON COLUMN public.payment_methods.configuration IS 'Configuración adicional específica del proveedor en formato JSON';