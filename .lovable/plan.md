

# Plan: WebChat en Embudos + Configuración Multi-API Casino por Workspace

## Resumen

Tres cambios principales:
1. Mostrar conversaciones WebChat en la página `/leads` (embudos principales) con su icono identificativo
2. Crear tabla `casino_api_configs` para almacenar múltiples APIs de casino
3. Vincular cada workspace con una API de casino específica, y usar esa API al interactuar con el casino desde cualquier conversación

---

## Parte 1: WebChat visible en Embudos

### Problema actual
La página `/leads` filtra explícitamente las conversaciones webchat en 3 lugares:
- `loadWorkspaces()`: excluye workspaces con `channel_type='webchat'`
- `orphanQuery`: filtra `channel_type.neq.webchat`
- `useInfiniteLeads.ts`: filtra `conversations.filter(c => c.channel_type !== 'webchat')`

### Cambios

**`src/pages/Leads.tsx`**:
- Eliminar filtro `channel_type.neq.webchat` en `loadWorkspaces()` (línea 413) — ahora muestra todos los workspaces
- Eliminar filtro `channel_type.neq.webchat` en la query de conversaciones huérfanas (línea 614)
- Eliminar filtro de conversaciones webchat en `filteredRealLeads` (línea 653)

**`src/hooks/useInfiniteLeads.ts`**:
- Eliminar el filtro en línea 117 que excluye conversaciones webchat

**`src/components/KanbanBoard.tsx`** (o donde se rendericen las tarjetas de leads):
- Agregar icono de WebChat (Globe) junto al nombre del lead cuando la conversación es de tipo `webchat`
- Usar los iconos existentes: Phone (WhatsApp verde), MessageCircle (Twilio rojo/Telegram azul), Globe (WebChat púrpura)

---

## Parte 2: Tabla de configuración de APIs de Casino

### Migración SQL

Crear tabla `casino_api_configs`:
```sql
CREATE TABLE casino_api_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,              -- "API 1", "API 2"
  api_base_url text,               -- URL base de la API
  api_key text,                    -- API key
  agent_username text,             -- Username del agente
  parent_id text,                  -- Parent ID del casino
  skin_id text,                    -- Skin ID
  webhook_url text,                -- URL del webhook (n8n u otro)
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE casino_api_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage account casino configs"
ON casino_api_configs FOR ALL TO authenticated
USING (user_id = get_account_owner_id(auth.uid()));
```

Agregar columna a `workspaces`:
```sql
ALTER TABLE workspaces ADD COLUMN casino_api_config_id uuid REFERENCES casino_api_configs(id);
```

### UI: Tab de Casino API en Configuración

**`src/components/settings/CasinoApiConfigTab.tsx`** (nuevo):
- Lista de APIs de casino configuradas (API 1, API 2, etc.)
- Formulario para agregar/editar: nombre, URL base, API key, agent username, parent ID, skin ID, webhook URL
- Botón para activar/desactivar cada API

### UI: Selector de API en Workspaces

**`src/components/WorkspaceManagement.tsx`**:
- Agregar un `<Select>` al crear/editar workspace para elegir la API de casino asociada
- Mostrar badge con el nombre de la API en cada workspace

---

## Parte 3: Usar API correcta según Workspace

### `src/services/casinoApiService.ts`
- Refactorizar para que las constantes (API_BASE_URL, API_KEY, etc.) no sean hardcodeadas
- Crear función factory: `createCasinoApiClient(config)` que reciba la configuración y retorne las mismas funciones pero usando los datos de esa config
- Agregar función `getCasinoConfigForWorkspace(workspaceId)` que consulte el workspace → casino_api_config_id → casino_api_configs

### `supabase/functions/ia-default-agent/index.ts`
- La función `crearJugador()` actualmente usa un webhook hardcodeado (`n8n2025.nocodeveloper.site/webhook/crear-usuario`)
- Modificar para que reciba el `webhook_url` desde la configuración del workspace de la conversación
- Al inicio del handler, obtener el workspace de la conversación (vía lead → lead_column → workspace → casino_api_config) y pasar la config correcta

### `supabase/functions/web-chat-message/index.ts`
- Mismo cambio: obtener la casino_api_config del workspace de la conversación webchat

---

## Parte 4: Integración en Settings.tsx

**`src/pages/Settings.tsx`**:
- Agregar nueva tab "Casino API" con el componente `CasinoApiConfigTab`
- Icono: Building o similar

---

## Archivos afectados

1. **Migración SQL**: nueva tabla + columna en workspaces
2. `src/pages/Leads.tsx` — eliminar filtros webchat
3. `src/hooks/useInfiniteLeads.ts` — eliminar filtro webchat
4. `src/components/KanbanBoard.tsx` — agregar iconos de canal
5. `src/components/settings/CasinoApiConfigTab.tsx` — nuevo componente
6. `src/pages/Settings.tsx` — agregar tab
7. `src/components/WorkspaceManagement.tsx` — selector de API casino
8. `src/services/casinoApiService.ts` — refactorizar a factory pattern
9. `supabase/functions/ia-default-agent/index.ts` — usar config dinámica
10. `supabase/functions/web-chat-message/index.ts` — usar config dinámica

