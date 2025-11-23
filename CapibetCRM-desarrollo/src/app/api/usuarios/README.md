# API de Usuarios - Documentación

Esta API proporciona endpoints para la gestión completa de usuarios en el sistema CRM. Todos los endpoints están implementados siguiendo el patrón DDD (Domain-Driven Design) y se conectan directamente con Supabase.

## 📁 Estructura del Proyecto

```
src/app/api/usuarios/
├── domain/
│   └── usuario.ts          # Interfaces y tipos del dominio
├── [id]/
│   └── route.ts            # GET, PATCH, DELETE por ID
├── login/
│   └── route.ts            # POST para autenticación
├── route.ts                # GET todos, POST crear
├── utils/
│   ├── getHeaders.ts       # Utilidades para headers
│   ├── handleResponse.ts   # Manejo de respuestas
│   └── index.ts           # Exportaciones
└── README.md               # Esta documentación
```

## 🔗 Endpoints Disponibles

### 1. **POST** `/api/usuarios` - Crear Usuario

Crea un nuevo usuario en el sistema.

**Request Body:**
```json
{
  "nombre": "Mi Empresa S.A.",
  "website": "https://miempresa.com",
  "logo": "https://example.com/logo.png",
  "propietario_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Campos:**
- `nombre` (string, requerido): Nombre del usuario/empresa
- `website` (string, opcional): URL del sitio web
- `logo` (string, opcional): URL del logo
- `propietario_id` (string UUID, opcional): ID del propietario

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "nombre": "Mi Empresa S.A.",
    "website": "https://miempresa.com",
    "logo": "https://example.com/logo.png",
    "propietario_id": "550e8400-e29b-41d4-a716-446655440000",
    "creado_en": "2024-01-15T10:30:00Z",
    "actualizado_en": "2024-01-15T10:30:00Z"
  }
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "El campo nombre es requerido"
}
```

---

### 2. **GET** `/api/usuarios` - Obtener Todos los Usuarios

Retorna una lista de todos los usuarios registrados.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "nombre": "Mi Empresa S.A.",
      "website": "https://miempresa.com",
      "logo": "https://example.com/logo.png",
      "propietario_id": "550e8400-e29b-41d4-a716-446655440000",
      "creado_en": "2024-01-15T10:30:00Z",
      "actualizado_en": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### 3. **GET** `/api/usuarios/[id]` - Obtener Usuario por ID

Retorna los datos de un usuario específico.

**Parámetros:**
- `id` (string UUID): ID del usuario

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "nombre": "Mi Empresa S.A.",
    "website": "https://miempresa.com",
    "logo": "https://example.com/logo.png",
    "propietario_id": "550e8400-e29b-41d4-a716-446655440000",
    "creado_en": "2024-01-15T10:30:00Z",
    "actualizado_en": "2024-01-15T10:30:00Z"
  }
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "ID de usuario inválido (debe ser un UUID)"
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

### 4. **PATCH** `/api/usuarios/[id]` - Actualizar Usuario

Actualiza los datos de un usuario existente.

**Parámetros:**
- `id` (string UUID): ID del usuario

**Request Body:**
```json
{
  "nombre": "Mi Empresa S.A. Actualizada",
  "website": "https://miempresanueva.com",
  "logo": "https://example.com/new-logo.png"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "nombre": "Mi Empresa S.A. Actualizada",
    "website": "https://miempresanueva.com",
    "logo": "https://example.com/new-logo.png",
    "propietario_id": "550e8400-e29b-41d4-a716-446655440000",
    "creado_en": "2024-01-15T10:30:00Z",
    "actualizado_en": "2024-01-15T11:45:00Z"
  }
}
```

---

### 5. **DELETE** `/api/usuarios/[id]` - Eliminar Usuario

Elimina un usuario del sistema.

**Parámetros:**
- `id` (string UUID): ID del usuario

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
  "error": "ID de usuario inválido (debe ser un UUID)"
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
   - El campo `nombre` es requerido al crear un usuario
   - Los campos `website` y `logo` son opcionales
   - Las fechas `creado_en` y `actualizado_en` se manejan automáticamente

3. **Manejo de Errores**: Todos los endpoints incluyen manejo consistente de errores con mensajes descriptivos:
   - Errores de validación (400)
   - Errores de servidor (500)

4. **Respuestas**: Todas las respuestas siguen el formato estándar con `success`, `data`, `error` y `details` opcional.

5. **UUIDs**: El sistema ahora utiliza UUIDs en lugar de IDs numéricos para mayor seguridad y escalabilidad.

6. **Campos Opcionales**:
   - `website` puede ser `null`
   - `logo` puede ser `null`
   - `propietario_id` es opcional
   - `creado_en` y `actualizado_en` se generan automáticamente

---

## 📋 Tipos de Datos

### UsuarioData (Para creación)
```typescript
interface UsuarioData {
  id?: string;                    // UUID, opcional (se genera automáticamente)
  nombre: string;                 // Requerido
  website?: string | null;        // Opcional
  logo?: string | null;           // Opcional
  propietario_id?: string;        // UUID, opcional
  creado_en?: string;             // Timestamp, se genera automáticamente
  actualizado_en?: string;        // Timestamp, se actualiza automáticamente
}
```

### UsuarioResponse (Respuesta de la API)
```typescript
interface UsuarioResponse {
  id: string;                     // UUID
  nombre: string;
  website: string | null;
  logo: string | null;
  propietario_id: string;         // UUID
  creado_en: string;              // Timestamp ISO 8601
  actualizado_en: string;         // Timestamp ISO 8601
}
```

---

## 🚀 Uso en el Frontend

```typescript
// Tipos de datos (importar desde el dominio)
import { UsuarioData, UsuarioResponse } from './domain/usuario';

// Crear usuario
const createUser = async (userData: UsuarioData) => {
  const response = await fetch('/api/usuarios', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  
  return await response.json();
};

// Obtener todos los usuarios
const getUsers = async (): Promise<UsuarioResponse[]> => {
  const response = await fetch('/api/usuarios');
  const result = await response.json();
  return result.data || [];
};

// Obtener usuario por ID
const getUserById = async (id: string): Promise<UsuarioResponse | null> => {
  const response = await fetch(`/api/usuarios/${id}`);
  const result = await response.json();
  return result.data;
};

// Actualizar usuario
const updateUser = async (id: string, userData: Partial<UsuarioData>) => {
  const response = await fetch(`/api/usuarios/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  
  return await response.json();
};

// Eliminar usuario
const deleteUser = async (id: string) => {
  const response = await fetch(`/api/usuarios/${id}`, {
    method: 'DELETE',
  });
  
  return await response.json();
};
```

---

## ⚠️ Errores Comunes

### 400 Bad Request
- **ID inválido**: `"ID de usuario inválido (debe ser un UUID)"` - El ID debe ser un UUID válido
- **Campo faltante**: `"El campo nombre es requerido"` - El nombre es obligatorio

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

*Documentación actualizada - Última actualización: Septiembre 2024*