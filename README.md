# Chat Genius CRM (Inxell / Savant)

Una plataforma integral de CRM omnicanal y gestión de leads potenciada por Inteligencia Artificial, con soporte para múltiples canales de mensajería, campañas masivas y un tablero Kanban avanzado.

## 🚀 Características Principales

### 🤖 Inteligencia Artificial & Agentes
- **Asistentes de IA**: Creación y gestión de agentes conversacionales personalizados.
- **Integraciones Nativas**: Soporte para OpenAI, Groq, Gemini y Claude.
- **Procesamiento de Buffer**: Gestión inteligente de cola de mensajes para respuestas coherentes.

### 📱 Omnicanalidad (Supabase Edge Functions)
- **WhatsApp (WAHA)**: Envío y recepción de mensajes, gestión de sesiones y archivos.
- **Twilio**: Integración completa para SMS y WhatsApp corporativo.
- **Telegram**: Webhooks nativos para bots de Telegram.
- **Facebook & Instagram**: Respuestas y webhooks para redes sociales de Meta.
- **Web Chat**: Widget de chat incrustable para sitios web con encuestas y chat en vivo.

### 📋 Gestión de Ventas y Leads
- **Tablero Kanban**: Arrastrar y soltar (Drag & Drop) intuitivo para la gestión de leads.
- **Gestión de Contactos**: Listas de contactos segmentadas, importación y administración centralizada.
- **Campañas Masivas**: Herramienta de difusión y envío de mensajes en masa a listas de contactos.
- **Calendario**: Programación de seguimientos y reuniones de ventas.
- **Reportes**: Analíticas detalladas del rendimiento comercial y uso del sistema.

### 💬 Interfaz de Conversaciones
- Experiencia de usuario (UX) estilo "WhatsApp Web" para chat en tiempo real.
- Búsqueda avanzada y filtrado de conversaciones por instancia o agente asignado.

### 🔐 Seguridad y Pagos
- **Autenticación (Supabase Auth)**: Sistema de roles y protección de rutas.
- **MercadoPago Webhooks**: Procesamiento automático de suscripciones y transacciones de los usuarios.

---

## 🛠️ Stack Tecnológico

- **Frontend**: React, TypeScript, Vite
- **UI / Estilos**: Tailwind CSS, shadcn/ui, Lucide Icons
- **Estado / Consultas**: React Query (@tanstack/react-query)
- **Backend (BaaS)**: Supabase (PostgreSQL, Row Level Security, Auth)
- **Serverless**: Supabase Edge Functions (Deno) para webhooks e integraciones externas
- **Despliegue**: Docker, Nixpacks, Nginx (optimizado para Dokploy)

---

## ⚙️ Variables de Entorno (.env)

Para correr el proyecto localmente o desplegarlo en producción, debes definir las siguientes variables de entorno:

```env
# Configuración de Supabase
VITE_SUPABASE_PROJECT_ID="tu_project_id"
VITE_SUPABASE_URL="https://tu_project_id.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="tu_anon_key"
VITE_SUPABASE_SERVICE_ROLE_KEY="tu_service_role_key"

# Configuración de WAHA (WhatsApp HTTP API)
VITE_WAHA_BASE_URL="https://tu_instancia_waha.com"
VITE_WAHA_API_KEY="tu_api_key_de_waha"
```

---

## 💻 Instalación y Desarrollo Local

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/simatecve/chat-genius-crm.git
   cd chat-genius-crm
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar el entorno**
   Crea un archivo `.env` en la raíz copiando el `.env.example` o usando la estructura provista arriba.

4. **Levantar el servidor local**
   ```bash
   npm run dev
   ```
   *La aplicación estará disponible en `http://localhost:8080` (o el puerto que asigne Vite).*

---

## 🚀 Despliegue en Dokploy

El proyecto está optimizado para ser desplegado fácilmente en **Dokploy** (u otras plataformas como Railway o Render). Tienes dos opciones de construcción (Build Types) totalmente soportadas y configuradas en el repositorio:

### Opción 1: Nixpacks (Recomendada)
Nixpacks está explícitamente configurado mediante el archivo `nixpacks.toml` en la raíz del proyecto para evitar errores con las Supabase Edge Functions (Deno) y los ciclos de vida de Node.js.

- **Build Type en Dokploy**: `Nixpacks`
- **Configuración interna**: El archivo `nixpacks.toml` fuerza el uso de **Node.js 20** puro (ignorando Deno). Instala las dependencias con `npm install`, compila el proyecto y finalmente lo sirve estáticamente con `npx serve -s dist -l 3001`.
- **Container Port**: Configurar en `3001` en el panel de Dokploy.

### Opción 2: Dockerfile
Si prefieres usar Docker clásico con Nginx, el repositorio incluye un `Dockerfile` multietapa de producción y un `nginx.conf` que garantizan el correcto funcionamiento del React Router (Single Page Application fallback).

- **Build Type en Dokploy**: `Docker`
- **Ruta del Dockerfile**: `/Dockerfile`
- **Container Port**: Configurar en `3001`. El Nginx interno está configurado en `nginx.conf` para escuchar explícitamente peticiones en este puerto y rutear todo hacia `/index.html` sin dar errores `404`.

---

## 📁 Estructura del Proyecto

```text
chat-genius-crm/
├── src/
│   ├── components/    # Componentes reutilizables UI (shadcn) y lógicos
│   ├── hooks/         # Custom hooks de React (manejo de estados, supabase queries)
│   ├── pages/         # Vistas principales (Leads, Conversaciones, Configuración, etc.)
│   ├── integrations/  # Clientes de APIs y configuraciones (Supabase client)
│   ├── lib/           # Utilidades compartidas y configuraciones globales
│   └── types/         # Definiciones de interfaces y tipos TypeScript
├── supabase/
│   └── functions/     # Supabase Edge Functions (Webhooks, Deno scripts)
├── public/            # Assets estáticos (imágenes, favicons)
├── nginx.conf         # Configuración del servidor web de producción
├── Dockerfile         # Definición de contenedor para despliegue clásico
├── nixpacks.toml      # Configuración de despliegue cloud moderno (Nix)
└── package.json       # Dependencias y scripts de Node.js
```

## 🔐 Edge Functions de Supabase

El directorio `supabase/functions/` contiene más de 30 microservicios serverless escritos en Deno. Estos deben ser desplegados hacia tu instancia de Supabase mediante su CLI:

```bash
supabase functions deploy --project-ref tu_project_id
```

Algunas funciones clave incluyen:
- `waha-webhook`, `web-chat-message`, `twilio-webhook`, `telegram-bot-webhook`: Receptores de mensajes entrantes.
- `ai-agent-response`, `process-ai-buffer`: Lógica que consulta a las APIs de IA para generar respuestas a los leads.
- `mercadopago-webhook`: Control del ciclo de vida de pagos y planes premium.
