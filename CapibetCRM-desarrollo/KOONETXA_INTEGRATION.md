/**
 * Documentación de integración con Koonetxa WhatsApp API
 * 
 * Este documento describe cómo integrar la API de Koonetxa en el sistema
 */

# Integración con Koonetxa WhatsApp API

## Configuración

### Variables de Entorno Requeridas

Agregar al archivo `.env.local`:

```env
# Koonetxa API Configuration
KOONETXA_API_URL=https://api.koonetxa.com
KOONETXA_API_KEY=tu_api_key_aqui
KOONETXA_WEBHOOK_SECRET=tu_webhook_secret_aqui
```

## Endpoints Principales

### 1. Autenticación de Sesión

**Endpoint:** `POST /auth/session`

**Descripción:** Inicia una nueva sesión de WhatsApp y genera un QR para escanear.

**Request:**
```json
{
  "sessionId": "unique_session_id",
  "webhookUrl": "https://tu-dominio.com/api/koonetxa/webhook"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "unique_session_id",
  "qrCode": "data:image/png;base64,...",
  "status": "qr_ready",
  "expiresIn": 60
}
```

### 2. Verificar Estado de Sesión

**Endpoint:** `GET /auth/session/{sessionId}`

**Response:**
```json
{
  "success": true,
  "sessionId": "unique_session_id",
  "status": "connected",
  "phoneNumber": "593983859723",
  "connectedAt": "2025-11-21T03:00:00Z"
}
```

### 3. Actualizar Sesión

**Endpoint:** `PATCH /auth/session/{sessionId}`

**Request:**
```json
{
  "webhookUrl": "https://nuevo-dominio.com/api/webhook",
  "settings": {
    "autoReply": false
  }
}
```

### 4. Desconectar Sesión

**Endpoint:** `DELETE /auth/session/{sessionId}`

**Response:**
```json
{
  "success": true,
  "message": "Session disconnected successfully"
}
```

### 5. Enviar Mensaje

**Endpoint:** `POST /messages/send`

**Request:**
```json
{
  "sessionId": "unique_session_id",
  "to": "593983859723",
  "type": "text",
  "message": "Hola, este es un mensaje de prueba"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "msg_123456",
  "status": "sent"
}
```

### 6. Enviar Mensaje con Media

**Request:**
```json
{
  "sessionId": "unique_session_id",
  "to": "593983859723",
  "type": "image",
  "mediaUrl": "https://example.com/image.jpg",
  "caption": "Mira esta imagen"
}
```

## Webhooks

### Configuración del Webhook

El webhook debe estar configurado en: `/api/koonetxa/webhook`

### Eventos Recibidos

#### 1. Mensaje Recibido

```json
{
  "event": "message.received",
  "sessionId": "unique_session_id",
  "data": {
    "messageId": "msg_123456",
    "from": "593983859723",
    "to": "593987654321",
    "type": "text",
    "message": "Hola",
    "timestamp": "2025-11-21T03:00:00Z"
  }
}
```

#### 2. Estado de Sesión Actualizado

```json
{
  "event": "session.status",
  "sessionId": "unique_session_id",
  "data": {
    "status": "connected",
    "phoneNumber": "593983859723",
    "timestamp": "2025-11-21T03:00:00Z"
  }
}
```

#### 3. QR Actualizado

```json
{
  "event": "qr.updated",
  "sessionId": "unique_session_id",
  "data": {
    "qrCode": "data:image/png;base64,...",
    "expiresIn": 60,
    "timestamp": "2025-11-21T03:00:00Z"
  }
}
```

## Flujo de Integración

### Opción 1: Reemplazar Baileys Completamente

1. Modificar `VincularSesionModal.tsx` para usar Koonetxa en lugar de Baileys
2. Actualizar endpoints en `/api/whatsapp/` para usar `koonetxaService`
3. Configurar webhook en `/api/koonetxa/webhook`
4. Eliminar dependencia de Baileys y el orquestador

### Opción 2: Ofrecer Ambas Opciones

1. Agregar un selector en el modal para elegir entre "Baileys" o "Koonetxa"
2. Mantener ambos sistemas funcionando en paralelo
3. Permitir al usuario elegir cuál usar según sus necesidades

## Ventajas de Koonetxa vs Baileys

### Koonetxa (API HTTP)
✅ Más estable y confiable
✅ No requiere servidor Node.js separado
✅ Manejo de sesiones en la nube
✅ Menor complejidad de infraestructura
✅ Soporte oficial y actualizaciones
❌ Costo por uso
❌ Dependencia de servicio externo

### Baileys (WebSocket Directo)
✅ Gratis y open source
✅ Control total sobre la infraestructura
✅ Sin límites de uso
❌ Más complejo de mantener
❌ Requiere servidor Node.js separado
❌ Puede tener problemas de estabilidad

## Implementación Recomendada

### Paso 1: Crear Endpoint de Webhook

Archivo: `/src/app/api/koonetxa/webhook/route.ts`

### Paso 2: Actualizar Modal de Vinculación

Agregar opción para seleccionar tipo de conexión:
- WhatsApp QR (Baileys)
- WhatsApp API (Koonetxa)

### Paso 3: Crear Endpoints de Proxy

- `/api/koonetxa/session/create`
- `/api/koonetxa/session/status`
- `/api/koonetxa/session/disconnect`
- `/api/koonetxa/messages/send`

### Paso 4: Actualizar Base de Datos

Agregar campo `connection_type` a la tabla `sesiones`:
- 'whatsapp_qr' (Baileys)
- 'whatsapp_api' (Koonetxa)

## Migración de Baileys a Koonetxa

Si decides migrar completamente:

1. Exportar sesiones actuales de Baileys
2. Crear nuevas sesiones en Koonetxa
3. Actualizar referencias en la base de datos
4. Desconectar sesiones de Baileys
5. Eliminar orquestador de Baileys (opcional)

## Costos Estimados

Consultar con Koonetxa para:
- Costo por sesión activa
- Costo por mensaje enviado
- Límites de uso
- Planes disponibles
