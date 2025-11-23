# API de Chats

Este módulo maneja las operaciones CRUD para la entidad `chats` en el sistema CRM.

## Estructura de Datos

### ChatData
```typescript
interface ChatData {
  id?: string;           // UUID del chat (opcional para creación)
  sesion_id: string;     // UUID de la sesión asociada
  contact_id: string;    // UUID del contacto asociado
  embudo_id: string;     // UUID del embudo asociado
}
```

### ChatResponse
```typescript
interface ChatResponse {
  id: string;            // UUID del chat
  sesion_id: string;     // UUID de la sesión asociada
  contact_id: string;    // UUID del contacto asociado
  embudo_id: string;     // UUID del embudo asociado
  created_at: string;    // Fecha de creación (timestamp)
}
```

## Endpoints Disponibles

### GET /api/chats
Obtiene todos los chats del sistema.

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "sesion_id": "550e8400-e29b-41d4-a716-446655440001",
      "contact_id": "550e8400-e29b-41d4-a716-446655440002",
      "embudo_id": "550e8400-e29b-41d4-a716-446655440003",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/chats
Crea un nuevo chat.

**Body:**
```json
{
  "sesion_id": "550e8400-e29b-41d4-a716-446655440001",
  "contact_id": "550e8400-e29b-41d4-a716-446655440002",
  "embudo_id": "550e8400-e29b-41d4-a716-446655440003"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "sesion_id": "550e8400-e29b-41d4-a716-446655440001",
    "contact_id": "550e8400-e29b-41d4-a716-446655440002",
    "embudo_id": "550e8400-e29b-41d4-a716-446655440003",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### PATCH /api/chats
Actualiza un chat existente.

**Body:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "embudo_id": "550e8400-e29b-41d4-a716-446655440004"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "sesion_id": "550e8400-e29b-41d4-a716-446655440001",
    "contact_id": "550e8400-e29b-41d4-a716-446655440002",
    "embudo_id": "550e8400-e29b-41d4-a716-446655440004",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### DELETE /api/chats?id={id}
Elimina un chat por ID.

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": undefined
}
```

### GET /api/chats/[id]
Obtiene un chat específico por ID.

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "sesion_id": "550e8400-e29b-41d4-a716-446655440001",
    "contact_id": "550e8400-e29b-41d4-a716-446655440002",
    "embudo_id": "550e8400-e29b-41d4-a716-446655440003",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### PATCH /api/chats/[id]
Actualiza un chat específico por ID.

**Body:**
```json
{
  "embudo_id": "550e8400-e29b-41d4-a716-446655440004"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "sesion_id": "550e8400-e29b-41d4-a716-446655440001",
    "contact_id": "550e8400-e29b-41d4-a716-446655440002",
    "embudo_id": "550e8400-e29b-41d4-a716-446655440004",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### DELETE /api/chats/[id]
Elimina un chat específico por ID.

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": undefined
}
```

## Códigos de Error

- `400`: Bad Request - Datos inválidos o faltantes
- `404`: Not Found - Chat no encontrado
- `500`: Internal Server Error - Error del servidor

## Ejemplos de Uso

### Crear un nuevo chat
```javascript
const response = await fetch('/api/chats', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sesion_id: '550e8400-e29b-41d4-a716-446655440001',
    contact_id: '550e8400-e29b-41d4-a716-446655440002',
    embudo_id: '550e8400-e29b-41d4-a716-446655440003'
  })
});

const result = await response.json();
```

### Obtener todos los chats
```javascript
const response = await fetch('/api/chats');
const result = await response.json();
```

### Actualizar un chat
```javascript
const response = await fetch('/api/chats/550e8400-e29b-41d4-a716-446655440000', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    embudo_id: '550e8400-e29b-41d4-a716-446655440004'
  })
});

const result = await response.json();
```

### Eliminar un chat
```javascript
const response = await fetch('/api/chats/550e8400-e29b-41d4-a716-446655440000', {
  method: 'DELETE'
});

const result = await response.json();
```
