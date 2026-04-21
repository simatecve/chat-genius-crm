

# Plan: Eliminar timeout fijo + retry automático en carga de perfil

## Problema
`useProfile` aborta a los 10 s con `TIMEOUT` y muestra la pantalla de error "No pudimos cargar tu perfil". Cuando la BD de Supabase está lenta o saturada (justo lo que vimos hoy con el error 544 "Connection terminated due to connection timeout"), cualquier hipo de red >10 s deja al usuario afuera y obliga a clickear Reintentar manualmente.

## Solución

### 1. `src/hooks/useProfile.tsx` — quitar el timeout duro y reintentar solo
- **Eliminar** el `Promise.race` con `TIMEOUT` de 10 s. La query queda corriendo hasta que Supabase responda (éxito o error real).
- **Agregar retry automático con backoff exponencial** ante errores de red/transitorios:
  - Intentos: ilimitados mientras la sesión esté activa.
  - Espera: 2s, 4s, 8s, 16s, 30s (tope 30s) entre intentos.
  - Reintenta solo si el error es de red/timeout/5xx. Si es "perfil no existe" (data null) o error de permisos (4xx), no reintenta.
- **Exponer `retrying: boolean` y `retryCount: number`** además de `loading` y `error`, para que el ProtectedRoute muestre "Reconectando… (intento N)" en vez del error.
- Mantener `refetchProfile()` para reintento manual (resetea el contador).
- Cancelar el loop al desmontar (`cancelled` flag ya existe).

### 2. `src/components/ProtectedRoute.tsx` — UX de reconexión persistente
- Mientras `retrying === true` (hay un intento en curso después del primer fallo), mostrar el spinner con texto "Reconectando con el servidor… (intento N)" en vez de la pantalla de error.
- La pantalla de error con botones Reintentar/Cerrar sesión solo aparece si el error es **no recuperable** (perfil inexistente, sesión inválida, 401/403). Nunca por timeout/red.
- Botón "Reintentar" sigue funcionando y resetea el backoff.

### 3. Misma lógica defensiva en otros puntos críticos (opcional, recomendado)
Revisar y aplicar el mismo patrón "sin timeout, con retry exponencial" en:
- `useEffectiveUserId` (si tiene timeout similar).
- `useAuth.getInitialSession` (hoy no tiene timeout pero conviene tolerar fallo inicial).

Solo si confirmás, agrego esto en el mismo cambio. Si no, dejo solo el perfil.

## Resultado esperado
- Si la BD está lenta 30 s o 2 min, el usuario ve "Reconectando…" y entra automáticamente cuando la BD responde — sin tocar nada.
- La pantalla de error solo aparece para problemas reales del perfil (no existe, sin permisos), no por hipos de red.
- Cero cambios visuales cuando todo funciona bien.

## Detalles técnicos
- Detección de "error transitorio": código de error Supabase `PGRST*` con status >=500, fetch `TypeError` (red caída), `AbortError`, o cualquier error sin código (caída de socket).
- El backoff usa `setTimeout` cancelable vía la flag `cancelled` ya existente, sin librerías nuevas.
- `reloadKey` se mantiene para forzar reset manual desde `refetchProfile`.

