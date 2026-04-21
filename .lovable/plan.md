

# Plan: Mejoras al sistema + documentación de backend + bump v3.3

## Parte 1 — Actualización de versión a v3.3 21-04-26

Reemplazar el string `Versión 3.1 30-03-26` por `Versión 3.3 21-04-26` en los 3 lugares donde aparece:
- `src/pages/Login.tsx` (línea 163)
- `src/components/layout/Sidebar.tsx` (línea 249)
- `src/components/layout/AdminLayout.tsx` (línea 184)

## Parte 2 — Documentación completa del backend

Crear `docs/BACKEND.md` (markdown único, autocontenido) con todo lo necesario para clonar el proyecto en una BD nueva:

1. **Resumen arquitectónico** — modelo multi-tenant (account_owner_id), jerarquía 3-tier (superadmin/cliente/cajero), canales soportados.
2. **Diagrama ER simplificado** en ASCII (conversations ↔ messages ↔ leads ↔ contacts ↔ profiles).
3. **DDL completo** de las ~40 tablas con columnas, tipos, defaults y nullables (incluyendo las nuevas: `agent_presence`, `assignment_settings`, columnas `assigned_to/at/by` en conversations).
4. **Enums y tipos custom**: `app_role`, `profile_type`.
5. **Funciones SQL** (todas las que aparecen en `<db-functions>`): `get_account_owner_id`, `has_role`, `auto_assign_conversation`, `handle_new_user`, `setup_default_workspace_and_funnel`, `increment_usage`, `get_unread_count`, `get_messages_by_hour`, `get_conversations_by_hour`, `get_messages_heatmap`, `get_conversion_rate`, `update_lead_on_inbound_message`, `update_last_inbound_message_time`, `check_message_exists_by_waha_id`, `update_contact_full_name`, `update_*_updated_at`.
6. **Triggers**: `on_auth_user_created`, `on_user_created_setup_workspace`, `trg_conversation_auto_assign`, `trg_update_lead_inbound`, `trg_contact_full_name`, etc.
7. **Políticas RLS** completas por tabla (las que ya están en el contexto).
8. **Storage buckets**: `chat-attachments` (público) y rutas esperadas.
9. **Realtime**: tablas con REPLICA IDENTITY FULL (`messages`, `conversations`, `agent_presence`, `campaign_sends`).
10. **Edge Functions** (lista completa de las ~40 funciones de `supabase/functions/`) con: nombre, propósito en una línea, `verify_jwt` (de config.toml), variables de entorno usadas, endpoint público.
11. **Secrets requeridos**: `WAHA_API_KEY`, `WAHA_BASE_URL`, `GOOGLE_GEMINI_API_KEY`, `LOVABLE_API_KEY`, `FACEBOOK_APP_ID/SECRET/VERIFY_TOKEN`, `SUPABASE_*`.
12. **Seeds mínimos**: filas iniciales de `permissions`, `payment_plans`, `ia_default_settings (id=1)`, `ia_humanization_settings (id=1)`.
13. **Webhooks externos** a configurar: WAHA → `waha-webhook`, Twilio → `twilio-webhook`, Telegram → `telegram-bot-webhook`, Meta → `facebook-instagram-webhook`, MercadoPago → `mercadopago-webhook`.
14. **Pasos de instalación** en orden: crear proyecto Supabase → ejecutar DDL → crear funciones/triggers → aplicar RLS → crear bucket → cargar secrets → desplegar edge functions → seeds → conectar canales.

Archivo entregado en `/mnt/documents/BACKEND.md` como artefacto descargable, **y** copia en el repo en `docs/BACKEND.md` para que viaje con el código.

## Parte 3 — Mejoras propuestas para hacer el sistema más útil

Lista priorizada. Implemento solo las que apruebes; este plan únicamente las describe.

### Alta prioridad (impacto directo en operación diaria)

1. **Notificaciones de escritorio + sonido para mensajes nuevos** — alerta al cajero cuando llega una conversación asignada a él, incluso con la pestaña en background. Hoy depende de mirar la lista.
2. **SLA / tiempo de primera respuesta** — medir tiempo entre `last_inbound_message_time` y la primera respuesta del cajero; mostrar badge rojo en conversaciones sin responder >X min y reporte semanal por cajero.
3. **Reasignación masiva + transferencia entre cajeros** — botón "Transferir a otro agente" en el chat con nota opcional; útil cuando un cajero sale de turno.
4. **Auto-reasignación al desconectarse** — si un cajero pasa a `offline` con conversaciones activas sin respuesta, redistribuirlas automáticamente al resto online.
5. **Búsqueda global de conversaciones/mensajes** — buscar por contenido, teléfono, nombre, casino_username. Hoy hay que scrollear.
6. **Plantillas de respuesta por categoría + variables** — extender quick replies con `{nombre}`, `{usuario_casino}`, `{cbu}` que se sustituyen al enviar.

### Media prioridad (calidad de vida y retención)

7. **Tags/etiquetas visibles en la lista de conversaciones** — colorear/filtrar por etiqueta sin abrir cada chat.
8. **Notas internas en la conversación** — mensajes solo visibles para el equipo, no enviados al contacto. Útil para handoff.
9. **Historial de asignaciones por conversación** — quién la tomó, cuándo se transfirió, motivo.
10. **Dashboard por cajero** — conversaciones atendidas, ventas cerradas, tiempo promedio, ranking del mes.
11. **Modo "ausente automático"** — si no hay actividad del cajero en X minutos, pasar a `away` y dejar de recibir auto-asignaciones.
12. **Recordatorios programados sobre una conversación** — "recordame este chat en 2 h" → notificación al cajero.

### Baja prioridad (nice-to-have)

13. **Exportar conversación a PDF** para compartir con el cliente.
14. **Atajos de teclado globales** — `J/K` navegar conversaciones, `R` responder, `A` asignar.
15. **Métricas de IA** — tasa de handoff IA→humano, satisfacción inferida, costo por conversación.
16. **Webhook saliente configurable** — disparar a un endpoint externo cuando se cierra una venta o llega lead nuevo.

## Detalles técnicos

- La doc se genera estáticamente leyendo `<supabase-tables>`, `<db-functions>` y `supabase/config.toml` ya disponibles en contexto + `code--list_dir supabase/functions`. No necesita consultas a la BD.
- El bump de versión es 3 ediciones puntuales con `code--line_replace`, idénticas en estructura.
- Las mejoras de Parte 3 son **catálogo para que elijas**. No se implementa ninguna en este turno; cuando indiques cuáles querés, hago un plan dedicado por feature.

