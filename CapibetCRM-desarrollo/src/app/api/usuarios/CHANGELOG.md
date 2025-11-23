# Changelog - Módulo Usuarios

## Actualización de Estructura - Septiembre 2025

### Cambios en la Estructura de Datos

Se actualizó la estructura de la tabla `usuarios` para simplificar y normalizar los campos:

#### Estructura Anterior
```typescript
{
  id: uuid
  nombre_usuario: text
  correo_electronico: text
  telefono: text
  codigo_pais: text
  rol: text
  activo: boolean
  organizacion_id: uuid
  nombre_agencia: text      // ❌ Eliminado
  tipo_empresa: text        // ❌ Eliminado
  creado_en: timestamp
  actualizado_en: timestamp
}
```

#### Estructura Nueva
```typescript
{
  id: uuid
  nombre: text              // ✅ Renombrado de nombre_usuario
  telefono: text
  codigo_pais: text
  rol: text
  activo: boolean
  organizacion_id: uuid
  creado_en: timestamp
  actualizado_en: timestamp
}
```

### Archivos Modificados

#### API (Backend)
1. **`domain/usuario.ts`**
   - Actualizado `UsuarioData` interface: `nombre_usuario` → `nombre`
   - Actualizado `UsuarioResponse` interface: `nombre_usuario` → `nombre`
   - Eliminados campos: `correo_electronico`, `nombre_agencia`, `tipo_empresa`

2. **`route.ts`** (POST y GET)
   - Actualizada validación para campo `nombre`
   - Actualizado objeto `dataToSend` con nueva estructura

3. **`[id]/route.ts`** (GET, PATCH, DELETE)
   - Actualizado `allowedFields` para usar `nombre` en lugar de `nombre_usuario`

4. **`login/route.ts`**
   - Actualizado construcción de `usuarioCompleto` con campo `nombre`

5. **`register/route.ts`**
   - Actualizada validación y construcción de `usuarioData` con campo `nombre`
   - Eliminada referencia a `correo_electronico` en la tabla (se mantiene en Auth)

#### Servicios
6. **`userServices.ts`**
   - No requiere cambios (usa las interfaces actualizadas automáticamente)

#### Dashboard (Frontend)
7. **`configuracion/components/NuevoUsuarioModal.tsx`**
   - Actualizado para usar endpoint `registerExternalUser`
   - Removidos campos obsoletos del formulario
   - Actualizado objeto `userData` con nueva estructura

8. **`configuracion/components/EditarUsuarioModal.tsx`**
   - Simplificado formulario (eliminados campos de agencia y empresa)
   - Actualizado `dataToUpdate` con nueva estructura
   - Removida validación de email (no editable)

9. **`configuracion/components/SesionesTab.tsx`**
   - Actualizado tipo de estado de usuarios
   - Actualizado renderizado de `nombre`

10. **`configuracion/components/UsuariosTab.tsx`**
    - Actualizado renderizado de `nombre_usuario` → `nombre`

11. **`configuracion/components/ConfirmActivateModal.tsx`**
    - Actualizado renderizado de `nombre`

12. **`configuracion/components/ConfirmDeactivateModal.tsx`**
    - Actualizado renderizado de `nombre`

13. **`calendario/page.tsx`**
    - Actualizada interface `Usuario`
    - Actualizado renderizado y asignaciones

14. **`ventas/page.tsx`**
    - Actualizado renderizado de vendedor

15. **`chats/components/ContactInfoMenu.tsx`**
    - Actualizado renderizado de agente y vendedor

16. **`chats/components/VentaModal.tsx`**
    - Actualizado ordenamiento y renderizado de vendedores

### Notas Importantes

1. **Email de Usuario**: El campo `correo_electronico` ya no existe en la tabla `usuarios`. El email se maneja exclusivamente a través de Supabase Auth y se obtiene del objeto `user` en el login.

2. **Campos Empresariales**: Los campos `nombre_agencia` y `tipo_empresa` fueron eliminados. Si se necesita esta información, debería almacenarse en la tabla `organizaciones`.

3. **Compatibilidad**: Todos los componentes del dashboard fueron actualizados para reflejar la nueva estructura. No se requieren migraciones de datos existentes en el frontend.

4. **Validaciones**: Las validaciones en los formularios fueron actualizadas para reflejar solo los campos disponibles en la nueva estructura.

### Endpoints Actualizados

- ✅ `POST /api/usuarios` - Crear usuario
- ✅ `GET /api/usuarios` - Listar usuarios
- ✅ `GET /api/usuarios/[id]` - Obtener usuario
- ✅ `PATCH /api/usuarios/[id]` - Actualizar usuario
- ✅ `DELETE /api/usuarios/[id]` - Eliminar usuario
- ✅ `POST /api/usuarios/login` - Login
- ✅ `POST /api/usuarios/register` - Registro

### Testing Recomendado

1. Verificar registro de nuevos usuarios
2. Verificar login con usuarios existentes
3. Verificar edición de usuarios
4. Verificar visualización en todas las secciones del dashboard
5. Verificar asignación de usuarios en chats y ventas
