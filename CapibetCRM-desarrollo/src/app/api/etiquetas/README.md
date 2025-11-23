# API de Etiquetas

Este módulo proporciona endpoints para el manejo de etiquetas en el sistema CRM.

## Estructura de Datos

### EtiquetaData
```typescript
interface EtiquetaData {
  id?: number;
  nombre: string;
  color: string;
  descripcion: string;
  creado_por: number;
  creado_en?: string;
}
```

### EtiquetaResponse
```typescript
interface EtiquetaResponse {
  id: number;
  nombre: string;
  color: string;
  descripcion: string;
  creado_por: number;
  creado_en: string;
}
```

## Endpoints

### POST /api/etiquetas
Crear una nueva etiqueta.

**Body:**
```json
{
  "nombre": "Cliente VIP",
  "color": "#FF5733",
  "descripcion": "Etiqueta para clientes de alto valor",
  "creado_por": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Cliente VIP",
    "color": "#FF5733",
    "descripcion": "Etiqueta para clientes de alto valor",
    "creado_por": 1,
    "creado_en": "2024-01-01T00:00:00Z"
  }
}
```

### GET /api/etiquetas
Obtener todas las etiquetas.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombre": "Cliente VIP",
      "color": "#FF5733",
      "descripcion": "Etiqueta para clientes de alto valor",
      "creado_por": 1,
      "creado_en": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### GET /api/etiquetas/[id]
Obtener una etiqueta específica por ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Cliente VIP",
    "color": "#FF5733",
    "descripcion": "Etiqueta para clientes de alto valor",
    "creado_por": 1,
    "creado_en": "2024-01-01T00:00:00Z"
  }
}
```

### PATCH /api/etiquetas/[id]
Actualizar una etiqueta existente.

**Body:**
```json
{
  "nombre": "Cliente Premium",
  "color": "#00FF00"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Cliente Premium",
    "color": "#00FF00",
    "descripcion": "Etiqueta para clientes de alto valor",
    "creado_por": 1,
    "creado_en": "2024-01-01T00:00:00Z"
  }
}
```

### DELETE /api/etiquetas/[id]
Eliminar una etiqueta.

**Response:**
```json
{
  "success": true,
  "data": undefined
}
```

## Validaciones

- Todos los campos son requeridos al crear una etiqueta: `nombre`, `color`, `descripcion`, `creado_por`
- El campo `creado_en` se establece automáticamente si no se proporciona
- El ID debe ser un número válido para operaciones de actualización y eliminación

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

## Casos de Uso

Las etiquetas son útiles para:
- Categorizar contactos por tipo de cliente
- Organizar mensajes por tema o prioridad
- Filtrar y buscar contenido de manera eficiente
- Aplicar estilos visuales consistentes en la interfaz
