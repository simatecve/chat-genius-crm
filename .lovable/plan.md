

# Plan: Eliminar respuesta "OK" del webhook Twilio

## Problema

El webhook de Twilio actualmente responde con el texto `"OK"` en el body de la respuesta HTTP. Esto es innecesario — Twilio solo necesita un status code 200 con body vacío (o TwiML vacío). Otras plataformas no envían este texto de vuelta.

## Cambios

**Archivo:** `supabase/functions/twilio-webhook/index.ts`

Reemplazar todas las respuestas `new Response('OK', ...)` por `new Response(null, ...)` con status 200 y sin body:

| Línea | Actual | Nuevo |
|-------|--------|-------|
| 487 | `return new Response('OK', { status: 200, headers: corsHeaders });` | `return new Response(null, { status: 200, headers: corsHeaders });` |
| 508 | `return new Response('OK', { status: 200, headers: corsHeaders });` | `return new Response(null, { status: 200, headers: corsHeaders });` |
| 649-652 | `return new Response('OK', { status: 200, headers: {...} });` | `return new Response(null, { status: 200, headers: corsHeaders });` |
| 656-658 | `return new Response('OK', { status: 200, headers: corsHeaders });` | `return new Response(null, { status: 200, headers: corsHeaders });` |

Son 4 ocurrencias en total. Se reemplaza `'OK'` por `null` en todas. El webhook seguirá respondiendo con HTTP 200 (que es lo que Twilio necesita) pero sin enviar contenido en el body.

