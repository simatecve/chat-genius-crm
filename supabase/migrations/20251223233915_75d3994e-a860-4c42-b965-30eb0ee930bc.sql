-- Paso 1: Habilitar el bot del usuario
UPDATE user_bot_settings 
SET bot_enabled = TRUE, updated_at = now()
WHERE user_id = 'aceeab1a-ec2e-44c7-90c5-7382102955fd';

-- Paso 2: Habilitar la IA predeterminada global
UPDATE ia_default_settings 
SET is_enabled = TRUE, 
    cashier_numbers = 'http://wa.link/cargacapibet',
    updated_at = now()
WHERE id = 1;