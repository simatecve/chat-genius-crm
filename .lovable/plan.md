

# Plan: Simplificar Costos — Solo Twilio y WhatsApp API (sin regiones)

## Cambios en `src/components/settings/CostEstimatorTab.tsx`

### 1. Eliminar tarjetas por regiones
Quitar el mapeo `(Object.keys(REGION_LABELS) as RegionKey[]).map()` para WhatsApp normal y WhatsApp API. Solo dejar la tarjeta "Nuestro Sistema".

### 2. Agregar tarjeta de Twilio
Si existe costo de Twilio configurado (buscar en constants o definirlo), mostrar una tarjeta única "Twilio" con su costo. Si no existe constante Twilio, usar el valor estándar aproximado.

### 3. Agregar tarjeta única de WhatsApp API
Una sola tarjeta "WhatsApp API" con costo calculado como `COSTS.whatsapp * 0.60` (40% menos que el promedio de WhatsApp normal, o usar una media ponderada).

### 4. Simplificar comparativa de ahorro
Reemplazar la grilla actual que muestra 8 comparaciones (4 regiones × 2 tipos) por solo 2 comparaciones:
- vs Twilio
- vs WhatsApp API (40% menos)

### 5. Código a eliminar
- `REGION_LABELS` y el tipo `RegionKey`
- El mapeo de regiones en las tarjetas de costo
- El mapeo de regiones en la comparativa de ahorro
- `whatsappApiRates` por región, usar un solo valor

### 6. Costos a mantener
- `COSTS.internal` (Nuestro Sistema)
- `COSTS.twilio` (nuevo, o usar valor estándar)
- `COSTS.whatsappApi` = `COSTS.whatsappPromedio * 0.60`

## Resultado esperado
- Solo 3 tarjetas de costo: Nuestro Sistema, Twilio, WhatsApp API
- Comparativa de ahorro: solo vs Twilio y vs WhatsApp API
- Sin desgloses por Norteamérica, México, Latinoamérica, Europa
- Código más limpio y fácil de mantener

