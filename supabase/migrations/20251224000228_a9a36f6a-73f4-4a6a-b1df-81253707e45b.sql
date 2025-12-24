-- Actualizar el CBU correcto en ia_default_settings
UPDATE ia_default_settings 
SET cbu = '0000088800000000109318', 
    updated_at = now() 
WHERE id = 1;