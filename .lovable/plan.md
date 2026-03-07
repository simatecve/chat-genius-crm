

# Plan: Optimizar inicio de sesión lento

## Diagnóstico

El problema tiene dos partes:

### 1. Cadena de dependencias excesiva al login
Después de autenticarse, el sistema ejecuta **3 queries secuenciales** antes de navegar:
- `useAuth` → obtiene user
- `useEffectiveUserId` → query a `profiles` para `parent_user_id`
- `useProfile` → **espera a que termine `useEffectiveUserId`**, luego hace otra query a `profiles`

Esto significa que hay **2 queries a `profiles` en serie** antes de poder navegar. Si Supabase responde lento (como ahora), el usuario queda en "Cargando..." indefinidamente.

### 2. Race condition en `signIn`
`useAuth.signIn()` hace `setLoading(false)` antes de que `onAuthStateChange` actualice el `user`, causando un flash donde el sistema piensa que no hay usuario.

## Cambios propuestos

### Archivo 1: `src/hooks/useProfile.tsx`
- Eliminar la dependencia de `useEffectiveUserId` para la carga del perfil del usuario logueado
- Usar directamente `user.id` de `useAuth` (ya lo hace, pero espera innecesariamente a que `useEffectiveUserId` termine de cargar)
- Agregar timeout de 10 segundos con error amigable para evitar loading infinito

### Archivo 2: `src/hooks/useAuth.tsx`  
- Eliminar el `setLoading(true/false)` dentro de `signIn()` — el `onAuthStateChange` ya maneja esto
- Esto evita la race condition donde `loading: false` se setea antes de tener el `user`

### Archivo 3: `src/pages/Login.tsx`
- Agregar timeout de seguridad: si después de 15 segundos el login sigue en "Iniciando sesión...", mostrar mensaje de error y permitir reintentar

## Detalle técnico

**useProfile.tsx** - Eliminar dependencia de `useEffectiveUserId`:
```typescript
// ANTES: depende de useEffectiveUserId (2 queries en serie)
const { effectiveUserId, isImpersonating, loading: userIdLoading } = useEffectiveUserId();
if (!user?.id || userIdLoading) { ... }

// DESPUÉS: usa user.id directamente (1 query)
const { user } = useAuth();
// useEffectiveUserId solo se usa para isImpersonating/effectiveUserId de retorno
```

**useAuth.tsx** - Fix race condition:
```typescript
// ANTES: setLoading dentro de signIn causa flash
const signIn = async (...) => {
  setLoading(true);  // ← pone loading true
  await signInWithPassword(...);
  setLoading(false);  // ← pone loading false ANTES de tener user
};

// DESPUÉS: dejar que onAuthStateChange maneje loading
const signIn = async (...) => {
  const { error } = await signInWithPassword(...);
  return { error };  // onAuthStateChange se encarga del rest
};
```

**Login.tsx** - Timeout de seguridad:
```typescript
// Agregar timeout para evitar loading infinito
useEffect(() => {
  if (isLoading) {
    const timeout = setTimeout(() => {
      setIsLoading(false);
      toast({ title: "Timeout", description: "..." });
    }, 15000);
    return () => clearTimeout(timeout);
  }
}, [isLoading]);
```

