-- Agregar columnas workspace y embudo a web_chatbots (las otras tablas ya las tienen)
ALTER TABLE web_chatbots 
ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL;

ALTER TABLE web_chatbots 
ADD COLUMN IF NOT EXISTS default_column_id uuid REFERENCES lead_columns(id) ON DELETE SET NULL;

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_web_chatbots_workspace_id ON web_chatbots(workspace_id);
CREATE INDEX IF NOT EXISTS idx_web_chatbots_default_column_id ON web_chatbots(default_column_id);