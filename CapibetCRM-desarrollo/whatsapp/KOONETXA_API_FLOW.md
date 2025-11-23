# 🔄 Flujo de API Koonetxa vs Implementación Actual

## 📋 Flujo de la API de Koonetxa

Según la documentación en https://koonetxa.apidog.io/, el flujo es:

### 1️⃣ Crear Sesión
```http
POST /api/sessions
Content-Type: application/json

{
  "name": "session_name" // Opcional
}
```

**Respuesta:**
```json
{
  "name": "session_name",
  "status": "STOPPED"
}
```

### 2️⃣ Iniciar Sesión
```http
POST /api/sessions/{session}/start
```

**Respuesta:**
```json
{
  "name": "session_name",
  "status": "STARTING"
}
```

### 3️⃣ Obtener QR para Autenticación
```http
GET /api/{session}/auth/qr
```

**Respuesta:**
```json
{
  "qr": "data:image/png;base64,..."
}
```

---

## 🔧 Implementación Actual de Baileys

Nuestra implementación actual tiene un flujo simplificado:

### Flujo Actual
```http
GET /generate-qr
```

**Respuesta:**
```json
{
  "success": true,
  "sessionId": "session_1763753180942_ha86n84wh",
  "qr": "data:image/png;base64,...",
  "qrText": "2@dZckz...",
  "message": "QR generado. Escanea con WhatsApp para conectar."
}
```

Este endpoint hace todo en uno:
1. ✅ Crea la sesión
2. ✅ La inicia automáticamente
3. ✅ Genera y devuelve el QR

---

## 🎯 Propuesta: Adaptar al Flujo de Koonetxa

Para seguir el patrón de la API de Koonetxa, necesitamos modificar nuestros endpoints:

### Endpoints Propuestos

#### 1. Crear Sesión
```http
POST /api/sessions
Content-Type: application/json

{
  "name": "mi_sesion_whatsapp"  // Opcional, se genera automáticamente si no se proporciona
}
```

**Implementación:**
- Crear la estructura de sesión en memoria
- NO conectar a WhatsApp todavía
- Estado inicial: `STOPPED`

#### 2. Iniciar Sesión
```http
POST /api/sessions/{session}/start
```

**Implementación:**
- Conectar a WhatsApp usando Baileys
- Generar QR automáticamente
- Estado: `STARTING` → `SCAN_QR_CODE` → `WORKING` (cuando se conecta)

#### 3. Obtener QR
```http
GET /api/{session}/auth/qr
```

**Implementación:**
- Devolver el QR generado durante el inicio
- Si no hay QR disponible, devolver error apropiado

---

## 📝 Comparación de Flujos

### Flujo Koonetxa (3 pasos)
```
1. POST /api/sessions (crear)
   ↓
2. POST /api/sessions/{session}/start (iniciar)
   ↓
3. GET /api/{session}/auth/qr (obtener QR)
```

### Flujo Actual Baileys (1 paso)
```
1. GET /generate-qr (crear + iniciar + QR)
```

---

## 💡 Recomendación

### Opción 1: Mantener Ambos Flujos ✅ (Recomendado)

**Ventajas:**
- Compatibilidad con código existente
- Flexibilidad para diferentes casos de uso
- Migración gradual

**Implementación:**
```javascript
// Flujo simplificado (actual)
GET /generate-qr

// Flujo Koonetxa (nuevo)
POST /api/sessions
POST /api/sessions/{session}/start
GET /api/{session}/auth/qr
```

### Opción 2: Solo Flujo Koonetxa

**Ventajas:**
- API más estándar
- Mejor control del ciclo de vida de sesiones
- Separación de responsabilidades

**Desventajas:**
- Requiere cambios en el frontend
- Más llamadas HTTP para el mismo resultado

---

## 🔨 Implementación Propuesta

### Modificar `server.js`

