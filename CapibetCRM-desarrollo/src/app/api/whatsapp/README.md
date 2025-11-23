# API de WhatsApp - Endpoints para el Orquestador

Este directorio contiene los endpoints que utiliza el orquestador de WhatsApp para comunicarse con el backend principal del CRM.

## Estructura de Endpoints

### 1. Status Update - `POST /api/whatsapp/sessions/status-update`

**Propósito**: Actualizar el estado de una sesión de WhatsApp cuando cambia (conectada, desconectada, error, etc.)

**Cuándo se llama**: El orquestador llama a este endpoint cada vez que el estado de una sesión cambia.

**Payload esperado**:
```typescript
{
  session_id: string,           // UUID único de la sesión en el orquestador
  status: 'connected' | 'disconnected' | 'expired' | 'pending',
  last_seen?: string,           // Timestamp ISO de último contacto
  phone_number?: string,        // Número de teléfono conectado
  whatsapp_user_id?: string,    // ID del usuario en WhatsApp
  auth_folder_path?: string,    // Ruta de la carpeta de autenticación
  server_port?: number | null   // Puerto del servidor de la sesión
}
```

**Respuesta**:
```typescript
{
  success: boolean,
  message: string,
  data?: WhatsAppSessionResponse
}
```

**Funcionalidad**:
- Busca la sesión existente por `session_id`
- Actualiza el estado y campos opcionales
- Actualiza `updated_at` automáticamente
- Retorna la sesión actualizada

---

### 2. Messages Received - `POST /api/whatsapp/messages/received`

**Propósito**: Procesar y guardar mensajes recibidos de WhatsApp en cualquier sesión.

**Cuándo se llama**: Cada vez que llega un mensaje a cualquier sesión de WhatsApp.

**Payload esperado**:
```typescript
{
  session_id: string,           // UUID de la sesión que recibió el mensaje
  from: string,                 // Número de teléfono del remitente
  to: string,                   // Número de teléfono del receptor
  message: {
    type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact' | 'sticker',
    text?: string,              // Para mensajes de texto
    image?: {                   // Para imágenes
      id: string,
      url?: string,
      caption?: string
    },
    // ... otros tipos de mensaje
  },
  timestamp: string,            // Timestamp del mensaje
  message_id: string           // ID único del mensaje en WhatsApp
}
```

**Respuesta**:
```typescript
{
  success: boolean,
  message: string,
  data?: {
    message: MensajeResponse,
    contact_id: number,
    chat_id: number
  }
}
```

**Funcionalidad**:
- Busca la sesión de WhatsApp por `session_id`
- Busca o crea automáticamente un contacto basado en el número `from`
- Busca o crea automáticamente un chat entre la sesión y el contacto
- Guarda el mensaje en la tabla `mensajes` con tipo `whatsapp_api`
- Incluye toda la información del mensaje en el campo `content`

---

### 3. QR Update - `POST /api/whatsapp/sessions/qr-update`

**Propósito**: Notificar cuando se genera un nuevo código QR para una sesión (reconexiones).

**Cuándo se llama**: Cuando el orquestador genera un nuevo QR para que el usuario escanee.

**Payload esperado**:
```typescript
{
  session_id: string,           // UUID de la sesión
  qr_code: string,             // Código QR en formato base64 o string
  qr_url?: string,             // URL opcional del QR
  timestamp: string            // Timestamp de generación
}
```

**Respuesta**:
```typescript
{
  success: boolean,
  message: string,
  data?: {
    session: WhatsAppSessionResponse,
    qr_code: string,
    qr_url?: string,
    timestamp: string
  }
}
```

**Funcionalidad**:
- Busca la sesión por `session_id`
- Actualiza el estado a `pending` (ya que necesita reconexión)
- Retorna la información del QR para que el frontend pueda mostrarlo
- Prepara el sistema para futuras notificaciones WebSocket/SSE

---

## Manejo de Errores

Todos los endpoints manejan errores de manera consistente:

- **400 Bad Request**: Parámetros faltantes o inválidos
- **404 Not Found**: Sesión no encontrada
- **405 Method Not Allowed**: Método HTTP no soportado
- **500 Internal Server Error**: Errores del servidor o base de datos

## Logging

Cada endpoint registra eventos importantes:
- Actualizaciones de estado exitosas
- Mensajes recibidos y procesados  
- Generación de nuevos QR codes
- Errores y excepciones para debugging

## Seguridad

Los endpoints utilizan:
- Validación de parámetros obligatorios
- Headers de autenticación con Supabase
- Manejo seguro de respuestas de la base de datos
- Logging detallado para auditoría

## Integración con el Frontend

El frontend puede:
- Monitorear cambios de estado de sesiones
- Mostrar nuevos códigos QR cuando se generen
- Procesar mensajes recibidos en tiempo real
- Manejar errores de conexión appropriadamente
