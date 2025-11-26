# ⚠️ ACCIÓN REQUERIDA: Configurar Service Role Key

## Problema Actual
El sistema de creación de usuarios requiere el **service_role_key** correcto de Supabase para funcionar.

## Solución (3 pasos simples)

### 1. Obtener el Service Role Key
1. Ir a: https://supabase.com/dashboard/project/pxvembsxhwvpotydtiqa/settings/api
2. En la sección **Project API keys**, copiar el valor de **`service_role`** (secret)

### 2. Actualizar el archivo `.env`
Abrir el archivo `.env` en la raíz del proyecto y reemplazar:
```
VITE_SUPABASE_SERVICE_ROLE_KEY="TU_SERVICE_ROLE_KEY_AQUI"
```
Con el key que copiaste en el paso 1.

### 3. Reiniciar la aplicación
```bash
# Detener el servidor (Ctrl + C)
# Iniciar nuevamente
npm run dev
```

## Verificar que funciona
1. Ir a **Dashboard → Configuración → Usuarios**
2. Hacer clic en **+ Nuevo Usuario**
3. Completar el formulario y crear el usuario
4. Si aparece "Usuario creado exitosamente" ✅ está funcionando

## Sistema de Usuarios del CRM
- **Ubicación**: Dashboard → Configuración → Usuarios
- **Funcionalidad**: Crear usuarios autenticados con roles (superadmin, admin, user, cashier)
- **Tabla utilizada**: `profiles` + `user_roles` en Supabase
- **Permisos**: Sistema de permisos granular por rol

## ⚠️ Seguridad
- **NUNCA** compartir el `service_role_key` públicamente
- **NUNCA** subirlo a repositorios públicos
- Este key tiene privilegios de administrador total
