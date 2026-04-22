
# Plan para agregar Alertas de consumo, recomendaciones por lead y costos por cajero

## Objetivo

Agregar una capa operativa de control de costos para que cada cuenta pueda:

- Configurar umbrales mensuales de consumo.
- Ver historial de alertas disparadas.
- Recibir recomendaciones de acción en el Dashboard.
- Recomendar el mejor canal según tipo de lead.
- Detectar cajeros/agentes con consumo excesivo.

## 1. Nueva pantalla en Configuración > Alertas de consumo

Agregar una nueva pestaña dentro de `Configuración` llamada **Alertas de consumo**.

Permitirá configurar:

- Umbral mensual de costo Twilio.
- Umbral mensual de mensajes Twilio.
- Umbral de consumo inusual de WhatsApp API.
- Umbral máximo de mensajes por cajero/agente.
- Porcentaje mínimo esperado de ahorro.
- Activar/desactivar cada alerta.
- Definir severidad: informativa, advertencia o crítica.

Ejemplo de configuración:

```text
Twilio costo mensual máximo: $150 USD
WhatsApp API consumo inusual: +40% vs período anterior
Mensajes por cajero máximo: 500 por mes
Ahorro mínimo esperado: 35%
```

Archivos principales:

- `src/pages/Settings.tsx`
- `src/components/settings/ConsumptionAlertsTab.tsx`
- `src/services/consumptionAlertsService.ts`
- `src/hooks/useConsumptionAlerts.ts`

## 2. Base de datos para configuración e historial

Crear migración Supabase con dos tablas nuevas.

### Tabla `consumption_alert_settings`

Guardará los umbrales por cuenta y, opcionalmente, por usuario/cajero.

Campos:

```text
id
account_owner_id
target_user_id nullable
twilio_monthly_cost_threshold
twilio_monthly_message_threshold
whatsapp_api_unusual_growth_percent
agent_monthly_message_threshold
minimum_savings_percent
enable_twilio_cost_alert
enable_whatsapp_api_unusual_alert
enable_agent_volume_alert
enable_low_savings_alert
created_at
updated_at
```

### Tabla `consumption_alert_history`

Guardará cada alerta disparada y la recomendación generada.

Campos:

```text
id
account_owner_id
target_user_id nullable
alert_type
severity
title
description
recommended_action
metric_value
threshold_value
period_start
period_end
metadata jsonb
is_read
created_at
```

RLS:

```text
account_owner_id = get_account_owner_id(auth.uid())
```

Esto mantiene la arquitectura actual de Superadmin > Client/Admin > Cajero y evita mezclar datos entre cuentas.

## 3. Motor de alertas inteligentes

Crear una lógica central que evalúe las métricas actuales contra los umbrales configurados.

Alertas a generar:

- Twilio supera costo mensual definido.
- Twilio supera mensajes mensuales definidos.
- WhatsApp API crece de forma inusual contra el período anterior.
- Un cajero/agente supera el volumen mensual permitido.
- El ahorro cae por debajo del mínimo esperado.
- Errores de envío recientes requieren revisión.

Cada alerta incluirá:

```text
Título
Descripción
Severidad
Métrica actual
Umbral configurado
Recomendación concreta
Fecha
Usuario/cajero relacionado si aplica
```

Ejemplo:

```text
Alerta: Twilio lleva $185.00 USD este mes.
Recomendación: migrar tráfico a WhatsApp API para ahorrar aproximadamente 30%.
```

Archivos:

- `src/services/consumptionAlertsService.ts`
- `src/services/reportsService.ts`
- `src/hooks/useConsumptionAlerts.ts`

## 4. Historial de alertas y recomendaciones en Dashboard

Agregar un panel en el Dashboard llamado **Alertas y recomendaciones**.

Mostrará:

- Últimas alertas disparadas.
- Severidad.
- Acción recomendada.
- Fecha.
- Cajero relacionado, si aplica.
- Botón para marcar como leída.
- Estado “sin alertas críticas” cuando todo está normal.

También reutilizará las alertas operativas existentes, pero ahora quedarán guardadas en historial y no solo calculadas en memoria.

Archivos:

- `src/components/dashboard/Dashboard.tsx`
- `src/hooks/useDashboard.tsx`
- `src/services/dashboardService.ts`
- `src/components/dashboard/ConsumptionAlertsPanel.tsx`

## 5. Recomendador de canal por tipo de lead

Crear reglas de recomendación usando:

- Tipo de lead:
  - Nuevo.
  - Caliente.
  - En seguimiento.
- Scoring derivado.
- Costos Twilio vs WhatsApp API.
- Disponibilidad de canales.
- Período seleccionado en reportes.
- Actividad reciente del lead.

Como no hay un campo único de scoring visible actualmente, se implementará un scoring derivado con señales existentes:

