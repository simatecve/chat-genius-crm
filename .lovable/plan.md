

# Plan: Optimización visual mobile — Embudos y Conversaciones

## Diagnóstico de problemas en mobile (≤768px)

**Conversations (`/conversations`)**:
- 3 `ResizablePanel` siempre montados en paralelo → en mobile se aplastan a ~120px cada uno, ilegibles.
- Lista, chat y panel de info compiten por el mismo ancho.
- Header del chat con nombre + teléfono + sesión Twilio + 3 botones se desborda.
- `ConversationList` muestra 3 selects apilados (asignación, modo, sesión) + workspace + embudos → ocupa media pantalla antes de ver chats.
- `AppLayout` aplica `p-6` (24px) en mobile → desperdicia ancho útil.

**Leads / Embudos (`/leads`)**:
- `KanbanBoard` con `flex gap-4 overflow-x-auto` y columnas de `w-64` (256px) → en mobile se ven 1.3 columnas, scroll horizontal incómodo.
- `LeadCard` con avatar 40px + 3 filas de info → se ven bien pero el contenedor padre desperdicia espacio.
- Tooltips de columna no funcionan con touch.
- `AppLayout p-6` recorta el ancho del board.

## Cambios propuestos

### 1. `src/components/layout/AppLayout.tsx` — padding adaptativo
- `<main>`: `p-3 md:p-6` (12px en mobile, 24px en desktop).
- En rutas de pantalla completa (Conversations, Leads), reducir aún más: usar `p-0 md:p-6` cuando la página lo necesite. Solución simple: agregar prop `noPadding` opcional, o detectar por route en el contenedor de la página.

### 2. `src/pages/Conversations.tsx` — layout mobile en pestañas
**Mobile (`useIsMobile()`)**: Reemplazar `ResizablePanelGroup` por una **vista de una sola columna con navegación tipo drill-down**:
- Sin conversación seleccionada → mostrar solo `ConversationList` a pantalla completa.
- Con conversación seleccionada → mostrar solo `ChatArea` con botón "← volver" en el header que limpia `selectedConversation`.
- `ContactInfoPanel` se abre como `Sheet` (drawer lateral derecho) al tocar el botón `UserCircle` — nunca como panel fijo en mobile.

**Desktop**: Mantener layout actual con 3 paneles redimensionables.

### 3. `src/components/conversations/ConversationList.tsx` — filtros colapsables
- En mobile, **colapsar los selects** dentro de un botón "Filtros" que abre un `Sheet`/`Collapsible`. Solo se ven por defecto: título "Chats", badge de no leídos, y barra de búsqueda.
- Reducir `p-4` del header a `p-3` en mobile.
- `ConversationItem`: avatar `h-12 w-12` → `h-11 w-11` en mobile, `text-base` → `text-sm`, `p-4` → `p-3`.
- Tags: limitar a 2 visibles en mobile (en vez de 3) + contador.

### 4. `src/components/conversations/ChatArea.tsx` — header mobile compacto
- En mobile añadir botón **"← volver"** al inicio del header (`onBack` prop pasada desde `Conversations`).
- Compactar título: nombre en una línea con `truncate`, teléfono debajo en `text-[11px]`.
- Mover el badge de sesión Twilio del header a una línea inferior solo cuando exista.
- Botones del header: ocultar `AssignToKanban` y meterlo en el `DropdownMenu` (3 puntos) en mobile. Mantener visibles solo `UserCircle` (info) y `MoreVertical`.
- Reducir `p-4` del área de mensajes a `p-3` en mobile.
- Input de mensaje: aumentar `min-h` táctil a 44px y reducir gap entre íconos.

### 5. `src/components/conversations/ContactInfoPanel.tsx` — modo Sheet en mobile
- Cuando se abra desde mobile, renderizarlo dentro de un `Sheet` lateral derecho a 90% de ancho con scroll vertical, no como tercer panel.
- Implementación: el panel ya existe como componente, solo se cambia el wrapper en `Conversations.tsx`.

### 6. `src/components/KanbanBoard.tsx` — vista mobile mejorada
**Opción A — recomendada (snap horizontal "una columna a la vez")**:
- En mobile cambiar columnas de `w-64` (256px) a `w-[85vw] max-w-[320px]`.
- Agregar `snap-x snap-mandatory` al contenedor y `snap-center` a cada columna → al hacer swipe, cada columna se centra como si fueran "tarjetas".
- Indicador de paginación abajo (puntitos): muestra en qué columna estás de N totales.
- Reducir `gap-4` a `gap-3` en mobile, `pb-4` a `pb-2`.
- Header de columna: reducir `pt-4 pb-3` a `pt-3 pb-2`, y `text-sm uppercase` a `text-xs uppercase`.
- `LeadCard`: avatar `w-10 h-10` → `w-9 h-9`, padding `p-3` → `p-2.5`. Limitar tags visibles a 2 en mobile.
- Tooltip del nombre de columna: convertirlo a click/long-press en mobile (`onClick` muestra un toast con conteo) para que sea accesible sin hover.

### 7. `src/components/conversations/EmbudosFilter.tsx` — chips touch-friendly
- Reducir `px-5 py-2` a `px-4 py-1.5` en mobile para que entren más chips visibles.
- Mantener scroll horizontal pero agregar `gap-1.5` (en vez de `gap-2`) y `pb-2` para que el último chip no se corte.

## Lo que NO se toca

- Lógica de negocio (envío de mensajes, asignación, embudos, real-time).
- Comportamiento desktop — todo lo nuevo va detrás de `useIsMobile()`.
- Estructura de datos, hooks, servicios.
- Sidebar/Header (ya tienen su propio comportamiento mobile).

## Detalles técnicos

- **Hook clave**: `useIsMobile()` (ya existe en `src/hooks/use-mobile.tsx`, breakpoint 768px).
- **Componentes UI nuevos a usar**: `Sheet` (ya está en `ui/sheet.tsx`) para ContactInfoPanel y Filtros.
- **Patrón de drill-down mobile** en Conversations: condicional sobre `isMobile && !selectedConversation` vs `isMobile && selectedConversation`. No requiere router nuevo, solo conditional render.
- **Snap scroll**: `snap-x snap-mandatory` en el container y `snap-center shrink-0` en cada columna. Compatible con todos los navegadores modernos.
- **Indicador de columna activa**: `IntersectionObserver` sobre las columnas visibles + state local con índice activo.
- **Touch targets**: garantizar mínimo 40×40px en todos los botones interactivos en mobile (botones del header, chips de filtro, botones del lead card).
- **Sin cambios a tipos TypeScript** salvo añadir `onBack?: () => void` opcional a `ChatAreaProps`.

## Resultado esperado

- Conversaciones: experiencia tipo WhatsApp mobile (lista → chat → info como drawer).
- Embudos: una columna a la vez con swipe lateral natural, chips de embudo más compactos, tarjetas más densas.
- Cero cambios visuales en desktop.
- Mejor uso del ancho de pantalla en todas las vistas mobile (ahorro ~24-32px de padding).

