# API de Tareas - Documentación

Esta API proporciona endpoints para la gestión completa de tareas en el sistema CRM. Todos los endpoints están implementados siguiendo el patrón DDD (Domain-Driven Design) y se conectan directamente con Supabase.

## 📁 Estructura del Proyecto

```
src/app/api/tareas/
├── domain/
│   └── tarea.ts              # Interfaces y tipos del dominio
├── [id]/
│   └── route.ts              # GET, PATCH, DELETE por ID
├── route.ts                  # GET todas, POST crear
├── utils/
│   ├── handleResponse.ts     # Manejo de respuestas
│   └── index.ts             # Exportaciones
└── README.md                 # Esta documentación
```

## 🔗 Endpoints Disponibles

### 1. **POST** `/api/tareas` - Crear Tarea

Crea una nueva tarea en el sistema.

**Request Body:**
```json
{
  "titulo": "Implementar nueva funcionalidad",
  "descripcion": "Desarrollar la nueva característica solicitada por el cliente",
  "prioridad": "alta",
  "categoria": "desarrollo",
  "fecha": "2024-02-15",
  "creado_por": "550e8400-e29b-41d4-a716-446655440000",
  "asignado": "550e8400-e29b-41d4-a716-446655440001",
  "organizacion_id": "550e8400-e29b-41d4-a716-446655440002"
}
```

**Campos:**
- `titulo` (string, requerido): Título de la tarea
- `descripcion` (string, opcional): Descripción detallada de la tarea
- `prioridad` (string, opcional): Prioridad de la tarea ('alta', 'media', 'baja')
- `categoria` (string, opcional): Categoría de la tarea
- `fecha` (string, opcional): Fecha de vencimiento (formato YYYY-MM-DD)
- `creado_por` (string UUID, opcional): ID del usuario que crea la tarea
- `asignado` (string UUID, opcional): ID del usuario asignado a la tarea
- `organizacion_id` (string UUID, opcional): ID de la organización

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "titulo": "Implementar nueva funcionalidad",
    "descripcion": "Desarrollar la nueva característica solicitada por el cliente",
    "prioridad": "alta",
    "categoria": "desarrollo",
    "fecha": "2024-02-15",
    "creado_por": "550e8400-e29b-41d4-a716-446655440000",
    "asignado": "550e8400-e29b-41d4-a716-446655440001",
    "organizacion_id": "550e8400-e29b-41d4-a716-446655440002",
    "creado_en": "2024-01-15T10:30:00Z",
    "actualizado_en": "2024-01-15T10:30:00Z"
  }
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "El campo titulo es requerido"
}
```

---

### 2. **GET** `/api/tareas` - Obtener Todas las Tareas

Retorna una lista de todas las tareas registradas.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "titulo": "Implementar nueva funcionalidad",
      "descripcion": "Desarrollar la nueva característica solicitada por el cliente",
      "prioridad": "alta",
      "categoria": "desarrollo",
      "fecha": "2024-02-15",
      "creado_por": "550e8400-e29b-41d4-a716-446655440000",
      "asignado": "550e8400-e29b-41d4-a716-446655440001",
      "organizacion_id": "550e8400-e29b-41d4-a716-446655440002",
      "creado_en": "2024-01-15T10:30:00Z",
      "actualizado_en": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### 3. **GET** `/api/tareas/[id]` - Obtener Tarea por ID

Retorna los datos de una tarea específica.

**Parámetros:**
- `id` (string UUID): ID de la tarea

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "titulo": "Implementar nueva funcionalidad",
    "descripcion": "Desarrollar la nueva característica solicitada por el cliente",
    "prioridad": "alta",
    "categoria": "desarrollo",
    "fecha": "2024-02-15",
    "creado_por": "550e8400-e29b-41d4-a716-446655440000",
    "asignado": "550e8400-e29b-41d4-a716-446655440001",
    "organizacion_id": "550e8400-e29b-41d4-a716-446655440002",
    "creado_en": "2024-01-15T10:30:00Z",
    "actualizado_en": "2024-01-15T10:30:00Z"
  }
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "ID de tarea inválido (debe ser un UUID)"
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

### 4. **PATCH** `/api/tareas/[id]` - Actualizar Tarea

Actualiza los datos de una tarea existente.

**Parámetros:**
- `id` (string UUID): ID de la tarea

**Request Body:**
```json
{
  "titulo": "Implementar nueva funcionalidad - Actualizada",
  "descripcion": "Descripción actualizada de la tarea",
  "prioridad": "media",
  "categoria": "marketing",
  "fecha": "2024-02-20",
  "asignado": "550e8400-e29b-41d4-a716-446655440003"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "titulo": "Implementar nueva funcionalidad - Actualizada",
    "descripcion": "Descripción actualizada de la tarea",
    "prioridad": "media",
    "categoria": "marketing",
    "fecha": "2024-02-20",
    "creado_por": "550e8400-e29b-41d4-a716-446655440000",
    "asignado": "550e8400-e29b-41d4-a716-446655440003",
    "organizacion_id": "550e8400-e29b-41d4-a716-446655440002",
    "creado_en": "2024-01-15T10:30:00Z",
    "actualizado_en": "2024-01-15T11:45:00Z"
  }
}
```

---

### 5. **DELETE** `/api/tareas/[id]` - Eliminar Tarea

Elimina una tarea del sistema.

**Parámetros:**
- `id` (string UUID): ID de la tarea

**Response (200):**
```json
{
  "success": true,
  "data": undefined
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "ID de tarea inválido (debe ser un UUID)"
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
   - Los IDs deben ser UUIDs válidos (formato: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
   - El campo `titulo` es requerido al crear una tarea
   - Los campos `descripcion`, `prioridad`, `categoria`, `fecha`, `creado_por`, `asignado` y `organizacion_id` son opcionales
   - Las fechas `creado_en` y `actualizado_en` se manejan automáticamente

3. **Manejo de Errores**: Todos los endpoints incluyen manejo consistente de errores con mensajes descriptivos:
   - Errores de validación (400)
   - Errores de servidor (500)

4. **Respuestas**: Todas las respuestas siguen el formato estándar con `success`, `data`, `error` y `details` opcional.

5. **UUIDs**: El sistema utiliza UUIDs para mayor seguridad y escalabilidad.

6. **Campos Opcionales**:
   - `descripcion` puede ser `null`
   - `prioridad` puede ser `null`
   - `categoria` puede ser `null`
   - `fecha` puede ser `null`
   - `creado_por` es opcional
   - `asignado` es opcional
   - `organizacion_id` es opcional
   - `creado_en` y `actualizado_en` se generan automáticamente

---

## 📋 Tipos de Datos

### TareaData (Para creación)
```typescript
interface TareaData {
  id?: string;                    // UUID, opcional (se genera automáticamente)
  titulo: string;                 // Requerido
  descripcion?: string;           // Opcional
  prioridad?: string;             // Opcional
  categoria?: string;             // Opcional
  fecha?: string;                 // Opcional (formato YYYY-MM-DD)
  creado_por?: string;            // UUID, opcional
  asignado?: string;              // UUID, opcional
  organizacion_id?: string;       // UUID, opcional
  creado_en?: string;             // Timestamp, se genera automáticamente
  actualizado_en?: string;        // Timestamp, se actualiza automáticamente
}
```

### TareaResponse (Respuesta de la API)
```typescript
interface TareaResponse {
  id: string;                     // UUID
  titulo: string;
  descripcion?: string;
  prioridad?: string;
  categoria?: string;
  fecha?: string;
  creado_por?: string;
  asignado?: string;
  organizacion_id?: string;
  creado_en?: string;             // Timestamp ISO 8601
  actualizado_en?: string;        // Timestamp ISO 8601
}
```

---

## 🚀 Uso en el Frontend

```typescript
// Tipos de datos (importar desde el dominio)
import { TareaData, TareaResponse } from './domain/tarea';

// Crear tarea
const createTask = async (tareaData: TareaData) => {
  const response = await fetch('/api/tareas', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tareaData),
  });
  
  return await response.json();
};

// Obtener todas las tareas
const getTasks = async (): Promise<TareaResponse[]> => {
  const response = await fetch('/api/tareas');
  const result = await response.json();
  return result.data || [];
};

// Obtener tarea por ID
const getTaskById = async (id: string): Promise<TareaResponse | null> => {
  const response = await fetch(`/api/tareas/${id}`);
  const result = await response.json();
  return result.data;
};

// Actualizar tarea
const updateTask = async (id: string, tareaData: Partial<TareaData>) => {
  const response = await fetch(`/api/tareas/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tareaData),
  });
  
  return await response.json();
};

