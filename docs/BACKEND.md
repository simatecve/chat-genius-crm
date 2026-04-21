# Backend Blueprint — SuperCRM v3.3 (21-04-26)

Documentación completa para reconstruir el backend del proyecto en una BD Supabase nueva.
Proyecto fuente: `pxvembsxhwvpotydtiqa`.

---

## 1. Resumen arquitectónico

- **Multi-tenant por `account_owner_id`**. Toda fila de datos de negocio se asocia al `user_id` del **dueño de la cuenta** (admin/cliente). Las cuentas hijas (cajeros) tienen `profiles.parent_user_id` apuntando al owner. La función `get_account_owner_id(uid)` resuelve el owner real de cualquier usuario.
- **Jerarquía 3-tier de roles** (enum `profile_type`): `superadmin` > `client` (admin de cuenta) > `cajero`.
- **Roles granulares** vía tabla `user_roles` + enum `app_role` y función `has_role()` (security definer, evita recursión RLS).
- **Permisos por usuario** en tabla `user_permissions` (~60 flags booleanos `puede_*`) controlados por el admin de la cuenta.
- **Canales soportados**: WhatsApp (WAHA QR), WhatsApp API (Twilio/WAHA), Telegram Bot, Facebook Messenger, Instagram DM, Web Chat (widget propio), Landing Chat.
- **IA**: Gemini 2.5 Flash directo + Lovable AI Gateway. Activación por sesión (`ai_enabled`).
- **Realtime**: Supabase Realtime con `REPLICA IDENTITY FULL` en `messages`, `conversations`, `agent_presence`, `campaign_sends`.
- **Asignación de conversaciones** (v3.3): tablas `agent_presence` + `assignment_settings` + función `auto_assign_conversation` + trigger `trg_conversation_auto_assign`.

---

## 2. Diagrama ER simplificado

```
auth.users ──1:1── profiles ──N:1── profiles (parent_user_id, jerarquía)
                      │
                      ├── user_roles (app_role)
                      ├── user_permissions (puede_*)
                      └── agent_presence

profiles (owner) ──1:N── workspaces ──1:N── lead_columns ──1:N── leads
                                                                   │
                                                                   └── conversations ──1:N── messages
                                                                          │                       │
                                                                          ├── contact_details     └── responded_by → profiles
                                                                          ├── ai_response_buffer
                                                                          └── assigned_to → profiles (cajero)

contacts ──N:M── contact_lists (vía contact_list_members)
contact_lists ──1:N── mass_campaigns ──1:N── campaign_sends

whatsapp_connections / twilio_connections / telegram_bots / facebook_connections / web_chatbots
   └── (1:N) conversations  (channel_type discrimina)
```

---

## 3. Enums y tipos custom

```sql
CREATE TYPE public.profile_type AS ENUM ('superadmin', 'client', 'cajero');
CREATE TYPE public.app_role     AS ENUM ('superadmin', 'admin', 'moderator', 'user', 'cajero');
```

> Si en producción aparecen otros valores (`cliente`, etc.), añadirlos con `ALTER TYPE ... ADD VALUE`.

---

## 4. DDL completo de tablas

> Convención: todas las tablas viven en el schema `public`. Standard fields `id uuid PK default gen_random_uuid()`, `created_at`, `updated_at` se incluyen explícitamente. Cada tabla **debe** tener RLS habilitada (sección 7).

