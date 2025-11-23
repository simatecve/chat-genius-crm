# Endpoint de Desconexión de Sesiones WhatsApp QR

## Descripción

Este endpoint permite desconectar una sesión de WhatsApp QR enviando una petición POST al orquestador de WhatsApp.

## Endpoint

```
POST /api/whatsapp_sessions/[id]/disconnect
```

## Parámetros

- `id` (path): ID numérico de la sesión de WhatsApp en la base de datos

## Funcionamiento

1. **Validación**: Verifica que el ID sea válido y que la sesión exista
2. **Verificación de estado**: Confirma que la sesión esté en estado 'connected'
3. **Verificación de session_id**: Asegura que la sesión tenga un session_id del orquestador
4. **Desconexión en orquestador**: Envía petición POST al orquestador: `/sessions/{session_id}/disconnect`
5. **Actualización de estado**: Actualiza el estado de la sesión a 'disconnected' en la base de datos

## Respuestas

### Éxito (200)

```json
{
  "success": true,
  "message": "Sesión desconectada exitosamente",
  "data": {
    "session_id": "session_1234567890_abc123",
    "orchestrator_disconnect": {
      "success": true,
      "message": "Sesión desconectada correctamente"
    },
    "updated_session": {
      "id": 1,
      "session_id": "session_1234567890_abc123",
      "status": "disconnected",
      "phone_number": "+1234567890",
      "last_seen": "2024-01-01T12:00:00Z",
      "auth_folder_path": "/path/to/auth",
      "whatsapp_user_id": "user123",
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-01T12:00:00Z"
    }
  }
}
```

### Error - ID inválido (400)

```json
{
  "success": false,
  "error": "ID inválido"
}
```

### Error - Sesión no encontrada (404)

```json
{
  "success": false,
  "error": "Sesión de WhatsApp no encontrada"
}
```

### Error - Sesión no conectada (400)

```json
{
  "success": false,
  "error": "La sesión no está conectada",
  "details": "Estado actual: disconnected"
}
```

### Error - Sin session_id (400)

```json
{
  "success": false,
  "error": "La sesión no tiene session_id del orquestador"
}
```

### Error - Orquestador no disponible (502)

```json
{
  "success": false,
  "error": "Error al comunicarse con el orquestador de WhatsApp",
  "details": "Error de conexión al orquestador"
}
```

### Error - Desconexión fallida en orquestador (500)

```json
{
  "success": false,
  "error": "Error al desconectar sesión en el orquestador",
  "details": "Mensaje de error del orquestador"
}
```

## Uso desde el Frontend

```typescript
import { whatsappSessionsServices } from '@/services/whatsappSessionsServices';

// Desconectar una sesión
const disconnectSession = async (sessionId: number) => {
  try {
    const result = await whatsappSessionsServices.disconnectSession(sessionId);
    
    if (result.success) {
      console.log('Sesión desconectada:', result.data);
      // Actualizar UI
    } else {
      console.error('Error al desconectar:', result.error);
    }
  } catch (error) {
    console.error('Error inesperado:', error);
  }
};
```

## Configuración del Orquestador

El endpoint utiliza la configuración del orquestador definida en `src/config/whatsapp_api.ts`:

```typescript
export const WHATSAPP_CONFIG = {
  ORCHESTRATOR_BASE_URL: process.env.WHATSAPP_ORCHESTRATOR_URL || 'http://localhost:3000',
  DISCONNECT_SESSION_ENDPOINT: '/sessions',
  REQUEST_TIMEOUT: 30000,
};
```

## Variables de Entorno

- `WHATSAPP_ORCHESTRATOR_URL`: URL base del orquestador de WhatsApp (opcional, por defecto: http://localhost:3000)

## Notas Importantes

1. **Solo sesiones conectadas**: Solo se pueden desconectar sesiones en estado 'connected'
2. **Session_id requerido**: La sesión debe tener un session_id válido del orquestador
3. **Actualización atómica**: Si la desconexión en el orquestador es exitosa pero falla la actualización en BD, se retorna éxito con advertencia
4. **Timeout**: Las peticiones al orquestador tienen un timeout de 30 segundos
5. **Métodos no permitidos**: Solo acepta POST, otros métodos retornan 405
