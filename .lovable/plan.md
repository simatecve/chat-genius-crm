
# Auditoría del plan aplicado y plan para completar lo pendiente

## Estado general

El plan fue aplicado parcialmente. Ya existen varias piezas importantes en Reportes, Dashboard y Chats, pero todavía faltan partes avanzadas para que el sistema cumpla el plan completo al 100%.

## Checklist del plan original

### 1. Panel de rentabilidad por canal
Estado: aplicado casi completo.

Ya existe:
- `src/components/reports/ChannelProfitabilityPanel.tsx`
- `getChannelProfitabilityStats` en `src/services/reportsService.ts`
- Integración en `src/pages/Reports.tsx`
- Mensajes Twilio.
- Mensajes WhatsApp API.
- Costo Twilio.
- Costo WhatsApp API.
- Costo Nuestro Sistema.
- Ahorro total.
- Ahorro diario.
- Canal más caro.
- Canal más rentable.
- Canal recomendado.
- Simulación Twilio vs WhatsApp API.

Ajuste pendiente recomendado:
- Centralizar las tarifas para que `CostEstimatorTab.tsx`, Reportes y Dashboard usen una sola fuente de verdad y no valores duplicados.

---

### 2. Alertas inteligentes de consumo
Estado: aplicado parcialmente.

Ya existe:
- Alerta cuando Twilio supera `$150 USD` en Reportes.
- Alerta similar en Dashboard.

Falta:
- Alerta por consumo inusual de WhatsApp API.
- Alerta por cajero/agente con demasiados mensajes.
- Alerta por campaña con costo alto.
- Alerta cuando el ahorro baja.
- Panel unificado de alertas.

---

### 3. Recomendador automático de canal
Estado: aplicado básico.

Ya existe:
- Recomendación básica hacia WhatsApp API por ser 30% menor que Twilio.

Falta:
- Recomendar según disponibilidad real:
  - Si Twilio está caro, sugerir WhatsApp API.
  - Si WhatsApp QR está desconectado, sugerir API.
  - Si WhatsApp API no está activo, sugerir canal alternativo.
  - Si Telegram/WebChat están activos, mostrarlos como respaldo.
- Mostrar recomendación en campañas.
- Mostrar recomendación en conversaciones.
- Mostrar recomendación en configuración de costos.

---

### 4. Dashboard ejecutivo mejorado
Estado: aplicado parcialmente.

Ya existe:
- Resumen ejecutivo de costos.
- Costo externo.
- Costo Nuestro Sistema.
- Ahorro estimado.
- Canal recomendado.
- Mensajes Twilio y WhatsApp API.

Falta:
- Conversaciones nuevas del día como métrica ejecutiva clara.
- Conversaciones respondidas por humanos.
- Conversaciones respondidas por IA.
- Tiempo promedio de respuesta.
- Cajeros activos.
- Embudos con más actividad.

---

### 5. Ranking de cajeros/agentes
Estado: aplicado parcialmente.

Ya existe:
- `AgentPerformanceRanking.tsx`
- Mensajes enviados.
- Conversaciones asignadas.
- Conversaciones pendientes.
- Última actividad.

Falta:
- Tiempo promedio de respuesta.
- Conversaciones cerradas.
- Clientes asignados.
- Actividad diaria.
- Ranking por productividad real, no solo por mensajes enviados.

---

### 6. Control de conversaciones sin responder
Estado: aplicado parcialmente.

Ya existe:
- Filtro “Sin responder” en Chats.
- Filtrado por `unread_count > 0`.
- Banner informativo.

Falta:
- Conversaciones sin respuesta después de X minutos.
- Conversaciones asignadas a cajeros offline.
- Conversaciones con IA apagada y sin humano activo.
- Filtros más específicos dentro de la bandeja.

---

### 7. Automatización de seguimiento
Estado: no aplicado todavía.

Existe base previa:
- Disparadores por columna.
- Mensajes programados.
- Logs de mensajes automatizados.

