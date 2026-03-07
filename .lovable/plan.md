

# Plan: Reducir egress de Supabase + Imágenes WAHA sin autenticación

## Parte 1: Imágenes WAHA visibles sin pedir autorización

### Problema
Las imágenes de WhatsApp WAHA se guardan con la URL del servidor WAHA (`/api/files/...`), que requiere autenticación con API key. Cuando el usuario abre la conversación, cada imagen pasa por la edge function `waha-get-file` que descarga, convierte a base64, y envía al cliente. Esto es lento, consume mucho egress, y a veces falla mostrando un popup de autorización.

### Solución
Descargar el archivo multimedia **en el webhook** (`waha-webhook`) al momento de recibir el mensaje, subirlo al bucket público `chat-attachments` de Supabase Storage, y guardar la URL pública en la base de datos. Así las imágenes se cargan directamente sin autenticación.

### Cambios

**Archivo: `supabase/functions/waha-webhook/index.ts`**
- Después de detectar `hasMedia && messageData.media`, descargar el archivo desde `messageData.media.url` usando la WAHA API key
- Subirlo a Supabase Storage en `chat-attachments/{userId}/{conversationId}/{timestamp}-{filename}`
- Usar la URL pública de Storage como `mediaUrl` en lugar de la URL de WAHA
- Manejar errores graciosamente: si la subida falla, usar la URL de WAHA como fallback

**Archivo: `src/hooks/useAuthenticatedMedia.ts`**
- Las URLs de Supabase Storage (`supabase.co/storage`) no necesitan autenticación, por lo que el hook las tratará como URLs normales (no protegidas)
- El hook seguirá funcionando para mensajes antiguos que aún tengan URLs de WAHA

---

## Parte 2: Reducir egress de Supabase

### 2a. RPCs server-side para dashboard

**Migración SQL** - Crear 2 funciones:

1. `get_messages_by_hour(p_user_id uuid, p_start_date timestamptz)` - Agrupa mensajes por hora en el servidor, retorna 24 filas en vez de miles
2. `get_conversion_rate(p_user_id uuid)` - Calcula tasa de conversión server-side con counts

**Archivo: `src/services/dashboardService.ts`**
- `getMessagesByHour()`: reemplazar query de todos los mensajes por llamada al RPC `get_messages_by_hour`
- `getDashboardStats()`: reemplazar query de leads con join por llamada al RPC `get_conversion_rate`

### 2b. Optimizar Realtime cache en conversaciones

**Archivo: `src/hooks/useConversations.ts`**
- En el listener de Realtime para mensajes nuevos, usar `queryClient.setQueryData` para actualizar solo `last_message` y `last_message_time` de la conversación afectada, en vez de `invalidateQueries(['conversations'])` que refetchea 100 conversaciones completas

### 2c. Eliminar `select('*')` de servicios de alto tráfico

- `src/services/salesService.ts` → columnas específicas de products
- `src/components/internal-chat/ChatArea.tsx` → columnas necesarias de internal_messages
- `src/hooks/useUsageLimits.tsx` → columnas específicas de user_usage
- `src/hooks/useInfiniteLeads.ts` → columnas específicas del lead en vez de `select('*')`

### Impacto estimado
- **Imágenes WAHA en Storage**: elimina llamadas a `waha-get-file` edge function (~90% menos egress en media)
- **RPCs dashboard**: 24 filas vs miles de mensajes (~90% menos egress en dashboard)
- **Realtime cache**: ~50% menos refetches de conversaciones
- **Select específicos**: ~20-30% menos por query
- **Total estimado**: 40-60% reducción de egress

