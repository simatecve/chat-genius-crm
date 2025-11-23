# WhatsApp Orchestrator - Flujo Simplificado

Backend orquestador para gestionar múltiples cuentas de WhatsApp usando Baileys.js con un **flujo simplificado basado en QR**. Este proyecto está diseñado para ser consumido por un backend principal que gestiona la información de las sesiones a través de una base de datos PostgreSQL.

## 🎯 Nuevo Flujo Simplificado

### Cómo Funciona Ahora

1. **Frontend solicita QR** → `GET /generate-qr`
2. **Orquestador genera QR** automáticamente con sessionId único
3. **Usuario escanea QR** con WhatsApp
4. **Al conectarse exitosamente**, el orquestador notifica **automáticamente** al backend con **todos los datos necesarios**
5. **Backend recibe datos completos** y los almacena en `whatsapp_sessions`

### ✅ Ventajas del Nuevo Flujo

- **Más Simple**: Solo un endpoint principal `/generate-qr`
- **Automático**: No necesitas gestionar sessionIds manualmente
- **Completo**: Recibes todos los datos listos para almacenar
- **Sin Legacy**: Código limpio sin endpoints obsoletos
- **Escalable**: IDs únicos generados automáticamente

## 🚀 Instalación y Configuración

### Requisitos
- Node.js 18+ 
- npm o pnpm
- Acceso a internet para conexión con WhatsApp

### Instalación
```bash
# Instalar dependencias
npm install
# o
pnpm install

# Iniciar servidor
npm start
```

El servidor se ejecutará en `http://localhost:3000`

## 📡 API REST - Documentación

### 🎯 **Endpoint Principal**

#### Generar QR para Nueva Cuenta
```http
GET /generate-qr
```

**Respuesta:**
```json
{
  "success": true,
  "sessionId": "session_1705312200123_abc123def",
  "qr": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "qrText": "2@ABC123...",
  "message": "QR generado. Escanea con WhatsApp para conectar."
}
```

**Uso:**
```javascript
// Desde tu frontend
const response = await fetch('http://localhost:3000/generate-qr');
const data = await response.json();

if (data.success) {
    // Mostrar QR al usuario
    document.getElementById('qr-image').src = data.qr;
    
    // Guardar sessionId para referencia
    localStorage.setItem('sessionId', data.sessionId);
}
```

### 📊 **Gestión de Sesiones**

#### Listar Todas las Sesiones
```http
GET /sessions
```

#### Obtener Estado de Sesión Específica
```http
GET /sessions/:sessionId
```

#### Enviar Mensaje desde Sesión
```http
POST /sessions/:sessionId/send-message
Content-Type: application/json

{
  "number": "5491234567890",
  "message": "Hola desde WhatsApp!"
}
```

#### Reiniciar Sesión
```http
POST /sessions/:sessionId/restart
```

#### Eliminar Sesión
```http
DELETE /sessions/:sessionId
```

### ⚙️ **Configuración y Monitoreo**

#### Health Check
```http
GET /health
```

#### Configurar Descarga Automática
```http
POST /config/download-media
Content-Type: application/json

{
  "enabled": true
}
```

## 🔔 Sistema de Notificaciones Automáticas

El orquestador notifica automáticamente a tu backend cuando ocurren eventos importantes:

### 🆕 **Nueva Sesión Conectada** (Principal)

Cuando un usuario escanea el QR exitosamente, tu backend recibe **todos los datos** listos para almacenar:

```javascript
// Endpoint en tu backend: POST /api/whatsapp/sessions/new-session-connected
{
  "session_id": "session_1705312200123_abc123def",
  "phone_number": "5491234567890",
  "status": "connected",
  "last_seen": "2024-01-15T10:30:00.000Z",
  "auth_folder_path": "./auth_sessions/session_1705312200123_abc123def",
  "server_port": null,
  "whatsapp_user_id": "5491234567890:1@s.whatsapp.net",
  "created_at": "2024-01-15T10:30:00.000Z",
  "updated_at": "2024-01-15T10:30:00.000Z"
}
```

