# API de WhatsApp Sessions - Documentación

Esta API proporciona endpoints para la gestión completa de sesiones de WhatsApp vinculadas con el orquestador externo. Maneja el ciclo de vida completo desde la generación de QR hasta la conexión exitosa.

## 📁 Estructura del Proyecto

```
src/app/api/whatsapp_sessions/
├── domain/
│   └── whatsapp_session.ts    # Interfaces y tipos del dominio
├── [id]/
│   └── route.ts               # GET, PATCH, DELETE por ID
├── new-session-connected/
│   └── route.ts               # POST - Webhook del orquestador
├── utils/
│   ├── getHeaders.ts          # Utilidades para headers
│   ├── handleResponse.ts      # Manejo de respuestas
│   └── index.ts              # Exportaciones
├── route.ts                   # GET todos, POST crear
└── README.md                  # Esta documentación
```

## 🔗 Endpoints Disponibles

### 1. **POST** `/api/whatsapp_sessions` - Crear Sesión de WhatsApp

Crea una nueva sesión de WhatsApp en estado 'pending' vinculada a una sesión existente.

**Request Body:**
```json
{
  "session_id": "session_1705312200123_abc123def",
  "sesion_id": 1
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "session_id": "session_1705312200123_abc123def",
    "sesion_id": 1,
    "status": "pending",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

### 2. **GET** `/api/whatsapp_sessions` - Obtener Todas las Sesiones

Obtiene todas las sesiones de WhatsApp del sistema.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "session_id": "session_1705312200123_abc123def",
      "sesion_id": 1,
      "phone_number": "5491234567890",
      "status": "connected",
      "last_seen": "2024-01-15T10:30:00Z",
      "auth_folder_path": "./auth_sessions/session_1705312200123_abc123def",
      "server_port": null,
      "whatsapp_user_id": "5491234567890:1@s.whatsapp.net",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 3. **GET** `/api/whatsapp_sessions/[id]` - Obtener Sesión por ID

Obtiene una sesión de WhatsApp específica por su ID.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "session_id": "session_1705312200123_abc123def",
    "sesion_id": 1,
    "phone_number": "5491234567890",
    "status": "connected",
    "last_seen": "2024-01-15T10:30:00Z",
    "auth_folder_path": "./auth_sessions/session_1705312200123_abc123def",
    "server_port": null,
    "whatsapp_user_id": "5491234567890:1@s.whatsapp.net",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

### 4. **PATCH** `/api/whatsapp_sessions/[id]` - Actualizar Sesión

Actualiza una sesión de WhatsApp existente.

**Request Body:**
```json
{
  "status": "connected",
  "phone_number": "5491234567890",
  "last_seen": "2024-01-15T10:30:00Z"
}
```

### 5. **DELETE** `/api/whatsapp_sessions/[id]` - Eliminar Sesión

Elimina una sesión de WhatsApp del sistema.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Sesión de WhatsApp eliminada correctamente"
  }
}
```

### 6. **POST** `/api/whatsapp_sessions/new-session-connected` - Webhook del Orquestador

**🔔 Endpoint especial que recibe notificaciones automáticas del orquestador de WhatsApp.**

Este endpoint es llamado automáticamente por el orquestador cuando un usuario escanea exitosamente el QR y se conecta.

**Request Body (enviado por el orquestador):**
```json
{
  "session_id": "session_1705312200123_abc123def",
  "phone_number": "5491234567890",
  "status": "connected",
  "last_seen": "2024-01-15T10:30:00.000Z",
  "auth_folder_path": "./auth_sessions/session_1705312200123_abc123def",
  "server_port": null,
  "whatsapp_user_id": "5491234567890:1@s.whatsapp.net",
  "created_at": "2024-01-15T10:30:00.000Z",
  "updated_at": "2024-01-15T10:30:00.000Z"
}
```

**Funcionalidad:**
1. Busca la sesión de WhatsApp por `session_id`
2. Actualiza todos los datos de conexión
3. Cambia el estado de la sesión principal a 'activo'
4. Retorna la sesión actualizada

## 🔄 Flujo de Vinculación

### 1. Frontend solicita QR
```
GET http://localhost:3000/generate-qr
```

### 2. Frontend crea sesión pendiente
```
POST /api/whatsapp_sessions
{
  "session_id": "session_from_qr_response",
  "sesion_id": 1
}
```

### 3. Usuario escanea QR

### 4. Orquestador notifica conexión automáticamente
```
POST /api/whatsapp_sessions/new-session-connected
{
  "session_id": "session_from_qr_response",
  "phone_number": "...",
  "status": "connected",
  ...
}
```

### 5. Sistema actualiza ambas tablas
- `whatsapp_sessions`: datos completos de WhatsApp
- `sesiones`: estado 'activo' y phone_number

## 📊 Estados de Sesión

- **pending**: QR generado, esperando escaneo
- **connected**: Usuario escaneó QR exitosamente
- **disconnected**: Sesión desconectada
- **expired**: QR o sesión expirados

## 🔍 Consultas Útiles

### Buscar por sesion_id:
```
GET /api/whatsapp_sessions?sesion_id=eq.1
```

### Buscar por session_id del orquestador:
```
GET /api/whatsapp_sessions?session_id=eq.session_1705312200123_abc123def
```

### Sesiones activas:
```
GET /api/whatsapp_sessions?status=eq.connected
```

## ⚠️ Consideraciones

- El `session_id` es generado por el orquestador y debe ser único
- La tabla `whatsapp_sessions` debe existir en Supabase
- Se requiere `SUPABASE_SERVICE_ROLE_KEY` para operaciones completas
- El orquestador debe estar configurado para enviar notificaciones a nuestro endpoint
