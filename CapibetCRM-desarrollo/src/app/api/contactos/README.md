# API de Contactos - Capibet CRM

Este documento describe las rutas de API disponibles para la gestión de contactos en el sistema Capibet CRM.

## Estructura de la API

```
src/app/api/contactos/
├── domain/
│   └── contacto.ts            # Interfaces y tipos de datos
├── utils/
│   ├── getHeaders.ts          # Utilidades para headers
│   ├── handleResponse.ts      # Manejo de respuestas
│   └── index.ts               # Exportaciones
├── importar/
│   └── route.ts               # POST /api/contactos/importar
├── exportar/
│   └── route.ts               # GET /api/contactos/exportar
└── route.ts                   # CRUD principal de contactos
```

## Endpoints Disponibles

### 1. Obtener Todos los Contactos

**GET** `/api/contactos`

Obtiene todos los contactos del sistema.

#### Ejemplo de Request:
```bash
GET /api/contactos
```

#### Ejemplo de Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombre": "Juan",
      "apellido": "Pérez",
      "nombre_completo": "Juan Pérez",
      "correo": "juan.perez@email.com",
      "telefono": "+1234567890",
      "empresa": "Empresa ABC",
      "cargo": "Gerente",
      "notas": "Cliente importante",
      "direccion": "Calle 123, Ciudad",
      "cumpleaños": "1990-05-15",
      "sitio_web": "https://empresa.com",
      "etiqueta": "VIP",
      "empresa_id": 1,
      "creado_por": 1,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 2. Crear Nuevo Contacto

**POST** `/api/contactos`

Crea un nuevo contacto en el sistema.

#### Ejemplo de Request:
```json
{
  "nombre": "María",
  "apellido": "García",
  "correo": "maria.garcia@email.com",
  "telefono": "+0987654321",
  "empresa": "Empresa XYZ",
  "cargo": "Directora",
  "notas": "Contacto de referencia",
  "direccion": "Avenida 456, Ciudad",
  "cumpleaños": "1985-12-20",
  "sitio_web": "https://empresaxyz.com",
  "etiqueta": "Cliente",
  "empresa_id": 2,
  "creado_por": 1
}
```

#### Ejemplo de Response:
```json
{
  "success": true,
  "data": {
    "id": 2,
    "nombre": "María",
    "apellido": "García",
    "nombre_completo": "María García",
    "correo": "maria.garcia@email.com",
    "telefono": "+0987654321",
    "empresa": "Empresa XYZ",
    "cargo": "Directora",
    "notas": "Contacto de referencia",
    "direccion": "Avenida 456, Ciudad",
    "cumpleaños": "1985-12-20",
    "sitio_web": "https://empresaxyz.com",
    "etiqueta": "Cliente",
    "empresa_id": 2,
    "creado_por": 1,
    "created_at": "2024-01-15T11:00:00Z",
    "updated_at": "2024-01-15T11:00:00Z"
  }
}
```

### 3. Actualizar Contacto

**PATCH** `/api/contactos`

Actualiza un contacto existente.

#### Ejemplo de Request:
```json
{
  "id": 2,
  "nombre": "María Elena",
  "cargo": "CEO",
  "notas": "Contacto actualizado - CEO de la empresa"
}
```

#### Ejemplo de Response:
```json
{
  "success": true,
  "data": {
    "id": 2,
    "nombre": "María Elena",
    "apellido": "García",
    "nombre_completo": "María Elena García",
    "correo": "maria.garcia@email.com",
    "telefono": "+0987654321",
    "empresa": "Empresa XYZ",
    "cargo": "CEO",
    "notas": "Contacto actualizado - CEO de la empresa",
    "direccion": "Avenida 456, Ciudad",
    "cumpleaños": "1985-12-20",
    "sitio_web": "https://empresaxyz.com",
    "etiqueta": "Cliente",
    "empresa_id": 2,
    "creado_por": 1,
    "created_at": "2024-01-15T11:00:00Z",
    "updated_at": "2024-01-15T11:30:00Z"
  }
}
```

### 4. Eliminar Contacto

**DELETE** `/api/contactos?id={id}`

Elimina un contacto del sistema.

#### Ejemplo de Request:
```bash
DELETE /api/contactos?id=2
```

#### Ejemplo de Response:
```json
{
  "success": true,
  "data": undefined
}
```

### 5. Importar Contactos desde CSV

**POST** `/api/contactos/importar`

Importa contactos desde un archivo CSV con formato Google Contacts.

#### Form Data:
- `file`: Archivo CSV (requerido)

#### Formato CSV Soportado:
El sistema acepta archivos CSV exportados desde Google Contacts con las siguientes columnas:
- Name (nombre completo)
- Given Name (nombre)
- Family Name (apellido)
- Birthday (cumpleaños)
- Notes (notas)
- E-mail 1 - Value (correo)
- Phone 1 - Value (teléfono)
- Address 1 - Formatted (dirección)
- Website 1 - Value (sitio web)

**Nota**: Los campos empresa, cargo y etiqueta se asignan con valores por defecto durante la importación.

#### Ejemplo de Response:
```json
{
  "message": "Importación completada: 25 exitosos, 2 fallidos",
  "errores": [
    "Lote 1: Error de validación en línea 15",
    "Lote 2: Email duplicado en línea 23"
  ]
}
```

### 6. Exportar Contactos a CSV

**GET** `/api/contactos/exportar`

Exporta todos los contactos a un archivo CSV.

#### Ejemplo de Request:
```bash
GET /api/contactos/exportar
```

#### Response:
Retorna un archivo CSV descargable con todos los contactos en formato completo.

**Formato de Exportación:**
- Incluye todas las columnas: ID, Nombre, Apellido, Nombre Completo, Correo, Teléfono, Empresa, Empresa ID, Cargo, Etiqueta, Notas, Dirección, Cumpleaños, Sitio Web, Creado Por, Creado En, Actualizado En
- Archivo: `contactos_YYYY-MM-DD.csv`

1. **Base de Datos**: Todas las operaciones se realizan directamente contra Supabase usando la REST API.

2. **Validación**: Los contactos requieren al menos nombre, correo electrónico y teléfono para ser creados en nuestra base de datos.

4. **Exportación**: Se generan archivos CSV con formato Google Calendar.