### 📱 **Cambios de Estado de Sesión**

```javascript
// Endpoint en tu backend: POST /api/whatsapp/sessions/status-update
{
  "session_id": "session_1705312200123_abc123def",
  "status": "disconnected",  // 'connected', 'disconnected', 'connecting', 'error'
  "error_message": null,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "last_seen": "2024-01-15T10:30:00.000Z"
}
```

### 💬 **Mensajes Recibidos**

```javascript
// Endpoint en tu backend: POST /api/whatsapp/messages/received
{
  "session_id": "session_1705312200123_abc123def",
  "sender_name": "Juan Pérez",
  "sender_number": "5490987654321",
  "message_content": "Hola, ¿cómo estás?",
  "message_type": "text",
  "media_info": {},
  "received_at": "2024-01-15T10:30:00.000Z",
  "phone_number_session": "5491234567890"
}
```

### 🔄 **QR Actualizado**

```javascript
// Endpoint en tu backend: POST /api/whatsapp/sessions/qr-update
{
  "session_id": "session_1705312200123_abc123def",
  "qr_data": "2@ABC123...",
  "generated_at": "2024-01-15T10:30:00.000Z"
}
```

## 🗂️ Integración con tu Backend Principal

### Tabla PostgreSQL

Tu tabla `whatsapp_sessions` recibe directamente los datos del callback:

```sql
CREATE TYPE whatsapp_session_status AS ENUM ('connected','disconnected','connecting','error');

CREATE TABLE whatsapp_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id text UNIQUE NOT NULL,           -- Del callback: session_id
    phone_number text UNIQUE NOT NULL,         -- Del callback: phone_number  
    status whatsapp_session_status DEFAULT 'disconnected',  -- Del callback: status
    last_seen timestamp with time zone,       -- Del callback: last_seen
    auth_folder_path text NOT NULL,           -- Del callback: auth_folder_path
    server_port integer,                      -- Del callback: server_port
    whatsapp_user_id text,                    -- Del callback: whatsapp_user_id
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
```

### Implementar Endpoints en tu Backend

