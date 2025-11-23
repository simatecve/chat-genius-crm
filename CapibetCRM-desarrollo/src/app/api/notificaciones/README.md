# API de Notificaciones

Sistema escalable de notificaciones multi-usuario para Capibet CRM.

## 📋 Características

- ✅ Notificaciones en tiempo real vía WebSocket/SSE
- ✅ Notificaciones multi-usuario (organizacional)
- ✅ Sistema de prioridades (1-5)
- ✅ Múltiples tipos: info, success, warning, error
- ✅ Soft delete (archivado)
- ✅ URLs de acción personalizadas
- ✅ Metadata flexible con campo `data` (JSONB)
- ✅ Marcado masivo como leída
- ✅ Filtrado avanzado por tipo, fecha, estado

## 🗂️ Estructura del Módulo

```
src/app/api/notificaciones/
├── domain/
│   └── notificacion.ts          # Tipos e interfaces
├── utils/
│   ├── handleResponse.ts        # Manejador de respuestas
│   └── index.ts                 # Exports
├── [id]/
│   └── route.ts                 # GET, PATCH, DELETE por ID
├── marcar-leida/
│   └── route.ts                 # POST - Marcar una como leída
├── marcar-todas-leidas/
│   └── route.ts                 # POST - Marcar todas como leídas
├── route.ts                     # GET, POST, PATCH principal
└── README.md                    # Esta documentación
```

## 📊 Modelo de Datos

### Tabla: `notificaciones`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | ID único |
| `usuario_id` | UUID | Usuario destinatario |
| `titulo` | VARCHAR | Título de la notificación |
| `mensaje` | TEXT | Contenido del mensaje |
| `tipo` | VARCHAR | Tipo: info, success, warning, error |
| `prioridad` | BIGINT | Prioridad (1=baja, 5=urgente) |
| `accion_url` | TEXT | URL de acción (opcional) |
| `data` | JSONB | Metadata adicional |
| `leida` | BOOLEAN | Estado de lectura |
| `leida_en` | TIMESTAMP | Fecha de lectura |
| `archivada_en` | TIMESTAMP | Fecha de archivado (soft delete) |
| `enviada_push` | BOOLEAN | Push notification enviada |
| `enviada_email` | BOOLEAN | Email enviado |
| `creado_en` | TIMESTAMP | Fecha de creación |
| `actualizado_en` | TIMESTAMP | Fecha de actualización |

## 🔌 Endpoints

### 1. GET `/api/notificaciones`

Obtiene las notificaciones del usuario autenticado.

**Query Parameters:**

- `leida` (boolean, opcional): Filtrar por estado de lectura
- `tipo` (string, opcional): Filtrar por tipo (info, success, warning, error)
- `incluir_archivadas` (boolean, opcional): Incluir notificaciones archivadas
- `orden` (string, opcional): Orden (default: `creado_en.desc`)
- `limit` (number, opcional): Límite de resultados
- `offset` (number, opcional): Offset para paginación

**Ejemplo:**

```bash
GET /api/notificaciones?leida=false&tipo=info&limit=20
```

