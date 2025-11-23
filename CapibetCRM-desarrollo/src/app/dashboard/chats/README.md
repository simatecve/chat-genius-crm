# Módulo de Chats - Arquitectura Multi-Canal

## 📋 Descripción

Este módulo maneja la interfaz de chat de la aplicación con soporte completo para múltiples canales de comunicación. Ha sido completamente refactorizado siguiendo el principio **DRY (Don't Repeat Yourself)** con una arquitectura extensible y componentes reutilizables.

## 🎯 Canales Soportados

- ✅ **WhatsApp QR** (`whatsapp_qr`)
- ✅ **WhatsApp API** (`whatsapp_api`)
- ✅ **Messenger** (`messenger`)
- ✅ **Telegram** (`telegram`)
- ✅ **Telegram Bot** (`telegram_bot`)
- ✅ **Instagram** (`instagram`)
- ✅ **Gmail** (`gmail`)
- ✅ **Outlook** (`outlook`)
- ✅ **SMS** (`sms`)
- ✅ **Web Chat** (`web-chat`)
- ✅ **Otros** (Facebook, Twitter, LinkedIn, etc.)

## 🏗️ Arquitectura

### Estructura de Carpetas

```
src/app/dashboard/chats/
├── config/
│   └── channelConfig.tsx      # Configuración centralizada de canales
├── utils/
│   └── messageUtils.ts        # Utilidades para manejo de mensajes
├── types/
│   └── index.ts              # Tipos compartidos
├── components/
│   ├── Chat.tsx              # Componente principal de conversación
│   ├── ChatListHeader.tsx    # Header con selector de espacio
│   ├── ChatListItem.tsx      # Item de la lista de chats
│   ├── ChannelAvatar.tsx     # Avatar según tipo de canal
│   ├── SearchBar.tsx         # Barra de búsqueda
│   ├── MessagePreview.tsx    # Preview de mensajes
│   ├── LoadingState.tsx      # Estados de carga
│   ├── EmptyState.tsx        # Estados vacíos
│   ├── ContextMenu.tsx       # Menú contextual
│   ├── EmbudosFilter.tsx     # Filtro de embudos
│   ├── ContactInfoMenu.tsx   # Menú de info de contacto
│   ├── MessageItem.tsx       # Item de mensaje
│   └── DeleteMessagesModal.tsx # Modal de confirmación
└── page.tsx                  # Página principal
```

### Capa de Abstracción

#### `config/channelConfig.tsx`

Configuración centralizada para todos los canales:

```typescript
interface ChannelConfig {
  name: string;
  icon: React.ReactNode;
  color: string;
  supportedFeatures: {
    text: boolean;
    images: boolean;
    videos: boolean;
    files: boolean;
    emojis: boolean;
    audio: boolean;
  };
  messageEndpoint: string;
}
```

**Funciones principales:**
- `getChannelConfig(type)` - Obtiene configuración completa
- `getChannelInfo(type)` - Obtiene nombre e icono
- `getChannelColor(type)` - Obtiene color del canal
- `channelSupports(type, feature)` - Verifica soporte de características
- `isEmojiPickerAvailable(type)` - Verifica soporte de emojis
- `getMessageEndpoint(type)` - Obtiene endpoint para enviar mensajes

#### `utils/messageUtils.ts`

Utilidades para procesamiento de mensajes multi-canal:

**Funciones principales:**
- `getMessageContent(message)` - Extrae contenido de texto
- `isImageMessage(message)` - Verifica si es imagen
- `isVideoMessage(message)` - Verifica si es video
- `isFileMessage(message)` - Verifica si es archivo
- `isMessageFromMe(message)` - Determina remitente
- `filterMessagesByChannel(messages, channelType)` - Filtra mensajes por canal
- `formatMessageTime(dateString)` - Formatea timestamps
- `getMediaType(message)` - Detecta tipo de contenido

## 🧩 Componentes Principales

### `ChannelAvatar`

Avatar dinámico que se adapta al tipo de canal.

```tsx
<ChannelAvatar 
  channelType="whatsapp_api" 
  size="medium" 
/>
```

**Props:**
- `channelType`: Tipo de canal
- `size`: `'small'` | `'medium'` | `'large'`

### `ChatListItem`

Item de lista de chat reutilizable.

```tsx
<ChatListItem
  chat={chat}
  isSelected={isSelected}
  onClick={handleClick}
  onContextMenu={handleContextMenu}
/>
```

### `MessagePreview`

Preview inteligente del último mensaje según tipo de contenido.

```tsx
<MessagePreview 
  message={lastMessage} 
  channelType={chat.sesion.type} 
/>
```

### `LoadingState` / `EmptyState`

Estados reutilizables para diferentes situaciones.

```tsx
<LoadingState 
  title="Cargando..." 
  subtitle="Por favor espera" 
/>

<EmptyState
  icon={<MessageCircle />}
  title="No hay chats"
  subtitle="Aún no tienes conversaciones"
/>
```

## 🔄 Flujo de Datos

### Carga Inicial

1. Cargar espacios de trabajo
2. Al seleccionar espacio:
   - Cargar embudos
   - Cargar sesiones (filtradas por embudos del espacio)
   - Cargar chats con último mensaje
   - Cargar contactos

### Tiempo Real

- **WebSocket**: Escucha evento `chat:new_message`
- Actualiza lista de chats automáticamente
- Marca nuevos mensajes solo si chat no está abierto

### Envío de Mensajes

1. Obtiene endpoint dinámicamente según canal: `getMessageEndpoint(channelType)`
2. Envía mensaje al endpoint correspondiente
3. Muestra mensaje optimista en UI
4. Actualiza con respuesta del servidor

## 🎨 Personalización por Canal

### Colores Dinámicos

El botón de envío y otros elementos visuales se adaptan al color del canal:

- WhatsApp: `#25D366`
- Messenger: `#0084FF`
- Telegram: `#0088cc`
- Instagram: `#E4405F`
- etc.

### Características Condicionales

El emoji picker solo aparece en canales que lo soportan:

```typescript
{isEmojiPickerAvailable(chat.sesion.type) && (
  <EmojiPickerButton />
)}
```

## 🚀 Agregar Nuevo Canal

Para agregar soporte a un nuevo canal:

1. **Agregar en `channelConfig.tsx`:**

```typescript
'nuevo_canal': {
  name: 'Nuevo Canal',
  icon: <NuevoIcon className="w-4 h-4" />,
  color: '#FF5733',
  supportedFeatures: {
    text: true,
    images: true,
    videos: false,
    files: false,
    emojis: true,
    audio: false,
  },
  messageEndpoint: '/api/mensajes/enviar/nuevo-canal',
}
```

2. **Agregar tipo en `sesion.ts`:**

```typescript
type: 'whatsapp_qr' | 'messenger' | 'telegram' | 'nuevo_canal' // ...
```

3. **Implementar endpoint de API** (opcional si usa formato diferente):

```typescript
// src/app/api/mensajes/enviar/nuevo-canal/route.ts
```

4. **Agregar lógica de parsing de mensajes** (si el formato es único):

```typescript
// En messageUtils.ts, agregar caso especial si necesario
if (message.type === 'nuevo_canal' && 'campo_especial' in message.content) {
  // Lógica específica del canal
}
```

## 📊 Mejoras vs Versión Anterior

### Eliminación de Duplicación

- ❌ **Antes**: Funciones hardcodeadas para WhatsApp duplicadas en múltiples lugares
- ✅ **Ahora**: Funciones reutilizables en `messageUtils.ts` y `channelConfig.tsx`

### Componentización

- ❌ **Antes**: ~800 líneas de JSX inline en `page.tsx`
- ✅ **Ahora**: Componentes reutilizables y especializados

### Extensibilidad

- ❌ **Antes**: Agregar un canal requería modificar múltiples archivos
- ✅ **Ahora**: Agregar configuración en un solo lugar

### Mantenibilidad

- ❌ **Antes**: Lógica dispersa y difícil de seguir
- ✅ **Ahora**: Separación clara de responsabilidades

## 🧪 Testing

Para testear un nuevo canal:

1. Crear sesión del tipo de canal
2. Crear chat asociado
3. Enviar mensaje de prueba
4. Verificar:
   - Avatar correcto
   - Color correcto
   - Preview de mensaje
   - Funcionalidades habilitadas/deshabilitadas

## 📝 Notas Importantes

- La lógica de WhatsApp se mantiene **100% intacta** 
- Todos los canales usan la misma estructura de datos
- Los endpoints de API son responsables de adaptar el formato
- La UI se adapta automáticamente a las capacidades del canal

## 🔗 Dependencias

- `next/image` - Para avatares e íconos
- `lucide-react` - Iconos genéricos
- WebSocket context - Para actualizaciones en tiempo real
- SSE hooks - Para mensajes en tiempo real del chat

---

**Última actualización**: Octubre 2025
**Arquitectura**: DRY Multi-Canal
**Compatibilidad**: Todos los canales configurados