```javascript
// En tu backend principal (Express.js ejemplo)

// 1. PRINCIPAL: Nueva sesión conectada
app.post('/api/whatsapp/sessions/new-session-connected', async (req, res) => {
  const { 
    session_id, phone_number, status, last_seen, 
    auth_folder_path, server_port, whatsapp_user_id,
    created_at, updated_at 
  } = req.body;
  
  try {
    // Insertar nuevo registro completo
    const result = await db.query(`
      INSERT INTO whatsapp_sessions (
        session_id, phone_number, status, last_seen,
        auth_folder_path, server_port, whatsapp_user_id,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      session_id, phone_number, status, last_seen,
      auth_folder_path, server_port, whatsapp_user_id,
      created_at, updated_at
    ]);
    
    console.log('Nueva sesión WhatsApp registrada:', result.rows[0]);
    
    // Notificar a tu aplicación que hay una nueva cuenta conectada
    await notifyNewWhatsAppAccount(result.rows[0]);
    
    res.json({ success: true, session: result.rows[0] });
  } catch (error) {
    console.error('Error registrando nueva sesión:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Actualizar estado de sesión existente
app.post('/api/whatsapp/sessions/status-update', async (req, res) => {
  const { session_id, status, error_message, timestamp, last_seen } = req.body;
  
  try {
    await db.query(`
      UPDATE whatsapp_sessions 
      SET status = $1, last_seen = $2, updated_at = NOW()
      WHERE session_id = $3
    `, [status, last_seen, session_id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error actualizando estado:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Procesar mensajes recibidos
app.post('/api/whatsapp/messages/received', async (req, res) => {
  const { 
    session_id, sender_name, sender_number, 
    message_content, message_type, received_at 
  } = req.body;
  
  try {
    // Guardar mensaje en tu tabla de mensajes
    await db.query(`
      INSERT INTO whatsapp_messages (
        session_id, sender_name, sender_number, 
        content, type, received_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [session_id, sender_name, sender_number, message_content, message_type, received_at]);
    
    // Procesar mensaje según tu lógica de negocio
    await processIncomingMessage(session_id, {
      from: sender_number,
      content: message_content,
      type: message_type
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error procesando mensaje:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. QR actualizado (opcional - para reconexiones)
app.post('/api/whatsapp/sessions/qr-update', async (req, res) => {
  const { session_id, qr_data, generated_at } = req.body;
  
  try {
    // Notificar al frontend que hay un nuevo QR disponible
    await notifyFrontendQRUpdate(session_id, qr_data);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error procesando QR:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## 💻 Ejemplos de Uso Completos

### Frontend - Conectar Nueva Cuenta

```html
<!DOCTYPE html>
<html>
<head>
    <title>Conectar WhatsApp</title>
</head>
<body>
    <div id="qr-container">
        <button onclick="generateQR()">Conectar Nueva Cuenta de WhatsApp</button>
        <div id="qr-display" style="display: none;">
            <h3>Escanea este QR con WhatsApp:</h3>
            <img id="qr-image" style="max-width: 300px;">
            <p id="session-info"></p>
        </div>
    </div>

    <script>
    async function generateQR() {
        try {
            const response = await fetch('http://localhost:3000/generate-qr');
            const data = await response.json();
            
            if (data.success) {
                // Mostrar QR
                document.getElementById('qr-image').src = data.qr;
                document.getElementById('session-info').textContent = 
                    `Session ID: ${data.sessionId}`;
                document.getElementById('qr-display').style.display = 'block';
                
                // Guardar sessionId para uso posterior
                localStorage.setItem('currentSessionId', data.sessionId);
                
                console.log('QR generado:', data);
            } else {
                alert('Error generando QR: ' + data.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error conectando con el servidor');
        }
    }
    </script>
</body>
</html>
```

### Backend - Clase Helper

```javascript
// WhatsAppService.js - Para usar en tu backend
class WhatsAppService {
  constructor(orchestratorUrl = 'http://localhost:3000') {
    this.baseUrl = orchestratorUrl;
  }

  // Generar QR para nueva cuenta
  async generateQR() {
    try {
      const response = await fetch(`${this.baseUrl}/generate-qr`);
      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          sessionId: result.sessionId,
          qr: result.qr,
          qrText: result.qrText
        };
      }
      
      throw new Error(result.message);
    } catch (error) {
      console.error('Error generando QR:', error);
      throw error;
    }
  }

  // Enviar mensaje desde sesión específica
  async sendMessage(sessionId, targetNumber, message) {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: targetNumber,
          message: message
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      throw error;
    }
  }

  // Obtener estado de sesión
  async getSessionStatus(sessionId) {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`);
      const result = await response.json();
      
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error obteniendo estado:', error);
      return null;
    }
  }

  // Listar todas las sesiones
  async getAllSessions() {
    try {
      const response = await fetch(`${this.baseUrl}/sessions`);
      const result = await response.json();
      
      return result.success ? result.data : [];
    } catch (error) {
      console.error('Error obteniendo sesiones:', error);
      return [];
    }
  }

  // Eliminar sesión
  async removeSession(sessionId) {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error eliminando sesión:', error);
      throw error;
    }
  }
}

// Uso en tu backend
const whatsappService = new WhatsAppService();

// Generar QR para frontend
app.get('/api/whatsapp/generate-qr', async (req, res) => {
  try {
    const qrData = await whatsappService.generateQR();
    res.json(qrData);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Enviar mensaje
app.post('/api/whatsapp/send-message', async (req, res) => {
  const { sessionId, number, message } = req.body;
  
  try {
    const result = await whatsappService.sendMessage(sessionId, number, message);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## 🔧 Configuración Avanzada

### Variables de Entorno

```bash
# Entorno de ejecución
NODE_ENV=production

# Servidor
PORT=3000

# Backend principal
BACKEND_BASE_URL=https://api.tudominio.com
PRODUCTION_API_KEY=tu_api_key

# Timeouts y reintentos
BACKEND_TIMEOUT=15000
BACKEND_RETRIES=5
```

### Configuración en BackendNotifier

```javascript
// src/BackendNotifier.js
const configs = {
  development: {
    backendBaseUrl: 'http://localhost:8000',
    timeout: 5000,
    retries: 2
  },
  production: {
    backendBaseUrl: 'https://api.tudominio.com',
    timeout: 15000,
    retries: 5,
    apiKey: process.env.PRODUCTION_API_KEY
  }
};
```

## 📊 Monitoreo y Estados

### Estados de Sesión

| Estado | Descripción | Cuándo Ocurre |
|--------|-------------|---------------|
| `connecting` | Generando QR o conectando | Al crear sesión/generar QR |
| `connected` | Conectada y operativa | Al escanear QR exitosamente |
| `disconnected` | Desconectada | Al cerrar WhatsApp o perder conexión |
| `error` | Error permanente | Error sin posibilidad de reconexión |

### Logs del Sistema

```bash
# Ver logs en tiempo real
npm start

# Logs específicos
grep "[session_1234]" logs.txt           # Por sesión
grep "[CALLBACK]" logs.txt               # Callbacks al backend
grep "=== QR GENERADO ===" logs.txt     # Generación de QRs
```

### Health Check

```bash
curl http://localhost:3000/health
```

## 🚀 Despliegue en Producción

### Consideraciones
- **Memoria**: ~50-100MB por sesión activa
- **CPU**: Picos durante conexión inicial
- **Storage**: Credenciales crecen con el tiempo
- **Network**: Conexión estable requerida

### Docker Example

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Crear directorios necesarios
RUN mkdir -p auth_sessions downloads

EXPOSE 3000

CMD ["npm", "start"]
```

## 🆘 FAQ y Troubleshooting

### Preguntas Frecuentes

**Q: ¿Qué pasa si el usuario no escanea el QR?**
A: El QR permanece válido hasta que se escanee o se genere uno nuevo. La sesión queda en estado `connecting`.

**Q: ¿Puedo tener múltiples QRs activos?**
A: Sí, cada llamada a `/generate-qr` crea una sesión independiente con su propio QR.

**Q: ¿Cómo identifico qué cuenta se conectó?**
A: El callback `new-session-connected` incluye el `phone_number` extraído automáticamente.

**Q: ¿Qué pasa si el orquestador se reinicia?**
A: Las sesiones conectadas se reconectan automáticamente usando las credenciales guardadas.

### Problemas Comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| QR no se genera | Error de conexión | Verificar logs del servidor |
| Callback no llega | Backend no responde | Verificar URL en BackendNotifier |
| Sesión no conecta | QR expirado | Generar nuevo QR |
| Múltiples conexiones | Mismo número escaneado varias veces | WhatsApp solo permite una sesión activa |

---

## 📞 Resumen del Nuevo Flujo

### ✅ **Flujo Anterior (Eliminado)**
1. Backend crea sesión con datos
2. Orquestador maneja sesión
3. Frontend pide QR
4. Usuario escanea
5. Callbacks notifican cambios

### ✅ **Nuevo Flujo Simplificado**
1. **Frontend solicita QR** → `GET /generate-qr`
2. **Usuario escanea QR**
3. **Callback automático** con todos los datos → Backend almacena directamente

### 🎯 **Beneficios**
- **50% menos código**
- **Flujo más intuitivo**
- **Datos completos automáticos**
- **Sin gestión manual de IDs**
- **Más fácil de mantener**

**Versión**: 3.0.0 - Flujo Simplificado  
**Última actualización**: Enero 2024