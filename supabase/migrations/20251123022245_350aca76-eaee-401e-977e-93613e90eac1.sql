-- Agregar columna para guardar la columna por defecto en las conexiones de WhatsApp
ALTER TABLE whatsapp_connections 
ADD COLUMN default_column_id uuid REFERENCES lead_columns(id) ON DELETE SET NULL;

-- Crear índice para mejorar rendimiento
CREATE INDEX idx_whatsapp_connections_default_column 
ON whatsapp_connections(default_column_id);

-- Comentario explicativo
COMMENT ON COLUMN whatsapp_connections.default_column_id IS 'Columna del embudo donde se crearán automáticamente los leads de esta conexión';