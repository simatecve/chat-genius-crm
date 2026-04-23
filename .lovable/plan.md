
# Plan de revisión y optimización de velocidad del sistema

## Objetivo

Mejorar la velocidad general del sistema, principalmente en:

- Conversaciones / Chats.
- Embudos / Kanban de leads.
- Carga inicial de páginas.
- Búsquedas, filtros y cambios de conversación.
- Realtime sin recargas pesadas.

## Diagnóstico inicial

La app ya tiene algunas optimizaciones importantes:

- Lazy loading de páginas en `App.tsx`.
- React Query con cache global.
- Índices existentes para:
  - `conversations(user_id, last_message_time)`
  - `messages(conversation_id, created_at)`
  - `leads(column_id, last_inbound_message_time)`
- Paginación parcial en embudos con `useInfiniteLeads`.
- Cache directo de conversaciones al recibir mensajes realtime.

Pero todavía hay cuellos claros:

1. Demasiados logs en consola en Chats y ChatArea.
2. Conversaciones filtra mucho en frontend, no en base de datos.
3. Embudos tiene doble sistema de carga: `loadLeads()` carga muchos datos y `useInfiniteLeads()` también pagina.
4. Cada columna de embudo hace consultas separadas de count + datos.
5. Cada tarjeta de embudo puede consultar estado de bot individualmente.
6. En conversaciones, búsqueda y filtros avanzados no están paginados ni completamente delegados a Supabase.
7. Realtime puede disparar invalidaciones amplias.
8. El preview de desarrollo carga lento por Vite, pero eso afecta menos al dominio publicado; aun así se puede reducir peso de rutas.

---

## Fase 1: Limpieza rápida de rendimiento en Chats

### 1. Quitar logs pesados

Reemplazar `console.log` por `logger` solo cuando sea necesario y eliminar logs que imprimen arrays completos de mensajes.

Archivos:

- `src/hooks/useConversations.ts`
- `src/components/conversations/ChatArea.tsx`
- `src/pages/Conversations.tsx`
- `src/hooks/useQuickReplies.ts`

Especialmente quitar:

- Logs de todos los mensajes renderizados.
- Logs de grupos de mensajes.
- Logs de cada evento realtime.
- Logs por render de `Conversations`.

Resultado esperado:

- Menos bloqueo del hilo principal.
- Menos ruido en consola.
- Mejor respuesta al abrir chats con muchos mensajes.

### 2. Memoizar agrupación de mensajes

En `ChatArea.tsx`, `groupMessagesByDate(messages)` se calcula en cada render.

Cambiarlo a:

```text
const messageGroups = useMemo(() => groupMessagesByDate(messages), [messages])
```

Resultado:

- Menos trabajo al escribir en el input.
- Menos recálculo al abrir/cerrar paneles.

### 3. Evitar scroll suave en cada actualización

Actualmente el chat hace:

```text
scrollIntoView({ behavior: 'smooth' })
```

en cada cambio de mensajes.

Ajustar para:

- Usar scroll inmediato al cargar conversación.
- Usar smooth solo para mensajes nuevos cuando el usuario ya está cerca del final.
- No forzar scroll si el usuario está leyendo mensajes viejos.

Resultado:

- Menos lag en conversaciones largas.
- Mejor experiencia al revisar historial.

---

## Fase 2: Optimizar carga de Conversaciones

### 1. Crear paginación real en conversaciones

Actualmente `getConversations()` trae solo 100 y luego la página filtra en memoria.

Agregar soporte para:

```text
limit
offset / cursor
filterMode
assignmentFilter
sessionFilter
searchTerm
selectedEmbudo
```

Archivos:

- `src/services/conversationService.ts`
- `src/hooks/useConversations.ts`
- `src/pages/Conversations.tsx`
- `src/components/conversations/ConversationList.tsx`

Resultado:

- La base devuelve solo lo que se necesita.
- Se podrá cargar “más conversaciones” con scroll.
- Los filtros serán más rápidos en cuentas grandes.

### 2. Mover filtros pesados al servidor

Pasar estos filtros de frontend a Supabase:

- Sin responder.
- Sin respuesta +30 minutos.
- Asignadas offline, usando lista de agentes online.
- Por sesión.
- Por asignación.
- Por embudo / workspace.
- Búsqueda por nombre o teléfono.

