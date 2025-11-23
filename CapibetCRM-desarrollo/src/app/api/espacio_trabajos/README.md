# API de Espacios de Trabajo - Documentación

Esta API proporciona endpoints para la gestión completa de espacios de trabajo en el sistema CRM. Todos los endpoints están implementados siguiendo el patrón DDD (Domain-Driven Design) y se conectan directamente con Supabase.

## 📁 Estructura del Proyecto

```
src/app/api/espacio_trabajos/
├── domain/
│   └── espacio_trabajo.ts     # Interfaces y tipos del dominio
├── [id]/
│   └── route.ts               # GET, PATCH, DELETE por ID
├── utils/
│   ├── getHeaders.ts          # Utilidades para headers
│   ├── handleResponse.ts      # Manejo de respuestas
│   └── index.ts              # Exportaciones
├── route.ts                   # GET todos, POST crear
└── README.md                  # Esta documentación
```

## 🔗 Endpoints Disponibles

### 1. **POST** `/api/espacio_trabajos` - Crear Espacio de Trabajo

Crea un nuevo espacio de trabajo en el sistema.

**Request Body:**
```json
{
  "nombre": "Espacio de Ventas",
  "creado_por": 1
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Espacio de Ventas",
    "creado_por": 1,
    "creado_en": "2024-01-15T10:30:00Z",
    "actualizado_en": "2024-01-15T10:30:00Z"
  }
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "Error del servidor: 400 Bad Request",
  "details": "Datos de espacio de trabajo inválidos"
}
```

---

### 2. **GET** `/api/espacio_trabajos` - Obtener Todos los Espacios de Trabajo

Retorna una lista de todos los espacios de trabajo registrados.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombre": "Espacio de Ventas",
      "creado_por": 1,
      "creado_en": "2024-01-15T10:30:00Z",
      "actualizado_en": "2024-01-15T10:30:00Z"
    },
    {
      "id": 2,
      "nombre": "Espacio de Marketing",
      "creado_por": 2,
      "creado_en": "2024-01-15T11:00:00Z",
      "actualizado_en": "2024-01-15T11:00:00Z"
    }
  ]
}
```

---

### 3. **GET** `/api/espacio_trabajos/[id]` - Obtener Espacio de Trabajo por ID

Retorna los datos de un espacio de trabajo específico.

**Parámetros:**
- `id` (number): ID del espacio de trabajo

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Espacio de Ventas",
    "creado_por": 1,
    "creado_en": "2024-01-15T10:30:00Z",
    "actualizado_en": "2024-01-15T10:30:00Z"
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

### 4. **PATCH** `/api/espacio_trabajos/[id]` - Actualizar Espacio de Trabajo

Actualiza los datos de un espacio de trabajo existente.

**Parámetros:**
- `id` (number): ID del espacio de trabajo

**Request Body:**
```json
{
  "nombre": "Espacio de Ventas Premium"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Espacio de Ventas Premium",
    "creado_por": 1,
    "creado_en": "2024-01-15T10:30:00Z",
    "actualizado_en": "2024-01-15T12:00:00Z"
  }
}
```

---

### 5. **DELETE** `/api/espacio_trabajos/[id]` - Eliminar Espacio de Trabajo

Elimina un espacio de trabajo del sistema.

**Parámetros:**
- `id` (number): ID del espacio de trabajo

**Response (200):**
```json
{
  "success": true,
  "data": undefined
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
   - Los IDs deben ser números válidos (validación con `isNaN(Number(id))`)
   - El campo `nombre` es requerido
   - El campo `creado_por` es requerido
   - Los campos requeridos se validan en cada endpoint

3. **Manejo de Errores**: Todos los endpoints incluyen manejo consistente de errores con mensajes descriptivos:
   - Errores de validación (400)
   - Errores de servidor (500)

4. **Respuestas**: Todas las respuestas siguen el formato estándar con `success`, `data`, `error` y `details` opcional.

5. **Campos Opcionales**:
   - `id` es opcional en creación (se genera automáticamente)

---

## 📋 Tipos de Datos

### EspacioTrabajoData (Para creación)
```typescript
interface EspacioTrabajoData {
  id?: number;                    // Opcional, se genera automáticamente
  nombre: string;                 // Requerido
  creado_por: number;            // Requerido
}
```

### EspacioTrabajoResponse (Respuesta de la API)
```typescript
interface EspacioTrabajoResponse {
  id: number;                     // Siempre presente
  nombre: string;
  creado_por: number;
  creado_en: string;              // Siempre presente
  actualizado_en: string;         // Siempre presente
}
```

### ApiResponse
```typescript
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}
```

---

## 🚀 Uso en el Frontend

```typescript
// Tipos de datos (importar desde el dominio)
import { EspacioTrabajoData, EspacioTrabajoResponse } from './domain/espacio_trabajo';

// Crear espacio de trabajo
const createEspacioTrabajo = async (espacioData: EspacioTrabajoData) => {
  const response = await fetch('/api/espacio_trabajos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(espacioData),
  });
  
  return await response.json();
};

// Obtener todos los espacios de trabajo
const getEspaciosTrabajo = async (): Promise<EspacioTrabajoResponse[]> => {
  const response = await fetch('/api/espacio_trabajos');
  const result = await response.json();
  return result.data || [];
};

// Obtener espacio de trabajo por ID
const getEspacioTrabajoById = async (id: number): Promise<EspacioTrabajoResponse | null> => {
  const response = await fetch(`/api/espacio_trabajos/${id}`);
  const result = await response.json();
  return result.data;
};

// Actualizar espacio de trabajo
const updateEspacioTrabajo = async (id: number, espacioData: Partial<EspacioTrabajoData>) => {
  const response = await fetch(`/api/espacio_trabajos/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(espacioData),
  });
  
  return await response.json();
};

// Eliminar espacio de trabajo
const deleteEspacioTrabajo = async (id: number) => {
  const response = await fetch(`/api/espacio_trabajos/${id}`, {
    method: 'DELETE',
  });
  
  return await response.json();
};
```

---

## ⚠️ Errores Comunes

### 400 Bad Request
- **ID inválido**: `"ID de espacio de trabajo inválido"` - El ID debe ser un número válido
- **Datos faltantes**: `"Datos de espacio de trabajo inválidos"` - Faltan campos requeridos

### 500 Internal Server Error
- **Error de conexión**: `"Error de conexión al [operación]"` - Problemas de conectividad con Supabase
- **Error del servidor**: `"Error del servidor: [código] [mensaje]"` - Error específico de Supabase

---

*Documentación actualizada - Última actualización: Diciembre 2024*