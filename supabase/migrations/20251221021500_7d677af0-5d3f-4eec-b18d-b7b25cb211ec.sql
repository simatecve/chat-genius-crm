-- Habilitar Realtime para las tablas messages y conversations

-- Configurar REPLICA IDENTITY FULL para capturar todos los datos en cambios
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE conversations REPLICA IDENTITY FULL;

-- Agregar las tablas a la publicación supabase_realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;