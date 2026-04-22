
# Plan: Recalcular costo promedio real de Twilio

## Objetivo
Actualizar la sección de **Costos** para que Twilio use un costo promedio real basado en el consumo de este mes:

- Mensajes Twilio: `3.122`
- Costo real aproximado: `200 USD`
- Costo promedio por mensaje:

```text
200 / 3122 = 0.06406 USD por mensaje
```

Actualmente Twilio está configurado en:

```ts
twilio: 0.0079
```

Ese valor genera:

```text
3122 × 0.0079 = 24.66 USD
```

Por eso el estimador queda muy por debajo del costo real.

---

## Cambio principal

Archivo:
- `src/components/settings/CostEstimatorTab.tsx`

Actualizar la tarifa de Twilio:

```ts
twilio: 0.0079
```

por:

```ts
twilio: 0.064
```

Esto hará que para `3.122` mensajes el cálculo sea aproximadamente:

```text
3122 × 0.064 = 199.81 USD
```

---

## Ajustes visuales en la sección de Costos

En la tarjeta de **Twilio**, agregar una nota clara:

```text
Promedio real actualizado: $0.064 USD por mensaje
```

Y opcionalmente:

```text
Basado en consumo real mensual aproximado
```

Así queda claro que no es una tarifa oficial fija, sino un promedio operativo real.

---

## Impacto en los cálculos

Se actualizarán automáticamente:

1. Tarjeta **Twilio**
   - Mostrará el costo estimado real usando `0.064 USD` por mensaje.

2. Comparativa de ahorro
   - El ahorro vs Twilio será mucho más alto y más cercano al costo real del mes.

3. Costos separados por canal
   - Se mantiene la separación actual:
     - Mensajes Twilio × tarifa Twilio real promedio.
     - Mensajes WhatsApp API × tarifa WhatsApp API.
     - Nuestro Sistema × tarifa interna.

---

## No se modificará

- No se cambiará el conteo de mensajes.
- No se cambiará WhatsApp API.
- No se cambiará la tarifa interna de “Nuestro Sistema”.
- No se modificarán tablas ni políticas de Supabase.
- No se tocarán embudos ni filtros de fechas.

## Resultado esperado

Cuando Twilio tenga `3.122` mensajes, el estimador mostrará aproximadamente:

```text
Twilio: $199.81 USD
```

en lugar de:

```text
Twilio: $24.66 USD
```

Esto alinea el estimador con el costo real aproximado reportado.
