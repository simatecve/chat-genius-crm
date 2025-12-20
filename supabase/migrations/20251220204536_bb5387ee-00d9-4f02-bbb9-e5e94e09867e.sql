-- Eliminar registros antiguos con status inactivos
DELETE FROM whatsapp_connections 
WHERE status IN ('deleted', 'STOPPED', 'FAILED');