-- =====================================================
-- Actualizar Webhook URL de Mercado Pago
-- =====================================================
-- Ejecutar este script en la consola SQL de Supabase
-- para configurar la URL del webhook de Mercado Pago

UPDATE payment_methods 
SET webhook_url = 'https://qgdlrplbtgvkhjelqtio.supabase.co/functions/v1/mercadopago-webhook'
WHERE provider = 'mercadopago';

-- Verificar que se actualizó correctamente
SELECT id, name, provider, webhook_url, is_active 
FROM payment_methods 
WHERE provider = 'mercadopago';
