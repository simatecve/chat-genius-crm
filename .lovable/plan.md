

# Plan: Backup + borrado de conversaciones y mensajes de 2025

## ⚠️ Advertencia importante

Esta operación **viola la regla guardada** `mem://constraints/data-preservation-complete` ("No borrar data histórica bajo ninguna circunstancia"). Procedo porque lo confirmaste explícitamente. Después actualizo la memoria para registrar la excepción.

## Volumen afectado

| Tabla | Registros 2025 | Total actual | % a borrar |
|---|---|---|---|
| `conversations` | **4,226** | 32,115 | 13% |
| `messages` | **32,967** | 392,549 | 8% |

## Pasos a ejecutar

### Paso 1 — Backup CSV completo (antes de borrar nada)

Genero dos archivos en `/mnt/documents/`:
- `backup_conversations_2025.csv` — todas las columnas de las 4,226 conversaciones de 2025
- `backup_messages_2025.csv` — todas las columnas de los 32,967 mensajes de 2025

Uso `psql COPY ... TO STDOUT WITH CSV HEADER` para exportar tal cual está en la BD (incluyendo `metadata` jsonb serializado). Te entrego ambos como `<lov-artifact>` para que los descargues y guardes localmente antes del borrado.

### Paso 2 — Verificación del backup

Cuento líneas de cada CSV y confirmo que coinciden con los totales esperados (4,226 + 1 header y 32,967 + 1 header). Si algo no cuadra, **paro** y no borro nada.

### Paso 3 — Borrado en orden seguro

Migración SQL con transacción:
```sql
BEGIN;
-- Borrar mensajes primero (no tienen FK declarada pero referencian conversation_id)
DELETE FROM messages 
WHERE created_at >= '2025-01-01' AND created_at < '2026-01-01';

-- Borrar conversaciones después
DELETE FROM conversations 
WHERE created_at >= '2025-01-01' AND created_at < '2026-01-01';
COMMIT;
```

Rango: `[2025-01-01 00:00:00 UTC, 2026-01-01 00:00:00 UTC)` — todo el año 2025 completo, no toca nada de 2026.

### Paso 4 — Verificación post-borrado

Consulto los counts otra vez para confirmar que quedaron en 0 los registros de 2025 y que 2024 y 2026 quedaron intactos.

### Paso 5 — Actualizar memoria del proyecto

Edito `mem://constraints/data-preservation-complete` para registrar la excepción del 21/04/2026 y dejar nota del backup disponible.

## Detalles técnicos

- **No tocaré tablas relacionadas** (`leads`, `contacts`, `automated_message_logs`, `audit_logs`, `campaign_sends`, `contact_details`, `ai_response_buffer`). Si querés borrarlas también, decímelo y lo agrego.
- **Conversaciones huérfanas vs mensajes huérfanos**: como no hay FK declarada en `messages.conversation_id`, no hay cascada automática. Al borrar primero `messages` y luego `conversations` no quedan huérfanos.
- **`unread_count` y contadores derivados**: el dashboard lee de las tablas directamente, así que se actualizará solo al refrescar.
- **Realtime**: las suscripciones activas no recibirán eventos de DELETE para registros antiguos; usuarios conectados verán los cambios al recargar.
- **Irreversible en BD**: una vez ejecutado el COMMIT no hay rollback. La única vuelta atrás es re-importar los CSV de backup.

