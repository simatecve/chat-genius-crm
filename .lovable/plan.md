
# Plan: Optimización de Egress de Supabase

## Resumen Ejecutivo

Después de analizar el código, he identificado **8 estrategias principales** para reducir significativamente el egress (tráfico de salida) de Supabase sin afectar la funcionalidad ni la velocidad del sistema. Estas optimizaciones pueden reducir el egress entre un **40-70%** dependiendo del patrón de uso.

---

## Estrategias de Optimización

### 1. Selección de Columnas Específicas (Alto Impacto)

**Problema actual:** Muchas consultas usan `SELECT *` cuando solo necesitan algunas columnas.

**Ejemplos encontrados:**
- `conversationService.ts` línea 20: `.select('*')` para conversaciones
- `dashboardService.ts` líneas 281-285: Trae `created_at` y `direction` de todos los mensajes
- `reportsService.ts`: Múltiples `SELECT *` innecesarios

**Solución:** Seleccionar solo las columnas necesarias.

| Antes | Después |
|-------|---------|
| `.select('*')` | `.select('id, pushname, phone_number, last_message, last_message_time, unread_count, status, channel_type')` |

**Ahorro estimado:** 30-50% en consultas afectadas

---

### 2. Usar `count: 'exact', head: true` para Conteos

**Estado actual:** Ya implementado correctamente en `dashboardService.ts` para conteos.

**Verificar en:** `getUnreadCount()` en conversationService.ts que actualmente trae `unread_count` de todas las conversaciones y suma en JavaScript.

**Optimización:** Usar función agregada de PostgreSQL o RPC.

```sql
-- Crear función RPC para conteo eficiente
CREATE OR REPLACE FUNCTION get_unread_count(user_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(unread_count), 0)::INTEGER
  FROM conversations
  WHERE user_id = user_uuid AND unread_count > 0;
$$ LANGUAGE sql STABLE;
```

---

### 3. Incrementar staleTime en React Query (Alto Impacto)

**Configuración actual:**

| Hook | staleTime | refetchInterval | Recomendación |
|------|-----------|-----------------|---------------|
| useConversations | 5s | 30s | staleTime: 30s (Realtime maneja actualizaciones) |
| unreadCount | 5s | 30s | staleTime: 60s (menos crítico) |
| useDashboard stats | - | 5min | OK |
| useDashboard activeConversations | - | 30s | staleTime: 60s |
| useReports | 2min | - | OK |

**Cambios recomendados:**
```typescript
// useConversations.ts
staleTime: 30000, // De 5s a 30s - Realtime es suficiente
refetchInterval: 60000, // De 30s a 60s

// useDashboard.tsx - activeConversations
refetchInterval: 60 * 1000, // De 30s a 60s
```

---

### 4. Eliminar invalidateQueries Redundantes

**Problema:** Cuando llega un mensaje por Realtime, se hacen múltiples invalidaciones que disparan refetch innecesarios.

**Código problemático en useConversations.ts (líneas 106-110):**
```typescript
// Cada INSERT dispara invalidación de TODO
queryClient.invalidateQueries({ queryKey: ['conversations'] });
queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
```

**Solución:** Usar `setQueryData` para actualizar el cache directamente sin hacer refetch:

```typescript
// En lugar de invalidar, actualizar directamente el cache
queryClient.setQueryData(['unreadCount', effectiveUserId], (old: number) => old + 1);
```

---

### 5. Lazy Loading de Etiquetas de Contactos

**Problema en ConversationList.tsx (líneas 79-103):**
Cada vez que cambia la lista de conversaciones, hace una consulta para obtener tags de TODOS los contactos visibles.

**Optimización:**
- Cargar tags solo cuando el usuario hace hover o selecciona una conversación
- O cachear tags a nivel global con mayor staleTime

---

### 6. Paginación y Límites Consistentes

**Estado actual:**
- `getConversations`: limit 100 ✓
- `getMessages`: limit 50 ✓  
- `getRecentLeads`: limit 4 ✓
- `getActiveConversations`: limit 3 ✓

**Mejora:** Implementar paginación infinita consistente en todas las vistas principales.

---

### 7. Desnormalizar `last_message` en Conversaciones

**Estado actual:** Ya implementado. La tabla `conversations` tiene `last_message` y `last_message_time`, evitando JOINs costosos.

**Verificar:** Que no se estén haciendo JOINs adicionales para obtener el último mensaje.

---

### 8. Optimizar Suscripciones Realtime

**Problema potencial:** Múltiples canales de Realtime pueden generar tráfico duplicado.

**Código actual:**
```typescript
// useConversations.ts tiene 2 suscripciones:
// 1. subscribeToConversations (línea 61)
// 2. messagesChannel global (línea 96)
```

**Optimización:** Consolidar en una sola suscripción y manejar la lógica internamente.

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/services/conversationService.ts` | Selección específica de columnas |
| `src/hooks/useConversations.ts` | Aumentar staleTime, eliminar invalidaciones redundantes |
| `src/hooks/useDashboard.tsx` | Aumentar refetchInterval |
| `src/components/conversations/ConversationList.tsx` | Lazy loading de tags |
| `src/services/dashboardService.ts` | Selección específica de columnas |
| Migración SQL | Crear función RPC para conteo de no leídos |

---

## Impacto Estimado

| Optimización | Reducción Egress |
|--------------|-----------------|
| Columnas específicas | 30-40% |
| Mayor staleTime | 20-30% |
| Eliminar invalidaciones | 10-15% |
| Lazy loading tags | 5-10% |
| RPC para conteos | 5-10% |

**Total estimado: 40-70% reducción en egress**

---

## Notas Técnicas

1. **Realtime ya está configurado:** Las tablas `messages` y `conversations` tienen REPLICA IDENTITY FULL, por lo que las actualizaciones en tiempo real ya funcionan eficientemente.

2. **Batching implementado:** El archivo `reportsService.ts` ya implementa batching de 50 IDs para evitar errores 431.

3. **Memoización presente:** Los componentes como `ConversationItem` ya están memoizados.

4. **No afecta velocidad:** Todas las optimizaciones mantienen la experiencia del usuario. Realtime sigue funcionando para actualizaciones instantáneas.
