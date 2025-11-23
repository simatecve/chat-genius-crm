# API de Embudos - Documentación

Esta API proporciona endpoints para la gestión completa de embudos en el sistema CRM. Todos los endpoints están implementados siguiendo el patrón DDD (Domain-Driven Design) y se conectan directamente con Supabase.

## 📁 Estructura del Proyecto

```
src/app/api/embudos/
├── domain/
│   └── embudo.ts              # Interfaces y tipos del dominio
├── [id]/
│   └── route.ts               # GET, PATCH, DELETE por ID
├── update-order/
│   └── route.ts               # PATCH para actualizar orden
├── utils/
│   ├── getHeaders.ts          # Utilidades para headers
│   ├── handleResponse.ts      # Manejo de respuestas
│   └── index.ts               # Exportaciones
├── route.ts                   # GET todos, POST crear
└── README.md                  # Esta documentación
```

## 🔗 Endpoints Disponibles

### 1. **POST** `/api/embudos` - Crear Embudo

Crea un nuevo embudo en el sistema.

**Request Body:**
```json
{
  "nombre": "Embudo de Ventas",
  "descripcion": "Proceso de ventas para nuevos clientes",
  "creado_por": 1,
  "espacio_id": 1,
  "orden": 0
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Embudo de Ventas",
    "descripcion": "Proceso de ventas para nuevos clientes",
    "creado_por": 1,
    "creado_en": "2024-01-15T10:30:00Z",
    "actualizado_en": "2024-01-15T10:30:00Z",
    "espacio_id": 1,
    "orden": 0
  }
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "Error del servidor: 400 Bad Request",
  "details": "Faltan campos requeridos: nombre, creado_por, espacio_id"
}
```

---

### 2. **GET** `/api/embudos` - Obtener Todos los Embudos

Retorna una lista de todos los embudos registrados. Opcionalmente puede filtrar por espacio de trabajo.

**Query Parameters:**
- `espacio_id` (number, opcional): Filtrar embudos por espacio de trabajo

**Ejemplo de Request:**
```
GET /api/embudos
GET /api/embudos?espacio_id=1
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombre": "Embudo de Ventas",
      "descripcion": "Proceso de ventas para nuevos clientes",
      "creado_por": 1,
      "creado_en": "2024-01-15T10:30:00Z",
      "actualizado_en": "2024-01-15T10:30:00Z",
      "espacio_id": 1,
      "orden": 0
    },
    {
      "id": 2,
      "nombre": "Embudo de Marketing",
      "descripcion": "Proceso de captación de leads",
      "creado_por": 1,
      "creado_en": "2024-01-15T11:00:00Z",
      "actualizado_en": "2024-01-15T11:00:00Z",
      "espacio_id": 1,
      "orden": 1
    }
  ]
}
```

---

### 3. **GET** `/api/embudos/[id]` - Obtener Embudo por ID

Retorna los datos de un embudo específico.

