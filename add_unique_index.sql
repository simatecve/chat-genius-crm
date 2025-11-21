-- Script simple para agregar el índice único necesario para ON CONFLICT
-- Ejecutar en la consola SQL de Supabase

-- Crear índice único en el campo provider
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_methods_provider_unique 
ON public.payment_methods(provider);

-- Verificar que el índice se creó correctamente
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'payment_methods' 
AND indexname = 'idx_payment_methods_provider_unique';

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

-- Verificar que los métodos se insertaron correctamente
SELECT name, provider, is_active FROM public.payment_methods;