Falta implementar reglas nuevas:
- Si cliente no responde en 24 horas, programar seguimiento.
- Si conversación queda demasiado tiempo en una columna, avisar o enviar mensaje.
- Si se detecta intención de carga de fichas, marcar como urgente.
- Si el cliente envía comprobante, priorizar conversación.

---

### 8. Historial de costos por mes
Estado: no aplicado todavía.

Falta:
- Crear tabla de snapshots mensuales.
- Guardar por mes:
  - Mensajes Twilio.
  - Mensajes WhatsApp API.
  - Costo Twilio.
  - Costo WhatsApp API.
  - Costo Nuestro Sistema.
  - Ahorro generado.
- Mostrar historial en Reportes.

---

### 9. Mejoras en campañas masivas
Estado: aplicado parcialmente por funcionalidades existentes, pero no por costos.

Ya existe:
- Reporte de enviados, fallidos y pendientes.
- Advertencia por límite de Twilio.

Falta:
- Estimación de costo antes de enviar.
- Canal recomendado según precio.
- Simulación de gasto.
- Proyección de ahorro usando WhatsApp API.
- Pausar campaña si el costo supera un límite configurado.

---

### 10. Centro de salud del sistema
Estado: aplicado parcialmente.

Ya existe:
- `SystemHealthCenter.tsx`
- Estado de WhatsApp QR.
- Estado de WhatsApp API.
- Estado de Twilio.
- Estado de Telegram.
- Estado de WebChat.
- Último mensaje.
- Conversaciones pendientes.

Falta:
- Errores recientes de envío.
- Canales con problemas reales.
- Estado de IA.
- Estado de Realtime.
- Calcular correctamente conversaciones asignadas a cajeros offline; ahora está en `0` fijo.
- Mostrar recomendación operativa por canal.

---

# Plan para completar el 100% del roadmap

## Fase 1: Unificar tarifas y mejorar rentabilidad

1. Crear constantes compartidas de costos en una sola ubicación:
   - Twilio: `0.064`
   - WhatsApp API: `0.064 * 0.70`
   - Nuestro Sistema: `0.00445 * 1.60`

2. Reutilizar esas tarifas en:
   - `CostEstimatorTab.tsx`
   - `reportsService.ts`
   - `Dashboard.tsx`
   - campañas masivas.

3. Mejorar `ChannelProfitabilityPanel` para mostrar:
   - ahorro por día,
   - ahorro por semana,
   - ahorro por mes proyectado,
   - porcentaje de ahorro,
   - alerta cuando el ahorro baja.

## Fase 2: Completar alertas inteligentes

Agregar un bloque de alertas operativas en Reportes y Dashboard:

- Twilio alto:
  - si supera `$150 USD`.
- WhatsApp API inusual:
  - si crece más de cierto porcentaje frente al promedio del período.
- Cajero con exceso de mensajes:
  - si un agente supera un umbral configurable.
- Campaña costosa:
  - si una campaña proyecta gasto alto.
- Ahorro bajo:
  - si el ahorro esperado cae debajo de un porcentaje mínimo.

## Fase 3: Recomendador automático de canal real

Crear una función central:

```text
getRecommendedChannel({
  twilioCost,
  whatsappApiCost,
  whatsappQrActive,
  whatsappApiActive,
  twilioActive,
  telegramActive,
  campaignSize
})
```

Usarla en:
- Reportes.
- Dashboard.
- Configuración > Costos.
- Crear campaña masiva.
- Conversaciones.

La recomendación ya no será siempre “WhatsApp API”; dependerá de costo y disponibilidad real.

## Fase 4: Completar Dashboard ejecutivo

Agregar métricas nuevas al Dashboard:

- Conversaciones nuevas hoy.
- Respondidas por humano.
- Respondidas por IA.
- Tiempo promedio de respuesta.
- Mensajes por canal.
- Cajeros activos.
- Embudos con más actividad.
- Alertas operativas principales.

Esto requerirá extender `dashboardService.ts` y `useDashboard.tsx`.

## Fase 5: Completar ranking de cajeros

Ampliar `AgentPerformanceRanking` con:

