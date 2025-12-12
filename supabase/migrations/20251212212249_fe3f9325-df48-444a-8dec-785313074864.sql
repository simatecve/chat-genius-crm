-- Update webchat_ai_settings to use the direct link instead of phone number
UPDATE public.webchat_ai_settings 
SET cashier_numbers = 'http://wa.link/cargacapibet',
    updated_at = now()
WHERE cashier_numbers IS NOT NULL OR cashier_numbers = '';