Resultado:

- Menos memoria en navegador.
- Menos render de listas grandes.
- Menos dependencia de tener todo cargado para filtrar.

### 3. Mejorar búsqueda

Agregar debounce de búsqueda de 300 ms y no ejecutar búsqueda por cada tecla inmediatamente.

También evitar búsquedas con menos de 2 caracteres.

Resultado:

- Menos consultas.
- Mejor respuesta al escribir.

---

## Fase 3: Optimizar lista visual de Conversaciones

### 1. Virtualizar la lista de chats

`ConversationList.tsx` renderiza todos los items disponibles.

Agregar virtualización con una estrategia ligera:

- Renderizar solo los elementos visibles.
- Mantener altura estimada por item.
- Preservar selección actual.

Resultado:

- Lista fluida aunque haya cientos o miles de conversaciones.
- Menos DOM y menos renders.

### 2. Cargar tags solo de los visibles

Ya carga tags de las primeras 20 conversaciones, pero depende de `conversations.length`.

Ajustar para que dependa de los IDs visibles/paginados y no vuelva a consultar datos ya cacheados.

Resultado:

- Menos consultas a `contacts`.
- Menos recargas innecesarias al filtrar.

---

## Fase 4: Optimizar mensajes dentro del chat

### 1. Mantener paginación de mensajes y agregar “cargar anteriores”

Actualmente se cargan 50 mensajes, pero no hay flujo claro para cargar anteriores desde la UI.

Agregar:

- Botón o carga automática al subir.
- `hasMoreMessages`.
- `loadOlderMessages`.

Archivos:

- `src/services/conversationService.ts`
- `src/hooks/useConversations.ts`
- `src/components/conversations/ChatArea.tsx`

Resultado:

- Chats largos abren rápido.
- Historial completo sigue disponible bajo demanda.

### 2. Evitar invalidar toda la conversación después de enviar

Después de enviar, usar actualización de cache puntual en vez de invalidaciones amplias.

Resultado:

- El mensaje aparece rápido.
- Menos refetch.
- Menos saltos visuales.

---

## Fase 5: Optimizar Embudos / Kanban

### 1. Eliminar carga duplicada de leads

`Leads.tsx` todavía tiene `loadLeads()` que carga leads reales + conversaciones huérfanas, mientras `useInfiniteLeads()` también carga por páginas.

Unificar la carga para que el tablero use una sola fuente:

```text
useInfiniteLeads
```

Mantener `loadLeads()` solo si queda necesario para compatibilidad, o retirarlo del flujo principal.

Resultado:

- Menos consultas duplicadas.
- Menor carga inicial.
- Menos datos en memoria.

### 2. Reducir consultas por columna

`useInfiniteLeads` hace por cada columna:

- count total.
- consulta de leads.
- join con conversaciones.

Optimizar con una de estas opciones:

Opción recomendada:
- Crear una función RPC `get_funnel_column_leads_page`.
- Devuelve leads + conversación principal + total en una sola llamada por columna.

Alternativa:
- Mantener Supabase JS pero evitar count exacto en carga inicial y calcularlo bajo demanda.

Resultado:

- Menor tiempo de carga en embudos con muchas columnas.
- Menos roundtrips a Supabase.

### 3. Priorizar columnas visibles

En vez de cargar todas las columnas en paralelo, cargar:

1. Columnas visibles primero.
2. Resto en background.
3. Más leads al hacer scroll.

Resultado:

- El usuario ve el embudo antes.
- Menos sensación de pantalla “trabada”.

### 4. Evitar consulta por tarjeta para estado del bot

Cada `LeadCard` usa `useBotBlock`, lo cual puede generar muchas consultas si hay muchas tarjetas.

Cambiar a carga batch:

- Obtener bloqueos de bot para los teléfonos visibles.
- Pasar estado por props.
- Actualizar localmente al activar/desactivar.

Archivos:

- `src/components/KanbanBoard.tsx`
- `src/hooks/useBotBlock.tsx`
- posible nuevo hook `useBotBlockMap.ts`

Resultado:

- Gran mejora en embudos con muchos leads.
- Menos consultas N+1.

---

## Fase 6: Realtime más eficiente

### 1. No invalidar listas completas salvo que sea necesario