// Eliminar tarea
const deleteTask = async (id: string) => {
  const response = await fetch(`/api/tareas/${id}`, {
    method: 'DELETE',
  });
  
  return await response.json();
};
```

---

## ⚠️ Errores Comunes

### 400 Bad Request
- **ID inválido**: `"ID de tarea inválido (debe ser un UUID)"` - El ID debe ser un UUID válido
- **Campo faltante**: `"El campo titulo es requerido"` - El título es obligatorio

### 500 Internal Server Error
- **Error de conexión**: `"Error de conexión al [operación]"` - Problemas de conectividad con Supabase
- **Error del servidor**: `"Error del servidor: [código] [mensaje]"` - Error específico de Supabase

---

## 📌 Validación de UUID

El formato válido de UUID es:
```
xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Ejemplo válido: `123e4567-e89b-12d3-a456-426614174000`

---

## 📌 Valores Sugeridos para Campos

### Prioridad
- `"alta"` - Tarea urgente que requiere atención inmediata
- `"media"` - Tarea normal con plazo estándar
- `"baja"` - Tarea que puede esperar o es de menor importancia

### Categoría
- `"desarrollo"` - Tareas relacionadas con programación
- `"marketing"` - Tareas de marketing y promoción
- `"ventas"` - Tareas del área de ventas
- `"soporte"` - Tareas de atención al cliente
- `"administracion"` - Tareas administrativas

---

*Documentación actualizada - Última actualización: Enero 2025*