### 4.1 `profiles`
```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  first_name text,
  last_name text,
  company_name text,
  phone text,
  profile_type profile_type DEFAULT 'client',
  parent_user_id uuid REFERENCES public.profiles(id),
  plan_id uuid,
  plan_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 4.2 `user_roles`
```sql
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);
```

### 4.3 `user_permissions`
~60 columnas booleanas `puede_*` (ver `src/integrations/supabase/types.ts > user_permissions`). Una fila por `user_id`.

### 4.4 `agent_presence` *(nuevo v3.3)*
```sql
CREATE TABLE public.agent_presence (
  user_id uuid PRIMARY KEY,
  account_owner_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'offline', -- online | away | busy | offline
  manual_override text,                   -- override del cajero
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_presence REPLICA IDENTITY FULL;
```

### 4.5 `assignment_settings` *(nuevo v3.3)*
```sql
CREATE TABLE public.assignment_settings (
  account_owner_id uuid PRIMARY KEY,
  auto_assign_enabled boolean NOT NULL DEFAULT false,
  assign_strategy text NOT NULL DEFAULT 'manual', -- manual | round_robin | least_load
  include_unassigned_for_all boolean NOT NULL DEFAULT true,
  last_assigned_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### 4.6 `conversations`
```sql
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone_number text NOT NULL,
  whatsapp_number text,
  channel_type text DEFAULT 'whatsapp',
  pushname text,
  contact_name text,
  last_message text,
  last_message_time timestamptz,
  last_inbound_message_time timestamptz,
  unread_count integer DEFAULT 0,
  status text DEFAULT 'active',
  lead_id uuid,
  twilio_connection_id uuid,
  telegram_bot_id uuid,
  facebook_connection_id uuid,
  -- Casino flow
  casino_username text,
  casino_user_created boolean DEFAULT false,
  payment_receipt_sent boolean DEFAULT false,
  payment_receipt_detected_at timestamptz,
  -- Asignación (v3.3)
  assigned_to uuid,
  assigned_at timestamptz,
  assigned_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_conversations_user_assigned ON public.conversations(user_id, assigned_to);
CREATE UNIQUE INDEX conversations_unique_whatsapp
  ON public.conversations(user_id, phone_number, COALESCE(channel_type,'whatsapp'));
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
```

### 4.7 `messages`
```sql
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  message text,
  direction text NOT NULL,                 -- inbound | outbound
  message_type text DEFAULT 'text',
  status text DEFAULT 'sent',
  file_url text,
  attachment_url text,
  metadata jsonb,
  is_bot boolean DEFAULT false,
  responded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX messages_unique_waha_id
  ON public.messages ((metadata->>'waha_id')) WHERE metadata->>'waha_id' IS NOT NULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
```

### 4.8 Conexiones de canal
- `whatsapp_connections` (WAHA): `session_name`, `phone_number`, `status`, `ai_enabled`, `webhook_url`, `default_column_id`, `workspace_id`, `n8n_webhook_url`.
- `twilio_connections`: `account_sid`, `auth_token`, `phone_number`, `connection_name`, `ai_enabled`, ...
- `telegram_bots`: `bot_token`, `bot_username`, `bot_id`, `webhook_url`, `ai_enabled`, ...
- `facebook_connections`: `page_id`, `page_access_token`, `instagram_account_id`, `instagram_username`, `ai_enabled`, ...
- `web_chatbots`: configuración del widget (color, posición, ai_agent_id, etc.).

### 4.9 Embudos / Kanban
- `workspaces` — espacios de trabajo del owner.
- `lead_columns` — columnas del kanban (FK `workspace_id`).
- `leads` — tarjetas, FK `column_id`. Campos: `phone`, `name`, `value`, `bot_active`, `tags`, `last_inbound_message_time`.

### 4.10 Contactos
- `contacts` — directorio del owner.
- `contact_details` — extensión 1:1 por conversación.
- `contact_lists` + `contact_list_members` — listas para campañas.
- `contact_sales` — historial de ventas asociado a contact_details.
- `contacto_bloqueado_bot` — números bloqueados para IA.

### 4.11 Campañas
- `mass_campaigns` — definición.
- `campaign_sends` — envío individual con status (`REPLICA IDENTITY FULL`).
- `automated_message_logs`, `scheduled_messages` — disparadores temporales.
- `column_message_triggers` — mensajes automáticos al mover lead.

### 4.12 IA
- `ai_agents` — agente por canal (whatsapp/twilio/telegram/web).
- `ai_api_keys` — API keys propias por usuario.
- `ai_response_buffer` — buffering antiflood antes de responder.
- `ia_default_settings` (singleton id=1) — config global del flujo casino.
- `ia_humanization_settings` (singleton id=1) — delays, temperature, emoji freq.

### 4.13 Auditoría / sistema
- `audit_logs` — `action_type`, `entity_type`, `entity_id`, `details jsonb`, `ip_address`, `user_agent`.
- `system_status` — health checks por componente.
- `usage_tracking`, `user_usage`, `twilio_daily_usage` — métricas de consumo.
- `payment_plans`, `payment_methods` — billing.
- `permissions`, `role_permissions` — catálogo de permisos.

### 4.14 Otros
- `etiquetas` — tags coloreables multi-tenant.
- `quick_replies` — respuestas rápidas con hotkey y adjuntos.
- `landing_chat_config` / `landing_chat_conversations` / `landing_chat_messages` — chat embebido en landing.
- `mensaje_landing` — mensajes de contacto desde landing pública.
- `internal_messages` — chat interno entre usuarios.
- `tareas` — tareas/calendario.
- `products`, `sales` — inventario y ventas.
- `casino_api_configs` — configs múltiples de API casino.
- `user_bot_settings` — flags de auto-stop del bot por usuario.

---

## 5. Funciones SQL

Todas con `SECURITY DEFINER` y `SET search_path = public` salvo indicación.

### `get_account_owner_id(user_id uuid) → uuid`
Resuelve el owner real (parent o el propio id).

### `has_role(_user_id uuid, _role app_role) → boolean`
Chequea pertenencia en `user_roles` sin recursión RLS.

### `handle_new_user()` *(trigger fn)*
Inserta fila en `profiles` al crearse `auth.users`.

### `setup_default_workspace_and_funnel()` *(trigger fn)*
Crea workspace `Mi Espacio de Trabajo` + columna `Nuevos Contactos` cuando nace un profile.

### `auto_assign_conversation(p_conversation_id uuid) → uuid` *(v3.3)*
Lee `assignment_settings`, lista cajeros con `last_seen_at > now()-90s` y `manual_override` no en (`busy`,`offline`), aplica:
- **`round_robin`**: cursor en `last_assigned_user_id`.
- **`least_load`**: ordena por `COUNT(conversations.status='active')` ASC + `last_seen_at`.

Actualiza `conversations.assigned_to` y el cursor.

### `on_conversation_insert_assign()` *(trigger fn, v3.3)*
Llama `auto_assign_conversation` cuando se inserta una conversación sin asignar.

### `update_lead_on_inbound_message()` *(trigger fn)*
En cada message inbound: actualiza `leads.updated_at` y `last_inbound_message_time`.

### `update_last_inbound_message_time()` *(trigger fn)*
Espejo en `conversations.last_inbound_message_time`.

### `update_contact_full_name()` *(trigger fn)*
Concatena `first_name + last_name → name`.

### `check_message_exists_by_waha_id(p_waha_id text) → boolean`
Deduplicación de mensajes WAHA.

### `increment_usage(p_user_id, p_resource_type, p_amount=1)`
Upsert idempotente en `user_usage` por mes corriente.

### `get_unread_count(user_uuid uuid) → integer`
Suma `unread_count` por owner.

### Reportes
- `get_messages_by_hour(user_id, start_date)` → `(hour, incoming, outgoing)`.
- `get_conversations_by_hour(user_id, start_date)` → `(hour, new_count, recurring_count)`.
- `get_messages_heatmap(user_id, start_date)` → `(day_of_week, hour, msg_count)`.
- `get_conversion_rate(user_id)` → `(total_leads, qualified_leads)`.

### `update_updated_at_column()` / `update_internal_messages_updated_at()` / `update_contact_details_updated_at()` / `update_timestamp()`
Setean `NEW.updated_at = now()`.

---

## 6. Triggers

```sql
-- Auth
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Workspace inicial
CREATE TRIGGER on_user_created_setup_workspace
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.setup_default_workspace_and_funnel();

-- Asignación automática (v3.3)
CREATE TRIGGER trg_conversation_auto_assign
  AFTER INSERT ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.on_conversation_insert_assign();

-- Sync de inbound timestamps
CREATE TRIGGER trg_update_lead_inbound
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_lead_on_inbound_message();

CREATE TRIGGER trg_update_conv_inbound
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_last_inbound_message_time();

-- Nombre completo de contactos
CREATE TRIGGER trg_contact_full_name
  BEFORE INSERT OR UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_contact_full_name();

-- updated_at en cada tabla relevante
CREATE TRIGGER set_timestamp_<tabla>
  BEFORE UPDATE ON public.<tabla>
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

---

## 7. Políticas RLS (resumen por tabla)

Patrón general:

```sql
ALTER TABLE public.<t> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage account <t>"
  ON public.<t> FOR ALL
  USING (user_id = get_account_owner_id(auth.uid()))
  WITH CHECK (user_id = get_account_owner_id(auth.uid()));

CREATE POLICY "Superadmins can view all <t>"
  ON public.<t> FOR SELECT
  USING (has_role(auth.uid(), 'superadmin'));
```

Aplicado a: `conversations`, `messages`, `leads`, `lead_columns`, `contacts`, `contact_details`, `contact_lists`, `contact_sales`, `mass_campaigns`, `campaign_sends`, `ai_agents`, `ai_api_keys`, `column_message_triggers`, `automated_message_logs`, `scheduled_messages`, `casino_api_configs`, `quick_replies`, `landing_chat_*`, `facebook_connections`, `products`, `sales`, `contacto_bloqueado_bot`, `audit_logs`.

**Casos especiales**:
- `agent_presence`: `user_id = auth.uid()` (manage own) + `account_owner_id = get_account_owner_id(auth.uid())` (view account).
- `assignment_settings`: `account_owner_id = get_account_owner_id(auth.uid())`.
- `profiles`: `auth.uid() = id` para update; SELECT para mismos owner + superadmin.
- `internal_messages`: `auth.uid() = sender_id OR auth.uid() = receiver_id`.
- `permissions`, `role_permissions`, `payment_plans`, `payment_methods`, `system_status`: gestionadas solo por `superadmin`.
- `etiquetas`: SELECT amplio (mismo owner o sin organización), INSERT cualquier autenticado, UPDATE/DELETE solo creador o owner.
- `mensaje_landing`: INSERT público (anon+authenticated), SELECT/UPDATE/DELETE solo owner o superadmin.
- `ai_response_buffer`: SELECT por owner; INSERT/UPDATE abiertos (servicio interno).
- `ia_default_settings` / `ia_humanization_settings`: SELECT autenticados; UPDATE/INSERT solo `id=1` y autenticados.
- `tareas`: por rol admin/asignada/creado_por.

---

## 8. Storage buckets

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true);

CREATE POLICY "Public read chat-attachments"
  ON storage.objects FOR SELECT USING (bucket_id = 'chat-attachments');

CREATE POLICY "Authenticated upload chat-attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid() IS NOT NULL);
```

Estructura típica: `chat-attachments/{user_id}/{conversation_id}/{filename}`.

---

## 9. Realtime

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_sends;

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.agent_presence REPLICA IDENTITY FULL;
ALTER TABLE public.campaign_sends REPLICA IDENTITY FULL;
```

---

## 10. Edge Functions

| Función | verify_jwt | Propósito | Secrets |
|---|---|---|---|
| `admin-list-users` | ✓ | Lista usuarios de la cuenta (admin) | `SUPABASE_SERVICE_ROLE_KEY` |
| `admin-update-user` | ✓ | Actualiza email/pass de subusuario | `SUPABASE_SERVICE_ROLE_KEY` |
| `create-user` | ✓ | Crea cajero subordinado | `SUPABASE_SERVICE_ROLE_KEY` |
| `delete-user` | ✗ | Elimina subusuario validando jerarquía | `SUPABASE_SERVICE_ROLE_KEY` |
| `ai-agent-response` | ✗ | Responde con IA (legacy) | `GOOGLE_GEMINI_API_KEY` |
| `ia-default-agent` | ✗ | Flujo casino Gemini 2.5 Flash | `GOOGLE_GEMINI_API_KEY`, `LOVABLE_API_KEY` |
| `process-ai-buffer` | ✗ | Cron que vacía `ai_response_buffer` | `GOOGLE_GEMINI_API_KEY` |
| `process-scheduled-messages` | ✗ | Cron que envía `scheduled_messages` | `WAHA_*`, `SUPABASE_SERVICE_ROLE_KEY` |
| `send-mass-campaign` | ✓ | Disparo de campañas masivas multi-sesión | `WAHA_*`, `SUPABASE_SERVICE_ROLE_KEY` |
| `mercadopago-webhook` | ✗ | Webhook de MercadoPago | — |
| `n8n-response` | ✗ | Recibe respuesta desde n8n | — |
| **WAHA** | | | |
| `waha-create-session` | ✓ | Crea sesión WhatsApp | `WAHA_BASE_URL`, `WAHA_API_KEY` |
| `waha-delete-session` | ✓ | Borra sesión | `WAHA_*` |
| `waha-session-status` | ✓ | Estado de sesión | `WAHA_*` |
| `waha-get-qr` | ✓ | QR code | `WAHA_*` |
| `waha-send-message` | ✗ | Envía texto | `WAHA_*` |
| `waha-send-file` | ✗ | Envía adjunto | `WAHA_*` |
| `waha-get-file` | ✓ | Descarga adjunto autenticado | `WAHA_*` |
| `waha-webhook` | ✗ | Recibe eventos de WAHA | `WAHA_*`, `GOOGLE_GEMINI_API_KEY` |
| **Twilio** | | | |
| `twilio-webhook` | ✗ | Inbound de Twilio | — |
| `twilio-send-message` | ✗ | Envía SMS/WhatsApp | — |
| `twilio-send-file` | ✗ | Envía media | — |
| `twilio-get-file` | ✓ | Descarga media autenticada | — |
| `twilio-ai-agent-response` | ✗ | Respuesta IA específica Twilio | `GOOGLE_GEMINI_API_KEY` |
| `twilio-verify-credentials` | ✗ | Test de credenciales | — |
| **Telegram** | | | |
| `telegram-bot-webhook` | ✗ | Recibe updates de Telegram | — |
| `telegram-send-message` | ✗ | Envía texto | — |
| `telegram-send-file` | ✗ | Envía adjunto | — |
| **Facebook / Instagram** | | | |
| `facebook-oauth-callback` | ✗ | OAuth callback Meta | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` |
| `facebook-instagram-webhook` | ✗ | Webhook unificado Meta | `FACEBOOK_VERIFY_TOKEN`, `FACEBOOK_APP_SECRET` |
| `facebook-send-message` | ✗ | Envía mensajes a FB/IG | — |
| **Web Chat** | | | |
| `web-chat-widget` | ✗ | Sirve widget JS público | — |
| `web-chat-widget-embedded` | ✗ | Variante embebida | — |
| `web-chat-message` | ✗ | Recibe mensaje del widget | `GOOGLE_GEMINI_API_KEY` |
| `web-chat-send` | ✓ | Envía respuesta del agente | — |
| `web-chat-poll` | ✗ | Polling de mensajes nuevos | — |

Endpoint público: `https://<project_ref>.supabase.co/functions/v1/<function-name>`.

---

## 11. Secrets requeridos

| Secret | Uso |
|---|---|
| `SUPABASE_URL` | Auto |
| `SUPABASE_ANON_KEY` / `SUPABASE_PUBLISHABLE_KEY` | Auto |
| `SUPABASE_SERVICE_ROLE_KEY` | Operaciones admin en edge functions |
| `SUPABASE_DB_URL` | Conexión Postgres directa (cron) |
| `WAHA_BASE_URL` | URL de la instancia WAHA |
| `WAHA_API_KEY` | Auth de WAHA |
| `GOOGLE_GEMINI_API_KEY` | Gemini 2.5 Flash |
| `LOVABLE_API_KEY` | Lovable AI Gateway |
| `FACEBOOK_APP_ID` | OAuth Meta |
| `FACEBOOK_APP_SECRET` | Firmar webhooks Meta |
| `FACEBOOK_VERIFY_TOKEN` | Verificación de webhook Meta |

---

## 12. Seeds mínimos

```sql
-- Singletons de configuración
INSERT INTO public.ia_default_settings (id, cbu, cashier_numbers, is_enabled, casino_link)
VALUES (1, '', '', false, 'https://bet32.fun/')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ia_humanization_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Plan gratuito mínimo
INSERT INTO public.payment_plans (name, price, currency, billing_period, is_active, limits, features)
VALUES ('Free', 0, 'USD', 'monthly', true,
  '{"contacts":100,"conversations":50,"campaigns":1}'::jsonb,
  '["1 sesión WhatsApp","Sin IA"]'::jsonb);

-- Catálogo de permisos (ejemplo, completar todos los puede_*)
INSERT INTO public.permissions (name, category, description) VALUES
  ('puede_ver_chats', 'chats', 'Ver listado de conversaciones'),
  ('puede_enviar_mensajes', 'chats', 'Enviar mensajes'),
  ('puede_ver_dashboard', 'dashboard', 'Ver dashboard'),
  ('puede_gestionar_usuarios', 'admin', 'Gestionar usuarios subordinados')
  -- ... resto
ON CONFLICT DO NOTHING;
```

---

## 13. Webhooks externos a configurar

| Servicio | URL a registrar |
|---|---|
| WAHA | `https://<ref>.supabase.co/functions/v1/waha-webhook` |
| Twilio | `https://<ref>.supabase.co/functions/v1/twilio-webhook` |
| Telegram BotFather | `https://<ref>.supabase.co/functions/v1/telegram-bot-webhook` (set vía `setWebhook`) |
| Meta (Messenger + Instagram) | `https://<ref>.supabase.co/functions/v1/facebook-instagram-webhook` con `FACEBOOK_VERIFY_TOKEN` |
| MercadoPago | `https://<ref>.supabase.co/functions/v1/mercadopago-webhook` |

---

## 14. Pasos de instalación (clonado completo)

1. **Crear proyecto Supabase** nuevo y anotar `project_ref`, `anon_key`, `service_role_key`.
2. **Habilitar extensiones** necesarias: `pgcrypto` (UUID), `pg_cron` opcional para schedulers.
3. **Ejecutar DDL** de la sección 4 (puede correrse como migración única).
4. **Crear enums** de la sección 3 antes que las tablas que los referencian.
5. **Crear funciones SQL** de la sección 5 y triggers de la sección 6.
6. **Habilitar RLS** y aplicar políticas de la sección 7 en todas las tablas.
7. **Crear bucket** `chat-attachments` (sección 8) y sus policies.
8. **Activar Realtime** sobre las tablas de la sección 9.
9. **Cargar secrets** de la sección 11 en *Project Settings → Edge Functions → Secrets*.
10. **Desplegar edge functions** (todas las carpetas bajo `supabase/functions/`). En Lovable se hace automáticamente al guardar.
11. **Aplicar `supabase/config.toml`** con los flags `verify_jwt` correctos por función.
12. **Cargar seeds** de la sección 12.
13. **Configurar webhooks externos** (sección 13) en cada proveedor.
14. **Crear primer superadmin**: registrar usuario, luego:
    ```sql
    UPDATE public.profiles SET profile_type='superadmin' WHERE email='admin@tu-dominio.com';
    INSERT INTO public.user_roles(user_id, role)
      SELECT id, 'superadmin' FROM public.profiles WHERE email='admin@tu-dominio.com';
    ```
15. **Conectar canales** desde la UI: WhatsApp QR, Twilio, Telegram, FB/IG, Web Chat.

---

## Versionado

- **v3.3 (21-04-26)** — Sistema de asignación de conversaciones a cajeros con `agent_presence`, `assignment_settings`, auto-asignación round-robin/least_load. Documentación de backend completa.
- **v3.1 (30-03-26)** — Hardening de seguridad fase 1-2: service_role removido del frontend, RLS en `mensaje_landing`, índices compuestos.