**Parámetros:**
- `id` (number): ID del embudo

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Embudo de Ventas",
    "descripcion": "Proceso de ventas para nuevos clientes",
    "creado_por": 1,
    "creado_en": "2024-01-15T10:30:00Z",
    "actualizado_en": "2024-01-15T10:30:00Z",
    "espacio_id": 1,
    "orden": 0
  }
}
```

**Response (404):**
```json
{
  "success": true,
  "data": null
}
```

---

### 4. **PATCH** `/api/embudos/[id]` - Actualizar Embudo

Actualiza los datos de un embudo existente.

**Parámetros:**
- `id` (number): ID del embudo

**Request Body:**
```json
{
  "nombre": "Embudo de Ventas Actualizado",
  "descripcion": "Nueva descripción del proceso",
  "orden": 2
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Embudo de Ventas Actualizado",
    "descripcion": "Nueva descripción del proceso",
    "creado_por": 1,
    "creado_en": "2024-01-15T10:30:00Z",
    "actualizado_en": "2024-01-15T12:00:00Z",
    "espacio_id": 1,
    "orden": 2
  }
}
```

---

### 5. **DELETE** `/api/embudos/[id]` - Eliminar Embudo

Elimina un embudo del sistema.

**Parámetros:**
- `id` (number): ID del embudo

**Response (200):**
```json
{
  "success": true,
  "data": undefined
}
```

---

### 6. **PATCH** `/api/embudos/update-order` - Actualizar Orden de Embudos

Actualiza el orden de múltiples embudos de forma atómica.

**Request Body:**
```json
{
  "embudos": [
    {
      "id": 1,
      "orden": 2
    },
    {
      "id": 2,
      "orden": 1
    },
    {
      "id": 3,
      "orden": 0
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": undefined,
  "message": "Orden de embudos actualizado exitosamente"
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "Se requiere un array de embudos con id y orden"
}
```

---

## 🔧 Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| 200 | Operación exitosa |
| 201 | Recurso creado exitosamente |
| 400 | Error en la petición (datos inválidos) |
| 404 | Recurso no encontrado |
| 500 | Error interno del servidor |

---

## 📝 Notas Importantes

1. **Autenticación**: Todos los endpoints requieren autenticación con Supabase usando service role key.

2. **Validaciones**: 
   - Los campos `nombre`, `creado_por` y `espacio_id` son requeridos para crear embudos
   - Los IDs deben ser números válidos (validación con `isNaN(Number(id))`)
   - El campo `orden` es opcional y por defecto es 0
   - El campo `descripcion` es opcional
   - Los campos `id` y `orden` son requeridos en el array de actualización de orden

3. **Manejo de Errores**: Todos los endpoints incluyen manejo consistente de errores con mensajes descriptivos:
   - Errores de validación (400)
   - Errores de servidor (500)

4. **Respuestas**: Todas las respuestas siguen el formato estándar con `success`, `data`, `error` y `details` opcional.

5. **Filtrado**: El endpoint GET principal soporta filtrado por `espacio_id` usando query parameters.

6. **Actualización de Orden**: El endpoint de actualización de orden es atómico, todas las actualizaciones se realizan o ninguna.

7. **Campos Opcionales**:
   - `descripcion` es opcional en creación y actualización
   - `orden` es opcional en creación (valor por defecto: 0)
   - `id` es opcional en creación (se genera automáticamente)

---

## 📋 Tipos de Datos

### EmbudoData (Para creación)
```typescript
interface EmbudoData {
  id?: number;                    // Opcional, se genera automáticamente
  nombre: string;                 // Requerido
  descripcion?: string;           // Opcional
  creado_por: number;             // Requerido
  espacio_id: number;             // Requerido
  orden?: number;                 // Opcional, default: 0
}
```

### EmbudoResponse (Respuesta de la API)
```typescript
interface EmbudoResponse {
  id: number;                     // Siempre presente
  nombre: string;
  descripcion: string | null;     // Puede ser null
  creado_por: number;
  creado_en: string;              // Timestamp de creación
  actualizado_en: string;         // Timestamp de actualización
  espacio_id: number;
  orden: number;                  // Siempre presente
}
```

### UpdateOrderRequest
```typescript
interface UpdateOrderRequest {
  embudos: Array<{
    id: number;                   // Requerido
    orden: number;                // Requerido
  }>;
}
```

### ApiResponse (Respuesta estándar)
```typescript
interface ApiResponse<T = unknown> {
  success: boolean;               // Siempre presente
  data?: T;                       // Datos de respuesta
  error?: string;                 // Mensaje de error
  details?: string;               // Detalles adicionales del error
}
```

---

## 🚀 Uso en el Frontend

```typescript
// Tipos de datos (importar desde el dominio)
import { EmbudoData, EmbudoResponse, UpdateOrderRequest } from './domain/embudo';

// Crear embudo
const createEmbudo = async (embudoData: EmbudoData) => {
  const response = await fetch('/api/embudos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(embudoData),
  });
  
  return await response.json();
};

// Obtener todos los embudos
const getEmbudos = async (espacioId?: number): Promise<EmbudoResponse[]> => {
  const url = espacioId ? `/api/embudos?espacio_id=${espacioId}` : '/api/embudos';
  const response = await fetch(url);
  const result = await response.json();
  return result.data || [];
};

// Obtener embudo por ID
const getEmbudoById = async (id: number): Promise<EmbudoResponse | null> => {
  const response = await fetch(`/api/embudos/${id}`);
  const result = await response.json();
  return result.data;
};

// Actualizar embudo
const updateEmbudo = async (id: number, embudoData: Partial<EmbudoData>) => {
  const response = await fetch(`/api/embudos/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(embudoData),
  });
  
  return await response.json();
};

// Eliminar embudo
const deleteEmbudo = async (id: number) => {
  const response = await fetch(`/api/embudos/${id}`, {
    method: 'DELETE',
  });
  
  return await response.json();
};

// Actualizar orden de embudos
const updateEmbudosOrder = async (embudos: Array<{id: number, orden: number}>) => {
  const response = await fetch('/api/embudos/update-order', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ embudos }),
  });
  
  return await response.json();
};
```

---

## ⚠️ Errores Comunes

### 400 Bad Request
- **ID inválido**: `"ID de embudo inválido"` - El ID debe ser un número válido
- **Campos faltantes**: `"Faltan campos requeridos: nombre, creado_por, espacio_id"` - Faltan campos obligatorios
- **Array inválido**: `"Se requiere un array de embudos con id y orden"` - El array de actualización de orden es inválido
- **Datos inválidos**: `"Error del servidor: 400 Bad Request"` - Datos enviados no válidos

### 500 Internal Server Error
- **Error de conexión**: `"Error de conexión al [operación]"` - Problemas de conectividad con Supabase
- **Error del servidor**: `"Error del servidor: [código] [mensaje]"` - Error específico de Supabase

---

*Documentación actualizada - Última actualización: Diciembre 2024*
