# API de Productos

Este módulo maneja todas las operaciones relacionadas con productos en el sistema.

## Endpoints

### GET /api/productos
Obtiene todos los productos del sistema.

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombre": "Producto ejemplo",
      "precio": 1000,
      "stock": 50,
      "descripcion": "Descripción del producto",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/productos
Crea un nuevo producto.

**Body:**
```json
{
  "nombre": "Nuevo producto",
  "precio": 1500,
  "stock": 25,
  "descripcion": "Descripción del nuevo producto"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "nombre": "Nuevo producto",
    "precio": 1500,
    "stock": 25,
    "descripcion": "Descripción del nuevo producto",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### PATCH /api/productos
Actualiza un producto existente.

**Body:**
```json
{
  "id": 1,
  "nombre": "Producto actualizado",
  "precio": 1200,
  "stock": 30,
  "descripcion": "Descripción actualizada"
}
```

### GET /api/productos/[id]
Obtiene un producto específico por ID.

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Producto ejemplo",
    "precio": 1000,
    "stock": 50,
    "descripcion": "Descripción del producto",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### DELETE /api/productos/[id]
Elimina un producto por ID.

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": null,
  "message": "Producto eliminado exitosamente"
}
```

## Estructura de datos

### ProductData
```typescript
interface ProductData {
  id?: number;
  nombre: string;
  precio: number;
  stock: number;
  descripcion: string;
  created_at?: string;
}
```

### ProductResponse
```typescript
interface ProductResponse {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  descripcion: string;
  created_at: string;
}
```

## Manejo de errores

Todas las respuestas de error siguen el formato:

```json
{
  "success": false,
  "error": "Mensaje de error",
  "details": "Detalles adicionales del error"
}
```