- Tiempo promedio de respuesta.
- Conversaciones cerradas.
- Clientes asignados.
- Actividad diaria.
- Porcentaje de pendientes.
- Ordenamiento por rendimiento compuesto.

Usar:
- `messages.responded_by`
- `messages.created_at`
- `conversations.assigned_to`
- `conversations.unread_count`
- `agent_presence`

## Fase 6: Mejorar bandeja de conversaciones sin responder

Agregar filtros adicionales en Chats:

- Sin responder.
- Sin respuesta hace más de X minutos.
- Asignadas a cajero offline.
- IA apagada y sin humano activo.
- Urgentes por comprobante detectado.

Esto extenderá:
- `src/pages/Conversations.tsx`
- `src/components/conversations/ConversationList.tsx`

## Fase 7: Automatización de seguimiento

Implementar reglas automáticas usando la base existente de disparadores y mensajes programados:

- Seguimiento después de 24h sin respuesta.
- Aviso si lead queda demasiado tiempo en una columna.
- Priorización si detecta carga/fichas.
- Priorización si detecta comprobante.

No se eliminará data histórica.

Si requiere ejecución automática periódica, se agregará una Edge Function programada de Supabase para revisar reglas pendientes.

## Fase 8: Historial mensual de costos

Crear una tabla nueva de snapshots mensuales:

```text
monthly_channel_cost_snapshots
- id
- user_id
- month
- twilio_messages
- whatsapp_api_messages
- twilio_cost
- whatsapp_api_cost
- internal_cost
- external_cost
- total_savings
- created_at
```

Agregar RLS usando `get_account_owner_id()`.

Agregar vista en Reportes:
- historial mensual,
- evolución de ahorro,
- comparación mes contra mes.

## Fase 9: Campañas con simulador de costo

En `CreateMassCampaign.tsx` agregar:

- estimación de costo antes de guardar/enviar,
- costo según canal seleccionado,
- comparación Twilio vs WhatsApp API,
- canal recomendado,
- ahorro proyectado,
- alerta si Twilio sale caro,
- límite opcional para pausar campaña por costo.

En el resumen de campaña agregar:
- costo estimado,
- costo real según enviados,
- ahorro estimado,
- fallidos y pendientes ya existentes.

## Fase 10: Centro de salud completo

Mejorar `SystemHealthCenter` para incluir:

- conversaciones asignadas a cajeros offline calculadas correctamente,
- errores recientes de envío desde campañas/mensajes/logs,
- estado IA por sesiones activas,
- estado Realtime informativo,
- recomendación por canal,
- semáforos más precisos.

## Archivos principales a tocar

- `src/services/reportsService.ts`
- `src/services/dashboardService.ts`
- `src/hooks/useReports.ts`
- `src/hooks/useDashboard.tsx`
- `src/components/reports/ChannelProfitabilityPanel.tsx`
- `src/components/reports/AgentPerformanceRanking.tsx`
- `src/components/reports/SystemHealthCenter.tsx`
- `src/components/dashboard/Dashboard.tsx`
- `src/pages/Conversations.tsx`
- `src/components/conversations/ConversationList.tsx`
- `src/pages/CreateMassCampaign.tsx`
- `src/components/campaigns/CampaignSendSummaryModal.tsx`
- `src/components/settings/CostEstimatorTab.tsx`

## Cambios de base de datos necesarios

Para completar todo el plan sí hará falta una migración para:

1. Historial mensual de costos.
2. Opcionalmente configuración de umbrales de alertas.
3. Opcionalmente reglas avanzadas de seguimiento.

Las políticas RLS deberán respetar la estructura actual:

```text
user_id = get_account_owner_id(auth.uid())
```

## Resultado esperado final

El sistema quedará con:

- Reporte real de rentabilidad por canal.
- Alertas inteligentes completas.
- Recomendador automático basado en costo y disponibilidad.
- Dashboard ejecutivo operativo.
- Ranking real de cajeros.
- Control avanzado de conversaciones sin responder.
- Automatizaciones de seguimiento.
- Historial mensual de costos.
- Campañas con simulador de costo y ahorro.
- Centro de salud del sistema más confiable.
