# API de Mensajes

Este módulo maneja las operaciones CRUD para los mensajes del sistema de chat.

## Endpoints

### POST /api/mensajes
Crea un nuevo mensaje.

**Body:**
```json
{
  "remitente_id": 1,
  "contacto_id": 2,
  "chat_id": 3,
  "type": "text",
  "content": {
    "text": "Hola, ¿cómo estás?"
  }
}
```

### GET /api/mensajes
Obtiene todos los mensajes con filtros opcionales.

**Query Parameters:**
- `chat_id`: Filtrar por chat específico
- `contacto_id`: Filtrar por contacto específico
- `remitente_id`: Filtrar por remitente específico
- `type`: Filtrar por tipo de mensaje
- `limit`: Límite de resultados
- `offset`: Desplazamiento para paginación
- `last_per_chat`: Si es `true`, devuelve solo el último mensaje de cada chat (optimizado para listas de chat)

**Ejemplos:**
```
GET /api/mensajes?chat_id=1&limit=50&offset=0
GET /api/mensajes?last_per_chat=true
```

**Nota sobre `last_per_chat`:** 
Este parámetro es útil para la carga inicial de la lista de chats, ya que devuelve solo el último mensaje de cada chat en lugar de todos los mensajes. Esto mejora significativamente el rendimiento cuando hay muchos mensajes en el sistema.

### GET /api/mensajes/[id]
Obtiene un mensaje específico por ID.

### PATCH /api/mensajes/[id]
Actualiza un mensaje existente.

### DELETE /api/mensajes/[id]
Elimina un mensaje.

## Tipos de Mensaje

- `text`: Mensaje de texto
- `image`: Imagen
- `video`: Video
- `audio`: Audio
- `document`: Documento
- `location`: Ubicación
- `contact`: Contacto
- `sticker`: Sticker
- `system`: Mensaje del sistema

## Estructura del Content

El campo `content` es un objeto JSON que varía según el tipo de mensaje:

### Texto
```json
{
  "text": "Contenido del mensaje"
}
```

### Multimedia (image, video, audio, document)
```json
{
  "media_url": "https://ejemplo.com/archivo.jpg",
  "media_type": "image/jpeg",
  "file_name": "imagen.jpg",
  "file_size": 1024000
}
```

### Ubicación
```json
{
  "location": {
    "latitude": -34.6037,
    "longitude": -58.3816,
    "address": "Buenos Aires, Argentina"
  }
}
```

### Contacto
```json
{
  "contact": {
    "name": "Juan Pérez",
    "phone": "+54911234567",
    "email": "juan@ejemplo.com"
  }
}
```

### Metadatos
```json
{
  "metadata": {
    "custom_field": "valor",
    "priority": "high"
  }
}
```

## Servicios Disponibles

El módulo incluye servicios especializados para diferentes tipos de mensajes:

- `enviarMensajeTexto()`: Envía mensajes de texto
- `enviarMensajeMultimedia()`: Envía archivos multimedia
- `enviarMensajeUbicacion()`: Envía ubicaciones
- `enviarMensajeContacto()`: Envía contactos
- `getHistorialChat()`: Obtiene historial de chat con paginación
- `getMensajesByChat()`: Obtiene mensajes de un chat específico
- `getMensajesByContacto()`: Obtiene mensajes de un contacto específico

## Validaciones

- Campos requeridos: `remitente_id`, `contacto_id`, `chat_id`, `type`, `content`
- Para mensajes de tipo `text`: `content.text` es requerido
- Para mensajes de tipo `location`: `content.location` es requerido
- Para mensajes de tipo `contact`: `content.contact` es requerido
- El campo `creado_en` se establece automáticamente si no se proporciona

## Manejo de Errores

Todos los endpoints devuelven respuestas consistentes:

```json
{
  "success": false,
  "error": "Descripción del error",
  "details": "Detalles adicionales del error"
}
```

Los códigos de estado HTTP estándar se utilizan para indicar el tipo de error:
- 400: Bad Request (datos inválidos)
- 404: Not Found (recurso no encontrado)
- 500: Internal Server Error (error del servidor)