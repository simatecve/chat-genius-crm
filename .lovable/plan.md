
# Plan actualizado: Costos WhatsApp API + filtros por rango de fechas

## Objetivo
Actualizar el plan anterior para que incluya:

1. En la sección de **Costos**, agregar el costo de **WhatsApp API / clon WAHA** con mensajes **40% más baratos** que WhatsApp normal.
2. Agregar un **filtro por fechas** en Costos para contar mensajes por rango y calcular consumos reales por período.
3. Agregar en **Embudos** filtros por rango de fecha para buscar conversaciones:
   - Por fecha de creación de la conversación.
   - Por conversaciones que tuvieron mensajes dentro de un rango de fechas.

---

## 1. Sección Costos: WhatsApp API 40% más barato

Archivo principal:
- `src/components/settings/CostEstimatorTab.tsx`

Cambios:
- Mantener los costos actuales de WhatsApp normal.
- Agregar una nueva categoría `whatsappApi`, calculada automáticamente así:

```ts
whatsappApi = whatsapp * 0.60
```

Ejemplo:
- WhatsApp México actual: `0.0098`
- WhatsApp API México: `0.00588`

Se mostrarán nuevas tarjetas:
- WhatsApp API - Norteamérica
- WhatsApp API - México
- WhatsApp API - Latinoamérica
- WhatsApp API - España/Europa

Diseño:
- Usar identidad visual de WhatsApp API:
  - Icono `Plug`
  - Color violeta
  - Texto: `40% menos que WhatsApp normal`

También se ampliará la comparativa de ahorro para comparar:
- Nuestro Sistema vs WhatsApp normal
- Nuestro Sistema vs WhatsApp API

---

## 2. Costos: filtro por fechas para contar mensajes y consumos

Archivo principal:
- `src/components/settings/CostEstimatorTab.tsx`

Cambios:
- Agregar selector de rango de fechas arriba del estimador:
  - Hoy
  - Últimos 7 días
  - Últimos 30 días
  - Este mes
  - Rango personalizado

El conteo real de mensajes dejará de ser solo:

```ts
messages where user_id = userId
```

Y pasará a usar filtros opcionales:

```ts
messages
  .eq('user_id', userId)
  .gte('created_at', startDate)
  .lte('created_at', endDate)
```

Resultado:
- El campo “Cantidad de mensajes” mostrará el total del rango seleccionado.
- Las tarjetas de costo se recalcularán según ese rango.
- El botón “Actualizar datos” contará mensajes del período activo.
- Se agregará texto descriptivo, por ejemplo:
  - `Consumo calculado del 01 Abr 2026 al 21 Abr 2026`
  - `Se encontraron 12.450 mensajes en este rango`

Detalles técnicos:
- Usar `Calendar` de `src/components/ui/calendar.tsx`.
- Agregar `pointer-events-auto` al calendario para asegurar que funcione bien dentro de popovers/dialogs.
- Usar `date-fns` para formateo en español, siguiendo el patrón existente de `DateRangeSelector`.

---

## 3. Embudos: filtros por rango de fecha

Archivos principales:
- `src/pages/Leads.tsx`
- `src/hooks/useInfiniteLeads.ts`

Se agregará un bloque de filtros en la vista de Embudos, junto al workspace y búsqueda.

Filtros nuevos:
- Tipo de fecha:
  - `Conversación creada`
  - `Último mensaje`
  - `Último mensaje recibido`
  - `Mensajes dentro del rango`
- Rango de fechas:
  - Hoy
  - Últimos 7 días
  - Últimos 30 días
  - Este mes
  - Personalizado
- Botón `Limpiar filtros`

---

## 4. Embudos: filtro por conversaciones creadas en rango

Cuando el usuario seleccione “Conversación creada”, se filtrarán conversaciones/leads según:

```ts
conversations.created_at >= startDate
conversations.created_at <= endDate
```

Aplica para:
- Leads reales con conversación asociada.
- Conversaciones huérfanas convertidas en leads virtuales.

Uso esperado:
- “Muéstrame conversaciones creadas esta semana”
- “Muéstrame conversaciones nuevas de marzo”
- “Muéstrame embudos con conversaciones iniciadas hoy”

---

## 5. Embudos: filtro por último mensaje / último mensaje recibido

Cuando el usuario seleccione “Último mensaje”, se filtrará por:

```ts
conversations.last_message_time
```

Cuando seleccione “Último mensaje recibido”, se filtrará por:

```ts
conversations.last_inbound_message_time
```

Uso esperado:
- “Conversaciones activas en los últimos 7 días”
- “Clientes que escribieron hoy”
- “Conversaciones sin actividad reciente quedan fuera del tablero filtrado”

---

## 6. Embudos: conversaciones con mensajes dentro del rango

Para el filtro más preciso, “Mensajes dentro del rango”, se consultará la tabla `messages`.

Lógica:
1. Buscar mensajes del usuario en el rango:

```ts
messages
  .eq('user_id', effectiveUserId)
  .gte('created_at', startDate)
  .lte('created_at', endDate)
  .select('conversation_id')
```

2. Obtener IDs únicos de conversaciones.
3. Filtrar el tablero para mostrar solo leads/conversaciones cuyo `conversation_id` esté en esa lista.

Esto permite responder:
- “Qué conversaciones tuvieron mensajes entre el lunes y el viernes”
- “Qué clientes consumieron mensajes este mes”
- “Qué embudos tuvieron actividad real en un rango”

Importante:
- Este filtro se hará con paginación/límites para evitar cargar miles de mensajes completos.
- Solo se traerán IDs de conversaciones, no contenido de mensajes, para reducir consumo de datos.

---

## 7. UI en Embudos

Cambios visuales:
- Agregar botón o barra compacta de filtros:
  - `Fechas`
  - `Tipo: Último mensaje / Creación / Mensajes`
  - `Limpiar`
- En mobile, el filtro se mostrará compacto para no romper la vista optimizada de embudos.
- Mostrar indicador cuando haya filtro activo:

```text
Mostrando 34 conversaciones con mensajes entre 01 Abr y 21 Abr
```

Si no hay resultados:
```text
No hay conversaciones en este rango de fechas
```

---

## 8. Integración con búsqueda actual

Actualmente Embudos filtra por:
- Nombre
- Teléfono

Se mantendrá esa búsqueda y se combinará con el nuevo filtro de fechas.

Orden lógico:
1. Leads/conversaciones cargadas.
2. Aplicar filtro por fecha.
3. Aplicar búsqueda por nombre/teléfono.
4. Mostrar resultado en `KanbanBoard`.

---

## 9. Sin cambios de base de datos

No se crearán tablas nuevas.
No se modificará la estructura de Supabase.
No se tocarán políticas RLS.
No se borrarán datos.

Todo se implementa en frontend usando las tablas existentes:
- `messages`
- `conversations`
- `leads`

---

## Resultado esperado

### En Costos
Podrás ver:
- Cuántos mensajes se consumieron en un rango.
- Cuánto cuesta ese consumo en Nuestro Sistema.
- Cuánto costaría en WhatsApp normal.
- Cuánto costaría en WhatsApp API / clon WAHA con 40% de descuento.

### En Embudos
Podrás filtrar el tablero por:
- Conversaciones creadas en un período.
- Conversaciones con último mensaje en un período.
- Conversaciones con último mensaje recibido en un período.
- Conversaciones que tuvieron mensajes reales dentro de un rango.

Esto permitirá analizar consumo y actividad por días, semanas, meses o rangos personalizados.
