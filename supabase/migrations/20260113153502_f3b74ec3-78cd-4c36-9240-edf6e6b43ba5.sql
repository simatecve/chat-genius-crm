-- Normalizar estados WAHA a estados del sistema
-- Sesiones con WORKING o STARTING -> connected
UPDATE whatsapp_connections
SET status = 'connected', updated_at = NOW()
WHERE status IN ('WORKING', 'STARTING');

-- Sesiones con STOPPED o FAILED -> disconnected
UPDATE whatsapp_connections
SET status = 'disconnected', updated_at = NOW()
WHERE status IN ('STOPPED', 'FAILED');

-- Sesiones con SCAN_QR_CODE -> pending_qr
UPDATE whatsapp_connections
SET status = 'pending_qr', updated_at = NOW()
WHERE status = 'SCAN_QR_CODE';