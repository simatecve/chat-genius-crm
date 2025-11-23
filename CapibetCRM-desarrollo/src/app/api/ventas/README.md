# API de Ventas

Este módulo maneja todas las operaciones relacionadas con las ventas del sistema CRM.

## Estructura de la tabla `ventas`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | bigint | Identificador único de la venta |
| created_at | timestamp with time zone | Fecha y hora de creación |
| producto_id | bigint | ID del producto vendido |
| cliente_id | bigint | ID del cliente que realizó la compra |
| cantidad | bigint | Cantidad del producto vendido |
| fecha | text | Fecha de la venta |
| vendedor_id | bigint | ID del vendedor que realizó la venta |

## Endpoints disponibles

### GET /api/ventas
Obtiene todas las ventas registradas en el sistema.

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "created_at": "2024-01-15T10:30:00Z",
      "producto_id": 123,
      "cliente_id": 456,
      "cantidad": 2,
      "fecha": "2024-01-15",
      "vendedor_id": 789
    }
  ]
}
```

### POST /api/ventas
Crea una nueva venta.

**Body requerido:**
```json
{
  "producto_id": 123,
  "cliente_id": 456,
  "cantidad": 2,
  "fecha": "2024-01-15",
  "vendedor_id": 789
}
```

### PATCH /api/ventas
Actualiza una venta existente.

**Body requerido:**
```json
{
  "id": 1,
  "cantidad": 3,
  "fecha": "2024-01-16"
}
```

### GET /api/ventas/[id]
Obtiene una venta específica por su ID.

### PATCH /api/ventas/[id]
Actualiza una venta específica por su ID.

### DELETE /api/ventas/[id]
Elimina una venta específica por su ID.

## Manejo de errores

Todos los endpoints devuelven respuestas consistentes:

**Error:**
```json
{
  "success": false,
  "error": "Descripción del error",
  "details": "Detalles adicionales del error"
}
```

## Validaciones

- `producto_id`: Requerido, debe ser un número válido
- `cliente_id`: Requerido, debe ser un número válido
- `cantidad`: Requerido, debe ser un número mayor a 0
- `fecha`: Requerido, debe ser una cadena de texto válida
- `vendedor_id`: Requerido, debe ser un número válido