```text
Lead nuevo:
- creado recientemente
- columna o etiqueta contiene “nuevo”

Lead caliente:
- columna/etiqueta contiene “caliente”, “interesado”, “calificado”
- conversación reciente
- comprobante detectado
- alta actividad

Lead en seguimiento:
- columna/etiqueta contiene “seguimiento”
- última respuesta antigua
- pendiente de contacto
```

Recomendaciones ejemplo:

```text
Lead nuevo:
Canal recomendado: WhatsApp API
Motivo: menor costo para volumen alto.

Lead caliente:
Canal recomendado: WhatsApp QR o canal activo más confiable
Motivo: priorizar respuesta rápida y continuidad.

Lead en seguimiento:
Canal recomendado: WhatsApp API
Motivo: bajo costo para recontacto masivo.
```

Archivos:

- `src/lib/channelCosts.ts`
- `src/services/channelRecommendationService.ts`
- `src/services/reportsService.ts`
- `src/components/reports/LeadChannelRecommendationPanel.tsx`
- Opcionalmente integración visual en `src/pages/Leads.tsx` o panel de Reportes.

## 6. Panel de consumo y costos por cajero/agente

Ampliar el ranking de cajeros para mostrar costos estimados.

Métricas por agente:

- Mensajes enviados.
- Mensajes Twilio estimados.
- Mensajes WhatsApp API estimados.
- Costo Twilio.
- Costo WhatsApp API.
- Costo interno “Nuestro Sistema”.
- Costo total estimado.
- Ahorro estimado.
- Porcentaje sobre el total del equipo.
- Recomendación si envía demasiado.

Ejemplo:

```text
Cajero: Juan
Mensajes: 742
Twilio: 510 mensajes · $32.64 USD
WhatsApp API: 232 mensajes · $10.39 USD
Costo interno: $5.28 USD
Recomendación: derivar más tráfico a WhatsApp API.
```

Archivos:

- `src/components/reports/AgentPerformanceRanking.tsx`
- `src/components/reports/AgentCostPanel.tsx`
- `src/services/reportsService.ts`
- `src/hooks/useReports.ts`

## 7. Reportes: integración con período seleccionado

Los nuevos cálculos respetarán el rango seleccionado en Reportes:

- Hoy.
- 7 días.
- 30 días.
- Este mes.
- Rango personalizado.

Se usarán las tarifas centralizadas actuales:

```text
Twilio: $0.064
WhatsApp API: 30% menos que Twilio
Nuestro Sistema: 0.00445 * 1.60
```

Esto evita duplicar tarifas en diferentes componentes.

## 8. Flujo de guardado de alertas

Cuando el Dashboard o Reportes calculen una alerta:

1. Se revisa la configuración activa del usuario.
2. Se compara la métrica contra el umbral.
3. Si supera el umbral, se genera recomendación.
4. Se guarda en `consumption_alert_history`.
5. Se evita duplicar la misma alerta dentro del mismo período.
6. Se muestra en Dashboard.

Para evitar spam de alertas, se usará una clave lógica por período:

```text
account_owner_id + alert_type + target_user_id + period_start + period_end
```

## 9. Permisos y seguridad

- Solo usuarios admin/client podrán editar umbrales.
- Cajeros podrán ver alertas si tienen permisos de dashboard/reportes.
- Las tablas usarán RLS con `get_account_owner_id(auth.uid())`.
- No se guardarán roles en `profiles`.
- No se usará `service_role` en frontend.
- No se modificará manualmente `src/integrations/supabase/types.ts`.

## 10. Orden de implementación

1. Crear migración con tablas de configuración e historial.
2. Crear servicio de configuración de alertas.
3. Crear pestaña `Alertas de consumo` en Configuración.
4. Crear motor de evaluación de alertas.
5. Guardar historial evitando duplicados.
6. Agregar panel de alertas/recomendaciones al Dashboard.
7. Crear recomendador de canal por tipo de lead.
8. Agregar panel de recomendaciones por lead en Reportes.
9. Ampliar ranking de cajeros con costos estimados.
10. Validar que todo compile correctamente.

## Resultado esperado

El sistema quedará con una sección completa de control de consumo:

```text
Configuración > Alertas de consumo
- Twilio máximo mensual: $150 USD
- WhatsApp API consumo inusual: +40%
- Cajero máximo mensual: 500 mensajes

Dashboard
- Twilio lleva $185 USD este mes
- Recomendación: migrar tráfico a WhatsApp API
- Cajero Juan envió 742 mensajes
- Recomendación: revisar asignación o derivar campañas

Reportes
- Costo por cajero
- Ahorro por agente
- Canal recomendado por tipo de lead
```

Esto completa la parte avanzada del roadmap: alertas configurables, historial operativo, recomendaciones accionables y control de consumo por usuario.
