

# Plan: Asignación de conversaciones a cajeros + auto-asignación

## Objetivo
Permitir asignar cada conversación a un cajero específico, con auto-asignación configurable entre cajeros conectados/activos. El admin mantiene acceso total; los cajeros respetan la configuración de visibilidad existente.

## 1. Cambios en base de datos (migración)

### Nuevas columnas en `conversations`
- `assigned_to uuid` — cajero asignado (nullable; null = sin asignar). FK lógica a `profiles.id`.
- `assigned_at timestamptz` — momento de la asignación.
- `assigned_by uuid` — quién asignó (admin o sistema).

Índice: `(user_id, assigned_to)` para filtrar rápido.

### Nueva tabla `agent_presence`
| Columna | Tipo | Detalle |
|---|---|---|
| `user_id` | uuid PK | cajero |
| `account_owner_id` | uuid | dueño de cuenta para RLS |
| `status` | text | `online`, `away`, `offline`, `busy` (override manual) |
| `manual_override` | text NULL | si está seteado, prevalece sobre `status` automático |
| `last_seen_at` | timestamptz | actualizado por heartbeat |
| `updated_at` | timestamptz | |

RLS: cajero ve/edita solo su fila; admin de la cuenta ve todas las de su cuenta.

### Nueva tabla `assignment_settings` (1 fila por cuenta)
| Columna | Tipo | Detalle |
|---|---|---|
| `account_owner_id` | uuid PK | |
| `auto_assign_enabled` | boolean | default false |
| `assign_strategy` | text | `round_robin`, `least_load`, `manual` |
| `include_unassigned_for_all` | boolean | si true, los cajeros ven también las sin asignar |
| `last_assigned_user_id` | uuid NULL | cursor para round-robin |

RLS: solo el admin de la cuenta lee/escribe.

### Función `auto_assign_conversation(conversation_id uuid)` (security definer)
Lee `assignment_settings` del owner, lista cajeros con `agent_presence.status='online'` (sin override `busy/offline`), aplica estrategia y hace `UPDATE conversations SET assigned_to=...`. Devuelve el id asignado o NULL.

### Trigger `on_conversation_insert`
Si `auto_assign_enabled` y la conversación nace sin `assigned_to`, llama a `auto_assign_conversation`.

## 2. Backend hooks (frontend)

### `useAgentPresence` (nuevo)
- Heartbeat cada 30 s con `upsert` a `agent_presence` (`status='online'`, `last_seen_at=now()`).
- Listener de `visibilitychange` y `beforeunload` → marca `away/offline`.
- Expone `setManualOverride('busy' | 'available' | null)`.
- Cajero considerado offline si `last_seen_at < now() - 90s` (calculado en el cliente para mostrar y en la función SQL para asignar).

### `useAssignmentSettings` (nuevo)
- Get/update de la fila para el admin.
- Filtrado RLS automático.

### Filtro en `useConversations` / `ConversationService.getConversations`
Lógica nueva al construir el query:
- Si `isAdmin` o `puede_ver_mensajes_otros` → query actual sin cambios.
- Si cajero sin ese permiso → `.or('assigned_to.eq.{user.id},assigned_to.is.null')` cuando `include_unassigned_for_all=true`; si no, `.eq('assigned_to', user.id)`.

## 3. UI

### a) Configuración (`/configuracion`) — nueva pestaña "Asignación"
- Switch "Auto-asignar conversaciones nuevas".
- Radio: estrategia (`Round-robin` / `Menor carga` / `Manual`).
- Switch "Cajeros sin permiso ven también las sin asignar".
- Tabla en vivo: cajeros de la cuenta con su estado (online/away/busy/offline), última actividad, conteo de conversaciones abiertas.

### b) Header global — chip de presencia para cajeros
- Indicador de estado actual + dropdown: "Disponible" / "Ocupado" / "Ausente".
- Solo visible si `profile_type='cajero'`.

### c) `ContactInfoPanel` — sección "Agente asignado"
- Muestra nombre del cajero asignado (o "Sin asignar").
- Si admin o `puede_asignar_tareas`: select para reasignar entre cajeros de la cuenta + botón "Auto-asignar ahora".

### d) `ConversationList` — badge sutil
- Mini-avatar/inicial del cajero asignado en cada item, tooltip con nombre.
- Filtro nuevo en el dropdown ya existente: "Mis conversaciones" / "Sin asignar" / "Todas" (admin).

## 4. Webhooks de canales (servidor)
No tocar. La asignación queda a cargo del trigger SQL al insertarse `conversations`. Si una conversación ya existe (mensaje entrante a una previa), se mantiene su `assigned_to`.

## 5. Memoria del proyecto
Agregar `mem://features/conversation-assignment` y referenciarlo en el índice. Una línea Core: "Conversaciones pueden tener `assigned_to`; auto-asignación se rige por `assignment_settings`."

## Detalles técnicos

- **RLS de `conversations`**: la policy actual `user_id = get_account_owner_id(auth.uid())` se mantiene. El filtrado por asignación se hace **en el query del cliente**, no en RLS, para que el admin siga viendo todo y el flag `include_unassigned_for_all` sea respetado sin necesidad de policies múltiples.
- **Round-robin**: la función SQL ordena cajeros activos por id, busca la posición del `last_assigned_user_id`, toma el siguiente y actualiza el cursor, todo en una transacción.
- **Menor carga**: `COUNT(*)` de `conversations` con `status='active'` por cajero, asigna al menor (desempate por antigüedad de `last_seen_at`).
- **Heartbeat**: 30 s es suficiente para presencia razonable sin saturar realtime; con umbral de 90 s tolera pestañas dormidas momentáneas.
- **Compatibilidad**: cuentas sin `assignment_settings` se comportan como hoy (sin auto-asignación, todos ven todo según permisos actuales). El admin nunca pierde acceso porque su rama del query no aplica filtros de asignación.
- **Datos existentes**: las 27.890 conversaciones actuales quedan con `assigned_to=NULL`. El admin las sigue viendo; los cajeros las ven si `include_unassigned_for_all=true` o si el admin las reasigna.

```text
[mensaje entrante] → conversations INSERT
        │
        ▼
trigger on_conversation_insert
        │
   ¿auto_assign_enabled? ──no──► assigned_to = NULL (visible para admin)
        │ sí
        ▼
auto_assign_conversation()
   ├─ lista cajeros online (presence)
   ├─ aplica estrategia (RR / least_load)
   └─ UPDATE assigned_to = cajero_elegido
```

