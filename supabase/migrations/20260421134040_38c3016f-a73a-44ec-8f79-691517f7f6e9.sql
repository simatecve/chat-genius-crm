-- Excepción autorizada explícitamente por el usuario el 2026-04-21
-- Backup CSV en /mnt/documents/backup_conversations_2025.csv y backup_messages_2025.csv

-- Borrar mensajes de 2025 primero (evita referencias huérfanas vía conversation_id)
DELETE FROM public.messages
WHERE created_at >= '2025-01-01' AND created_at < '2026-01-01';

-- Borrar conversaciones de 2025
DELETE FROM public.conversations
WHERE created_at >= '2025-01-01' AND created_at < '2026-01-01';