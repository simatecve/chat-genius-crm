-- Agregar campo bot_enabled a user_bot_settings
ALTER TABLE user_bot_settings 
ADD COLUMN IF NOT EXISTS bot_enabled BOOLEAN NOT NULL DEFAULT true;

-- Crear índice para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_user_bot_settings_user_id ON user_bot_settings(user_id);

COMMENT ON COLUMN user_bot_settings.bot_enabled IS 'Indica si el bot está habilitado globalmente para este usuario';