**Respuesta:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "usuario_id": "uuid",
      "titulo": "Nuevo mensaje de Juan Pérez",
      "mensaje": "Hola, necesito información sobre...",
      "tipo": "info",
      "prioridad": 3,
      "accion_url": "/dashboard/chats?chat_id=abc123",
      "data": {
        "chat_id": "abc123",
        "contact_id": "xyz789",
        "type": "new_message"
      },
      "leida": false,
      "leida_en": null,
      "archivada_en": null,
      "enviada_push": false,
      "enviada_email": false,
      "creado_en": "2025-10-01T10:30:00Z",
      "actualizado_en": "2025-10-01T10:30:00Z"
    }
  ]
}
```

---

### 2. POST `/api/notificaciones`

Crea una nueva notificación.

**Body:**

```json
{
  "usuario_id": "uuid",
  "titulo": "Título de la notificación",
  "mensaje": "Mensaje detallado",
  "tipo": "info",
  "prioridad": 3,
  "accion_url": "/dashboard/ventas",
  "data": {
    "custom_field": "valor"
  }
}
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "usuario_id": "uuid",
    "titulo": "Título de la notificación",
    "mensaje": "Mensaje detallado",
    "tipo": "info",
    "prioridad": 3,
    "leida": false,
    "creado_en": "2025-10-01T10:30:00Z"
  }
}
```

---

### 3. GET `/api/notificaciones/[id]`

Obtiene una notificación específica por ID.

**Ejemplo:**

```bash
GET /api/notificaciones/550e8400-e29b-41d4-a716-446655440000
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "usuario_id": "uuid",
    "titulo": "Notificación específica",
    "mensaje": "Contenido",
    "tipo": "success",
    "prioridad": 4,
    "leida": true,
    "leida_en": "2025-10-01T11:00:00Z"
  }
}
```

---

### 4. PATCH `/api/notificaciones/[id]`

Actualiza una notificación específica.

**Body:**

```json
{
  "leida": true,
  "leida_en": "2025-10-01T11:00:00Z"
}
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "leida": true,
    "leida_en": "2025-10-01T11:00:00Z"
  },
  "message": "Notificación actualizada correctamente"
}
```

---

### 5. DELETE `/api/notificaciones/[id]`

Elimina (archiva) una notificación.

**Nota:** Realiza un soft delete estableciendo `archivada_en`.

**Ejemplo:**

```bash
DELETE /api/notificaciones/550e8400-e29b-41d4-a716-446655440000
```

**Respuesta:**

```json
{
  "success": true,
  "message": "Notificación eliminada correctamente"
}
```

---

### 6. POST `/api/notificaciones/marcar-leida`

Marca una notificación específica como leída.

**Body:**

```json
{
  "notificacion_id": "uuid"
}
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "leida": true,
    "leida_en": "2025-10-01T11:00:00Z"
  },
  "message": "Notificación marcada como leída"
}
```

---

### 7. POST `/api/notificaciones/marcar-todas-leidas`

Marca todas las notificaciones del usuario autenticado como leídas.

**Body:** (vacío)

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "updated_count": 15
  },
  "message": "15 notificaciones marcadas como leídas"
}
```

---

## 🛠️ Integración con Mensajes de WhatsApp

El módulo está integrado con el sistema de mensajes de WhatsApp. Cuando llega un mensaje nuevo:

1. Se detecta la organización del usuario
2. Se obtienen todos los usuarios de esa organización
3. Se crea una notificación para cada usuario
4. Se emite el evento por WebSocket/SSE

**Archivo:** `src/app/api/whatsapp/messages/received/route.ts`

```typescript
// Crear notificación para toda la organización
if (!isFromMe && sesionData.organizacion_id) {
  await createNewMessageNotification(
    sesionData.organizacion_id.toString(),
    contactName,
    body.message_content,
    chatId,
    contactId.toString(),
    message.id
  );
}
```

---

## 📦 Librería de Utilidades

### `src/lib/notifications/creator.ts`

**Funciones disponibles:**

#### `createNotification(data: CreateNotificationData): Promise<void>`

Crea una notificación para un usuario específico.

```typescript
await createNotification({
  user_id: 'uuid-del-usuario',
  titulo: 'Nuevo mensaje',
  mensaje: 'Tienes un mensaje nuevo',
  tipo: 'info',
  prioridad: 3,
  accion_url: '/dashboard/chats',
  data: { chat_id: 'abc123' }
});
```

#### `createNotificationForOrganization(organizacion_id: string, notificationData): Promise<void>`

Crea notificaciones para todos los usuarios de una organización.

```typescript
await createNotificationForOrganization('org-uuid', {
  titulo: 'Mantenimiento programado',
  mensaje: 'El sistema estará en mantenimiento mañana',
  tipo: 'warning',
  prioridad: 4
});
```

#### `createNewMessageNotification(organizacion_id, contactName, messageContent, chatId, contactId, messageId): Promise<void>`

Helper específico para notificaciones de mensajes nuevos.