```javascript
// NUEVO: Crear sesión sin iniciar
app.post('/api/sessions', async (req, res) => {
    try {
        const { name } = req.body;
        
        // Generar nombre si no se proporciona
        const sessionName = name || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Verificar que no exista
        if (sessionManager.sessions.has(sessionName)) {
            return res.status(409).json({
                success: false,
                message: 'Session already exists',
                name: sessionName
            });
        }
        
        // Crear sesión SIN conectar
        const sessionData = {
            sessionId: sessionName,
            phoneNumber: null,
            authFolderPath: `./auth_sessions/${sessionName}`,
            serverPort: null,
            sock: null,
            qrCodeData: null,
            status: 'STOPPED',
            lastSeen: null,
            whatsappUserId: null,
            connectedUserPhoneNumber: null,
            createdAt: new Date(),
            reconnectAttempts: 0,
            maxReconnectAttempts: 5,
            isIntentionallyDisconnecting: false
        };
        
        sessionManager.sessions.set(sessionName, sessionData);
        
        res.json({
            success: true,
            name: sessionName,
            status: 'STOPPED',
            message: 'Session created successfully'
        });
        
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating session',
            error: error.message
        });
    }
});

// NUEVO: Iniciar sesión
app.post('/api/sessions/:session/start', async (req, res) => {
    try {
        const { session } = req.params;
        
        const sessionData = sessionManager.sessions.get(session);
        if (!sessionData) {
            return res.status(404).json({
                success: false,
                message: 'Session not found',
                name: session
            });
        }
        
        if (sessionData.status === 'WORKING' || sessionData.status === 'STARTING') {
            return res.status(400).json({
                success: false,
                message: 'Session already started',
                name: session,
                status: sessionData.status
            });
        }
        
        // Iniciar conexión a WhatsApp
        sessionData.status = 'STARTING';
        await sessionManager.connectSession(session);
        
        res.json({
            success: true,
            name: session,
            status: 'STARTING',
            message: 'Session starting. Use GET /api/{session}/auth/qr to get QR code'
        });
        
    } catch (error) {
        console.error('Error starting session:', error);
        res.status(500).json({
            success: false,
            message: 'Error starting session',
            error: error.message
        });
    }
});

// NUEVO: Obtener QR
app.get('/api/:session/auth/qr', async (req, res) => {
    try {
        const { session } = req.params;
        
        const sessionData = sessionManager.sessions.get(session);
        if (!sessionData) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }
        
        if (!sessionData.qrCodeData) {
            return res.status(400).json({
                success: false,
                message: 'QR code not available. Session may not be started or already connected.',
                status: sessionData.status
            });
        }
        
        // Generar imagen QR
        const qrImage = await QRCode.toDataURL(sessionData.qrCodeData);
        
        res.json({
            success: true,
            qr: qrImage,
            qrText: sessionData.qrCodeData,
            status: sessionData.status
        });
        
    } catch (error) {
        console.error('Error getting QR:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting QR code',
            error: error.message
        });
    }
});
```

---

## 🧪 Ejemplo de Uso

### Flujo Koonetxa Completo

```bash
# 1. Crear sesión
curl -X POST http://localhost:3001/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"name": "mi_sesion_whatsapp"}'

# Respuesta:
# {
#   "success": true,
#   "name": "mi_sesion_whatsapp",
#   "status": "STOPPED"
# }

# 2. Iniciar sesión
curl -X POST http://localhost:3001/api/sessions/mi_sesion_whatsapp/start

# Respuesta:
# {
#   "success": true,
#   "name": "mi_sesion_whatsapp",
#   "status": "STARTING"
# }

# 3. Obtener QR (esperar 1-2 segundos después de iniciar)
curl http://localhost:3001/api/mi_sesion_whatsapp/auth/qr

# Respuesta:
# {
#   "success": true,
#   "qr": "data:image/png;base64,...",
#   "qrText": "2@...",
#   "status": "SCAN_QR_CODE"
# }
```

### Flujo Simplificado (Actual)

```bash
# Todo en uno
curl http://localhost:3001/generate-qr

# Respuesta:
# {
#   "success": true,
#   "sessionId": "session_1763753180942_ha86n84wh",
#   "qr": "data:image/png;base64,...",
#   "qrText": "2@..."
# }
```

---

## 📊 Estados de Sesión

Según la API de Koonetxa, los estados son:

| Estado | Descripción |
|--------|-------------|
| `STOPPED` | Sesión creada pero no iniciada |
| `STARTING` | Sesión iniciándose |
| `SCAN_QR_CODE` | Esperando escaneo de QR |
| `WORKING` | Sesión conectada y funcionando |
| `FAILED` | Error en la sesión |

### Mapeo con Nuestra Implementación

| Nuestro Estado | Estado Koonetxa |
|----------------|-----------------|
| `disconnected` | `STOPPED` |
| `connecting` | `STARTING` |
| `connecting` (con QR) | `SCAN_QR_CODE` |
| `connected` | `WORKING` |
| `error` | `FAILED` |

---

## ✅ Próximos Pasos

1. **Implementar los nuevos endpoints** siguiendo el patrón Koonetxa
2. **Mantener el endpoint actual** `/generate-qr` para compatibilidad
3. **Actualizar el frontend** para usar el nuevo flujo (opcional)
4. **Documentar ambos flujos** en el README
5. **Agregar tests** para ambos flujos

---

## 🎯 Conclusión

La API de Koonetxa usa un flujo de 3 pasos más estructurado:
1. **Crear** sesión
2. **Iniciar** sesión
3. **Obtener** QR

Nuestra implementación actual simplifica esto en un solo paso, pero podemos agregar los endpoints adicionales para ofrecer ambas opciones y mayor flexibilidad.

**Recomendación:** Implementar ambos flujos para máxima compatibilidad y flexibilidad.