En `useConversations.ts`, actualizar cache puntual para:

- `last_message`
- `last_message_time`
- `unread_count`
- `assigned_to`
- `status`

Solo hacer refetch completo en casos como:

- conversación nueva fuera de página actual,
- cambio de filtro activo,
- delete.

### 2. Debounce de refresh en embudos

Revisar el flujo realtime de `Leads.tsx` para que múltiples eventos no disparen recargas grandes.

Aplicar:

```text
debounce 500-1000 ms
refresh solo de columna afectada
ignorar evento si fue movimiento optimista local
```

Resultado:

- Menos parpadeos.
- Menos recargas al mover tarjetas.
- Menos carga cuando entran muchos mensajes.

---

## Fase 7: Índices de base de datos recomendados

Agregar migración con índices seguros para los nuevos patrones de consulta.

Índices sugeridos:

```text
conversations(user_id, lead_id, last_message_time desc)
conversations(user_id, assigned_to, last_message_time desc)
conversations(user_id, channel_type, last_message_time desc)
conversations(user_id, whatsapp_number, last_message_time desc)
conversations(user_id, twilio_connection_id, last_message_time desc)
conversations(user_id, telegram_bot_id, last_message_time desc)
conversations(user_id, unread_count, last_inbound_message_time desc)
conversations(user_id, last_inbound_message_time desc) where unread_count > 0

leads(user_id, column_id, last_inbound_message_time desc)
leads(column_id, updated_at desc)

contacts(phone_number)
contacto_bloqueado_bot(user_id, numero)
agent_presence(account_owner_id, last_seen_at desc)
```

No se modifica data histórica.

RLS sigue usando la estructura actual:

```text
get_account_owner_id(auth.uid())
```

---

## Fase 8: Medición antes y después

Después de implementar, medir:

### Conversaciones

- Tiempo hasta ver lista de chats.
- Tiempo al seleccionar una conversación.
- Tiempo al escribir en input.
- Tiempo al buscar.
- Número de queries Supabase al cargar la página.
- Número de renders de `ChatArea`.

### Embudos

- Tiempo hasta ver primeras columnas.
- Tiempo hasta ver primeras tarjetas.
- Tiempo al mover lead.
- Queries por carga inicial.
- Queries por tarjeta.
- Uso de memoria y nodos DOM.

Resultado esperado:

```text
Conversaciones:
- apertura más rápida
- menos lag al escribir
- menos recargas completas
- búsqueda más estable

Embudos:
- carga inicial más liviana
- menos consultas por columna/tarjeta
- drag and drop más fluido
- mejor rendimiento en cuentas grandes
```

---

## Orden de implementación recomendado

1. Quitar logs pesados y memoizar cálculos en ChatArea.
2. Optimizar scroll y renders del chat.
3. Agregar debounce y paginación real en conversaciones.
4. Mover filtros de conversaciones al servicio/query.
5. Virtualizar lista de conversaciones.
6. Unificar carga de embudos en `useInfiniteLeads`.
7. Eliminar consultas N+1 de `useBotBlock` en tarjetas.
8. Optimizar carga por columnas y realtime de embudos.
9. Crear migración con índices faltantes.
10. Medir rendimiento y ajustar.

## Archivos principales a tocar

- `src/hooks/useConversations.ts`
- `src/services/conversationService.ts`
- `src/pages/Conversations.tsx`
- `src/components/conversations/ConversationList.tsx`
- `src/components/conversations/ChatArea.tsx`
- `src/pages/Leads.tsx`
- `src/hooks/useInfiniteLeads.ts`
- `src/components/KanbanBoard.tsx`
- `src/hooks/useBotBlock.tsx`
- `src/hooks/useQuickReplies.ts`
- `supabase/migrations/*`

## Nota sobre el resultado de performance observado

En el preview de desarrollo se observó carga inicial lenta, pero gran parte viene del entorno Vite/dev server y carga de módulos. Eso no representa exactamente la velocidad del dominio publicado.

Aun así, los problemas internos detectados en Chats y Embudos sí pueden afectar producción, especialmente:

- logs masivos,
- filtros en frontend,
- consultas duplicadas,
- renderizado de listas largas,
- consultas por tarjeta,
- realtime con invalidaciones amplias.

Este plan ataca esos puntos directamente.
