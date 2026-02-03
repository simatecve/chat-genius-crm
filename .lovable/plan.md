
# Plan: Agregar Estadísticas de Conversaciones Nuevas por Día

## Resumen

Agregaremos una nueva métrica y visualización al módulo de reportes que mostrará el número de **conversaciones nuevas creadas por día** para todos los canales (WhatsApp, Twilio, Telegram, WebChat).

---

## Cambios a Realizar

### 1. Extender el Servicio de Reportes (`src/services/reportsService.ts`)

**Nuevo tipo de datos:**
```typescript
export interface DailyNewConversationsStats {
  date: string;
  count: number;
}
```

**Actualizar SessionStats para incluir conversaciones nuevas:**
```typescript
export interface SessionStats {
  // ... campos existentes
  newConversationsToday: number;      // Nuevas conversaciones hoy
  newConversationsChange: number;     // Cambio % vs período anterior
}
```

**Nuevas funciones a crear:**
| Función | Descripción |
|---------|-------------|
| `getNewConversationsByDate()` | Obtiene conversaciones nuevas por día para una sesión específica |
| `getNewConversationsByDateForChannel()` | Obtiene conversaciones nuevas por día agregado por canal |

**Lógica de conteo:**
- Consulta a la tabla `conversations` filtrando por `created_at` dentro del rango de fechas
- Agrupa por fecha para obtener el conteo diario
- Filtra por canal/sesión según corresponda

---

### 2. Actualizar el Hook de Reportes (`src/hooks/useReports.ts`)

**Nuevos queries a agregar:**
- `newConversationsDaily` - Para conversaciones nuevas por día
- Incluir en el estado de loading correspondiente

**Nuevos valores a retornar:**
- `newConversationsStats` - Array con datos diarios
- `newConversationsLoading` - Estado de carga

---

### 3. Actualizar Tarjetas de Estadísticas (`src/components/reports/StatsCards.tsx`)

**Nueva tarjeta a agregar:**

| Campo | Valor |
|-------|-------|
| Título | "Conversaciones Nuevas" |
| Icono | `UserPlus` (de lucide-react) |
| Color | `text-cyan-500` |
| Valor | Total de conversaciones nuevas en el período |
| Cambio | % cambio vs período anterior |

**Modificar grid:** Cambiar de 4 columnas a 5 para acomodar la nueva tarjeta.

---

### 4. Crear Nuevo Gráfico de Conversaciones Nuevas por Día

**Nuevo archivo:** `src/components/reports/NewConversationsChart.tsx`

**Características:**
- Gráfico de barras (BarChart) con estilo consistente
- Muestra número de conversaciones nuevas por día
- Colores en tema cyan para diferenciarlo de los mensajes
- Tooltip con fecha y cantidad
- Título: "Conversaciones Nuevas por Día"

---

### 5. Integrar en Página de Reportes (`src/pages/Reports.tsx`)

**Cambios:**
- Importar `NewConversationsChart`
- Agregar query para `newConversationsStats` desde el hook
- Mostrar el nuevo gráfico en el grid de charts (reorganizar a 3 columnas si necesario, o agregar debajo)

---

## Diagrama de Flujo de Datos

```text
┌─────────────────────────────────────────────────────────────────┐
│                         Reports.tsx                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ StatsCards   │  │ MessagesByDay│  │ NewConversationsChart │  │
│  │ (+1 nueva)   │  │    Chart     │  │       (NUEVO)         │  │
│  └──────────────┘  └──────────────┘  └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
                    ┌─────────┴─────────┐
                    │   useReports.ts   │
                    │ + newConversations│
                    │   Stats           │
                    └─────────┬─────────┘
                              │
              ┌───────────────┴───────────────┐
              │      reportsService.ts        │
              │ + getNewConversationsByDate() │
              │ + getNewConversationsByDate   │
              │   ForChannel()                │
              └───────────────┬───────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Supabase DB     │
                    │  conversations    │
                    │  (created_at)     │
                    └───────────────────┘
```

---

## Archivos a Modificar/Crear

| Archivo | Acción | Cambios |
|---------|--------|---------|
| `src/services/reportsService.ts` | Modificar | Agregar tipos y funciones para conversaciones nuevas |
| `src/hooks/useReports.ts` | Modificar | Agregar queries para conversaciones nuevas diarias |
| `src/components/reports/StatsCards.tsx` | Modificar | Agregar tarjeta de conversaciones nuevas, cambiar grid a 5 cols |
| `src/components/reports/NewConversationsChart.tsx` | Crear | Nuevo gráfico de barras para conversaciones nuevas por día |
| `src/pages/Reports.tsx` | Modificar | Integrar nuevo gráfico en el layout |

---

## Detalles Técnicos

### Query de Supabase para Conversaciones Nuevas

```typescript
// Por sesión específica
const { data } = await supabase
  .from('conversations')
  .select('id, created_at')
  .eq('channel_type', channelType)  // o filtro por session
  .gte('created_at', startDate)
  .lte('created_at', endDate);

// Agrupar en JavaScript por fecha
```

### Consideraciones de Performance

1. **Reutilizar IDs de conversación:** Ya se obtienen en otras funciones, evitar queries duplicados
2. **Batching:** Aplicar misma lógica de batches si es necesario
3. **staleTime:** Usar mismo valor de 2 minutos para consistencia

---

## Resultado Esperado

- Nueva tarjeta mostrando "Conversaciones Nuevas: X" con indicador de cambio %
- Nuevo gráfico de barras mostrando tendencia diaria de conversaciones nuevas
- Funciona para todos los canales: WhatsApp, Twilio, Telegram, WebChat
- Soporta tanto vista "Todas las sesiones" como sesiones individuales
