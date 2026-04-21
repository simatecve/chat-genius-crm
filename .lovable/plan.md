

# Plan: Reducir tamaño de BD (~500 MB → estimado ~150 MB)

## Diagnóstico actual

| Tabla | Tamaño | % del total | Filas relevantes |
|---|---|---|---|
| `messages` | **210 MB** | ~70% | 359.751 (todo 2026) |
| `conversations` | 48 MB | 16% | ~28k |
| `leads` | 18 MB | 6% | ~30k (5.981 huérfanos viejos) |
| `contacts` | 9 MB | 3% | — |
| `contacto_bloqueado_bot` | 7 MB | 2% | 24.020 |
| Resto (auth, sistema) | ~7 MB | 3% | — |

Ya borraste 2025 antes. Lo único que queda son 4 meses de 2026 con volumen muy alto (~90k mensajes/mes promedio).

## Estrategia de limpieza (4 acciones)

### 1. Backup CSV antes de borrar (obligatorio, igual que la vez anterior)
Exporto a `/mnt/documents/`:
- `messages_pre_cleanup_2026-04-21.csv.gz`
- `conversations_pre_cleanup_2026-04-21.csv.gz`
- `leads_huerfanos_pre_cleanup_2026-04-21.csv`
- `contacto_bloqueado_bot_pre_cleanup_2026-04-21.csv`

### 2. Borrar mensajes de enero + febrero 2026
- **236.774 mensajes** → libera estimado **~135 MB** (tabla + índices).
- Conserva marzo y abril 2026 (123k mensajes, ~75 MB) → operación reciente intacta.
- Las **conversaciones se mantienen** (solo se borran los mensajes), así no perdés contactos ni embudos.

### 3. Limpiar `contacto_bloqueado_bot` antiguos
- Borrar registros de bloqueo > 90 días (la mayoría de los 24.020).
- Libera ~5-6 MB. Si un contacto vuelve a hablar y necesita ser bloqueado, se re-agrega.

### 4. Limpiar leads huérfanos viejos
- 5.981 leads sin conversación asociada y sin actividad en 60+ días.
- Libera ~3-4 MB en `leads` + reduce índices.

### 5. VACUUM FULL post-borrado
- Compacta físicamente las tablas y reconstruye índices.
- Sin esto, Postgres marca el espacio como "reusable" pero **no lo devuelve al disco**. Es el paso que realmente baja los MB que ve Supabase.

## Resultado esperado

| Después | Tamaño estimado |
|---|---|
| `messages` | ~75 MB (-135 MB) |
| `conversations` | ~48 MB (igual, sin cambios) |
| `leads` | ~14 MB (-4 MB) |
| `contacto_bloqueado_bot` | ~1.5 MB (-5.5 MB) |
| **Total BD** | **~150-180 MB** (de ~500 MB) |

Reducción aproximada: **65%**.

## Lo que NO toco

- Ningún mensaje de marzo/abril 2026.
- Ninguna conversación (todas siguen visibles, solo sin historial viejo de mensajes).
- Contactos, embudos, sesiones WhatsApp/Twilio/Telegram, configuración IA, plantillas, presencia de agentes, asignaciones — todo intacto.
- Auth/usuarios — nada.

## Detalles técnicos

- **Orden de ejecución**: 1) export CSV → 2) DELETE en orden (`messages` enero-feb → `contacto_bloqueado_bot` >90d → `leads` huérfanos viejos) → 3) `VACUUM FULL` por tabla.
- **`VACUUM FULL` bloquea la tabla** mientras se ejecuta. Para `messages` puede tardar 1-3 minutos durante los cuales no entrarán mensajes nuevos. Recomendable hacerlo en horario de baja actividad.
- **Alternativa más segura**: `VACUUM` (no FULL) + `REINDEX TABLE` no bloquean pero recuperan menos espacio. Si preferís cero downtime aviso y uso esta variante (recupera ~70% en lugar del 100%).
- **Irreversible** una vez ejecutado el commit del DELETE. Solo restauración vía CSV exportado.
- **Memoria**: actualizo `mem://constraints/data-preservation-complete` con esta segunda excepción autorizada (2026-04-21 fase 2).

## Advertencia

Esto **viola** la regla `mem://constraints/data-preservation-complete`. Procedo solo con tu confirmación explícita, igual que la operación anterior de 2025.

## Pregunta antes de ejecutar

Decime si querés:
- **A)** Plan completo (puntos 2+3+4 + VACUUM FULL) → máximo ahorro, ~3 min de bloqueo en `messages`.
- **B)** Conservador (solo punto 2 + VACUUM normal) → ahorro ~110 MB sin bloqueos.
- **C)** Ajustar el corte (ej. borrar solo enero y conservar febrero).

