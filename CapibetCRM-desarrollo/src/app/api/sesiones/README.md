# API de Sesiones - Documentación

Esta API proporciona endpoints para la gestión completa de sesiones en el sistema CRM. Todos los endpoints están implementados siguiendo el patrón DDD (Domain-Driven Design) y se conectan directamente con Supabase.

## 📁 Estructura del Proyecto

```
src/app/api/sesiones/
├── domain/
│   └── sesion.ts          # Interfaces y tipos del dominio
├── [id]/
│   └── route.ts           # GET, PATCH, DELETE por ID
├── utils/
│   ├── getHeaders.ts      # Utilidades para headers
│   ├── handleResponse.ts  # Manejo de respuestas
│   └── index.ts          # Exportaciones
├── route.ts               # GET todos, POST crear
└── README.md              # Esta documentación
```

## 🔗 Endpoints Disponibles

### 1. **POST** `/api/sesiones` - Crear Sesión

Crea una nueva sesión en el sistema.

**Request Body:**
```json
{
  "canal_id": 1,
  "usuario_id": 1,
  "nombre": "Sesión WhatsApp Principal",
  "api_key": "api_key_123",
  "access_token": "access_token_456",
  "phone_number": "+1234567890",
  "email_user": "usuario@ejemplo.com",
  "email_password": "password123",
  "smtp_host": "smtp.gmail.com",
  "smtp_port": 587,
  "imap_host": "imap.gmail.com",
  "imap_port": 993,
  "estado": "Activo",
  "creado_por": 1
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "canal_id": 1,
    "usuario_id": 1,
    "nombre": "Sesión WhatsApp Principal",
    "api_key": "api_key_123",
    "access_token": "access_token_456",
    "phone_number": "+1234567890",
    "email_user": "usuario@ejemplo.com",
    "email_password": "password123",
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "imap_host": "imap.gmail.com",
    "imap_port": 993,
    "estado": "Activo",
    "creado_en": "2024-01-15T10:30:00Z",
    "actualizado_en": "2024-01-15T10:30:00Z",
    "creado_por": 1
  }
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "Error del servidor: 400 Bad Request",
  "details": "Datos de sesión inválidos"
}
```

---

### 2. **GET** `/api/sesiones` - Obtener Todas las Sesiones

Retorna una lista de todas las sesiones registradas.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "canal_id": 1,
      "usuario_id": 1,
      "nombre": "Sesión WhatsApp Principal",
      "api_key": "api_key_123",
      "access_token": "access_token_456",
      "phone_number": "+1234567890",
      "email_user": "usuario@ejemplo.com",
      "email_password": "password123",
      "smtp_host": "smtp.gmail.com",
      "smtp_port": 587,
      "imap_host": "imap.gmail.com",
      "imap_port": 993,
      "estado": "Activo",
      "creado_en": "2024-01-15T10:30:00Z",
      "actualizado_en": "2024-01-15T10:30:00Z",
      "creado_por": 1
    }
  ]
}
```

---

### 3. **GET** `/api/sesiones/[id]` - Obtener Sesión por ID

Retorna los datos de una sesión específica.

**Parámetros:**
- `id` (number): ID de la sesión

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "canal_id": 1,
    "usuario_id": 1,
    "nombre": "Sesión WhatsApp Principal",
    "api_key": "api_key_123",
    "access_token": "access_token_456",
    "phone_number": "+1234567890",
    "email_user": "usuario@ejemplo.com",
    "email_password": "password123",
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "imap_host": "imap.gmail.com",
    "imap_port": 993,
    "estado": "Activo",
    "creado_en": "2024-01-15T10:30:00Z",
    "actualizado_en": "2024-01-15T10:30:00Z",
    "creado_por": 1
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

### 4. **PATCH** `/api/sesiones/[id]` - Actualizar Sesión

Actualiza los datos de una sesión existente.

**Parámetros:**
- `id` (number): ID de la sesión

**Request Body:**
```json
{
  "nombre": "Sesión WhatsApp Actualizada",
  "estado": "Inactivo",
  "phone_number": "+0987654321"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "canal_id": 1,
    "usuario_id": 1,
    "nombre": "Sesión WhatsApp Actualizada",
    "api_key": "api_key_123",
    "access_token": "access_token_456",
    "phone_number": "+0987654321",
    "email_user": "usuario@ejemplo.com",
    "email_password": "password123",
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "imap_host": "imap.gmail.com",
    "imap_port": 993,
    "estado": "Inactivo",
    "creado_en": "2024-01-15T10:30:00Z",
    "actualizado_en": "2024-01-15T11:45:00Z",
    "creado_por": 1
  }
}
```

---

### 5. **DELETE** `/api/sesiones/[id]` - Eliminar Sesión con Eliminación en Cascada

Elimina una sesión del sistema junto con todos sus chats, mensajes y sesiones de WhatsApp asociadas. El proceso de eliminación sigue el siguiente orden:

1. **Obtiene la sesión** para verificar su tipo y datos asociados
2. **Elimina todos los mensajes** de todos los chats de la sesión
3. **Elimina todos los chats** de la sesión
4. **Si es whatsapp_qr**: Elimina la `whatsapp_session` asociada
5. **Elimina la sesión** final

**Parámetros:**
- `id` (number): ID de la sesión

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Sesión 47 eliminada exitosamente",
    "deletedChats": 3,
    "deletedMessages": "Todos los mensajes de los chats fueron eliminados",
    "deletedWhatsAppSession": true,
    "sessionType": "whatsapp_qr"
  }
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "ID de sesión inválido"
}
```