```typescript
await createNewMessageNotification(
  organizacion_id,
  'Juan Pérez',
  'Hola, necesito información',
  'chat-uuid',
  'contact-uuid',
  'message-uuid'
);
```

#### `createNewSessionNotification(organizacion_id, phoneNumber): Promise<void>`

Helper para notificaciones de nuevas sesiones de WhatsApp.

```typescript
await createNewSessionNotification(
  organizacion_id,
  '+549123456789'
);
```

---

## 🔔 Tiempo Real (WebSocket/SSE)

Las notificaciones se emiten automáticamente por WebSocket cuando se crean.

**Evento:** `notification:new`

**Payload:**

```json
{
  "notification": {
    "id": "uuid",
    "usuario_id": "uuid",
    "titulo": "Nuevo mensaje",
    "mensaje": "Contenido",
    "tipo": "info",
    "prioridad": 3,
    "data": {},
    "leida": false,
    "creado_en": "2025-10-01T10:30:00Z"
  },
  "user_id": "uuid"
}
```

**Hook del cliente:** `useNotificationsSSE()`

---

## 🎨 Tipos de Notificación

| Tipo | Descripción | Color sugerido |
|------|-------------|----------------|
| `info` | Información general | Azul |
| `success` | Operación exitosa | Verde |
| `warning` | Advertencia | Amarillo |
| `error` | Error o problema | Rojo |

## 📊 Niveles de Prioridad

| Nivel | Descripción | Uso sugerido |
|-------|-------------|--------------|
| 1 | Muy baja | Notificaciones opcionales |
| 2 | Baja | Información no urgente |
| 3 | Normal | Notificaciones estándar |
| 4 | Alta | Requiere atención |
| 5 | Urgente | Acción inmediata necesaria |

---

## 🔒 Seguridad

- ✅ Autenticación requerida en todos los endpoints
- ✅ Row Level Security (RLS) en Supabase
- ✅ Validación de UUIDs
- ✅ Los usuarios solo pueden ver sus propias notificaciones
- ✅ Soft delete para mantener auditoría

---

## 📈 Mejoras Futuras

- [ ] Implementar `notificaciones_preferencias` (preferencias por usuario)
- [ ] Push notifications reales (FCM, APNS)
- [ ] Email notifications
- [ ] SMS notifications
- [ ] Agrupamiento inteligente de notificaciones similares
- [ ] Programación de notificaciones (`programada_para`)
- [ ] Expiración automática (`expira_en`)
- [ ] Dashboard de estadísticas

---

## 🧪 Ejemplos de Uso

### Crear notificación para un usuario

```typescript
import { createNotification } from '@/lib/notifications/creator';

await createNotification({
  user_id: 'user-uuid',
  titulo: 'Tarea completada',
  mensaje: 'La tarea "Diseño UI" ha sido completada',
  tipo: 'success',
  prioridad: 3,
  accion_url: '/dashboard/tareas?id=123'
});
```

### Crear notificación para toda la organización

```typescript
import { createNotificationForOrganization } from '@/lib/notifications/creator';

await createNotificationForOrganization('org-uuid', {
  titulo: '🎉 Nueva funcionalidad',
  mensaje: 'Ahora puedes exportar contactos a CSV',
  tipo: 'info',
  prioridad: 2,
  accion_url: '/dashboard/contactos'
});
```

### Marcar todas como leídas desde el frontend

```typescript
const response = await fetch('/api/notificaciones/marcar-todas-leidas', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
});

const result = await response.json();
console.log(`${result.data.updated_count} notificaciones marcadas`);
```

---

## 📝 Notas

- Las notificaciones archivadas (`archivada_en != null`) no se devuelven por defecto en las consultas
- El campo `data` acepta cualquier estructura JSON para flexibilidad
- Las fechas están en formato ISO 8601 con timezone UTC
- La prioridad por defecto es 3 (normal)
- El tipo por defecto es 'info'

---

**Última actualización:** Octubre 2025  
**Versión:** 1.0.0  
**Autor:** Capibet CRM Team

