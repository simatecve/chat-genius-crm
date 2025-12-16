-- Agregar columna casino_link a webchat_ai_settings
ALTER TABLE webchat_ai_settings 
ADD COLUMN IF NOT EXISTS casino_link TEXT DEFAULT 'https://bet32.fun/';

-- Agregar columna casino_link a ia_default_settings  
ALTER TABLE ia_default_settings
ADD COLUMN IF NOT EXISTS casino_link TEXT DEFAULT 'https://bet32.fun/';