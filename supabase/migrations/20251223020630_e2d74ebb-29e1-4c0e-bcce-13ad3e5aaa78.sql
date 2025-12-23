-- Habilitar realtime para la tabla leads
ALTER PUBLICATION supabase_realtime ADD TABLE leads;

-- Configurar REPLICA IDENTITY para capturar datos completos en UPDATE/DELETE
ALTER TABLE leads REPLICA IDENTITY FULL;