**Response (500):**
```json
{
  "success": false,
  "error": "Error al eliminar sesión"
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
   - Los campos requeridos se validan en cada endpoint
   - `canal_id`, `usuario_id` y `nombre` son obligatorios
   - Los puertos SMTP e IMAP deben ser números válidos
   - El estado debe ser 'Activo' o 'Inactivo'

3. **Manejo de Errores**: Todos los endpoints incluyen manejo consistente de errores con mensajes descriptivos:
   - Errores de validación (400)
   - Errores de servidor (500)

4. **Respuestas**: Todas las respuestas siguen el formato estándar con `success`, `data`, `error` y `details` opcional.

5. **Seguridad**: Los campos sensibles como `api_key`, `access_token`, `email_password` deben manejarse con cuidado en producción.

6. **Eliminación en Cascada**: El endpoint DELETE implementa eliminación en cascada:
   - **Paso 1**: Obtiene la sesión para verificar su tipo y datos asociados
   - **Paso 2**: Elimina todos los mensajes de todos los chats de la sesión
   - **Paso 3**: Elimina todos los chats de la sesión
   - **Paso 4**: Si es `whatsapp_qr`, elimina la `whatsapp_session` asociada
   - **Paso 5**: Elimina la sesión final
   - Si falla la eliminación de mensajes o whatsapp_session, se registra un warning pero continúa con la eliminación
   - La respuesta incluye información detallada sobre qué fue eliminado

7. **Eliminación de WhatsApp Sessions**: Para sesiones de tipo `whatsapp_qr`:
   - Se verifica automáticamente si la sesión tiene una `whatsapp_session` asociada
   - Si existe, se elimina la `whatsapp_session` antes de eliminar la sesión principal
   - La respuesta incluye `deletedWhatsAppSession: true/false` para confirmar la eliminación
   - Si falla la eliminación de la `whatsapp_session`, se registra un warning pero continúa con la eliminación de la sesión

8. **Campos Opcionales**:
   - `api_key`, `access_token`, `phone_number`, `email_user`, `email_password`, `smtp_host`, `smtp_port`, `imap_host`, `imap_port` son opcionales
   - `estado` tiene valor por defecto 'Activo'
   - `id` es opcional en creación (se genera automáticamente)

---

## 📋 Tipos de Datos

### SesionData (Para creación)
```typescript
interface SesionData {
  id?: number;                    // Opcional, se genera automáticamente
  canal_id: number;               // Requerido
  usuario_id: number;             // Requerido
  nombre: string;                 // Requerido
  api_key?: string;               // Opcional
  access_token?: string;          // Opcional
  phone_number?: string;          // Opcional
  email_user?: string;            // Opcional
  email_password?: string;        // Opcional
  smtp_host?: string;             // Opcional
  smtp_port?: number;             // Opcional
  imap_host?: string;             // Opcional
  imap_port?: number;             // Opcional
  estado?: string;                // Opcional, default: 'Activo'
  creado_por?: number;            // Opcional
}
```

### SesionResponse (Respuesta de la API)
```typescript
interface SesionResponse {
  id: number;                     // Siempre presente
  canal_id: number;
  usuario_id: number;
  nombre: string;
  api_key: string;                // Siempre presente
  access_token: string;           // Siempre presente
  phone_number: string;           // Siempre presente
  email_user: string;             // Siempre presente
  email_password: string;         // Siempre presente
  smtp_host: string;              // Siempre presente
  smtp_port: number;              // Siempre presente
  imap_host: string;              // Siempre presente
  imap_port: number;              // Siempre presente
  estado: string;                 // Siempre presente
  creado_en: string;              // Siempre presente
  actualizado_en: string;         // Siempre presente
  creado_por: number;             // Siempre presente
}
```

---

## 🚀 Uso en el Frontend

```typescript
// Tipos de datos (importar desde el dominio)
import { SesionData, SesionResponse } from './domain/sesion';

// Crear sesión
const createSesion = async (sesionData: SesionData) => {
  const response = await fetch('/api/sesiones', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sesionData),
  });
  
  return await response.json();
};

// Obtener todas las sesiones
const getSesiones = async (): Promise<SesionResponse[]> => {
  const response = await fetch('/api/sesiones');
  const result = await response.json();
  return result.data || [];
};

// Obtener sesión por ID
const getSesionById = async (id: number): Promise<SesionResponse | null> => {
  const response = await fetch(`/api/sesiones/${id}`);
  const result = await response.json();
  return result.data;
};

// Actualizar sesión
const updateSesion = async (id: number, sesionData: Partial<SesionData>) => {
  const response = await fetch(`/api/sesiones/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sesionData),
  });
  
  return await response.json();
};

// Eliminar sesión
const deleteSesion = async (id: number) => {
  const response = await fetch(`/api/sesiones/${id}`, {
    method: 'DELETE',
  });
  
  return await response.json();
};
```

---

## ⚠️ Errores Comunes

### 400 Bad Request
- **ID inválido**: `"ID de sesión inválido"` - El ID debe ser un número válido
- **Datos faltantes**: `"canal_id, usuario_id y nombre son requeridos"` - Faltan campos obligatorios
- **Puerto inválido**: `"smtp_port debe ser un número válido"` - El puerto SMTP debe ser un número
- **Estado inválido**: `"estado debe ser 'Activo' o 'Inactivo'"` - El estado no es válido

### 500 Internal Server Error
- **Error de conexión**: `"Error de conexión al [operación]"` - Problemas de conectividad con Supabase
- **Error del servidor**: `"Error del servidor: [código] [mensaje]"` - Error específico de Supabase

---

*Documentación actualizada - Última actualización: Diciembre 2024*