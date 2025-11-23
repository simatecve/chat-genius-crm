-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES - CORREGIDO PARA SUPABASE
-- ============================================================================

-- ============================================================================
-- FUNCIONES HELPER (en schema public, no auth)
-- ============================================================================

-- Función para obtener el ID de organización del usuario actual
CREATE OR REPLACE FUNCTION public.user_organization_id()
RETURNS UUID AS $$
  SELECT organizacion_id FROM public.usuarios WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Función para verificar si el usuario es super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND rol = 'super_admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Función para verificar si el usuario es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND rol IN ('admin', 'super_admin')
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================================================

ALTER TABLE organizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE espacios_de_trabajo ENABLE ROW LEVEL SECURITY;
ALTER TABLE embudos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contactos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE etiquetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE respuestas_rapidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantilla_mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLÍTICAS: organizaciones
-- ============================================================================

CREATE POLICY "usuarios_ver_organizacion"
  ON organizaciones FOR SELECT
  USING (id = public.user_organization_id());

CREATE POLICY "superadmin_ver_organizaciones"
  ON organizaciones FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "superadmin_modificar_organizaciones"
  ON organizaciones FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "admin_actualizar_organizacion"
  ON organizaciones FOR UPDATE
  USING (id = public.user_organization_id() AND public.is_admin());

-- ============================================================================
-- POLÍTICAS: usuarios
-- ============================================================================

CREATE POLICY "usuarios_ver_usuarios_org"
  ON usuarios FOR SELECT
  USING (organizacion_id = public.user_organization_id());

CREATE POLICY "superadmin_ver_usuarios"
  ON usuarios FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "superadmin_modificar_usuarios"
  ON usuarios FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "admin_gestionar_usuarios_org"
  ON usuarios FOR ALL
  USING (organizacion_id = public.user_organization_id() AND public.is_admin());

-- ============================================================================
-- POLÍTICAS: espacios_de_trabajo
-- ============================================================================

CREATE POLICY "usuarios_ver_espacios"
  ON espacios_de_trabajo FOR SELECT
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "usuarios_crear_espacios"
  ON espacios_de_trabajo FOR INSERT
  WITH CHECK (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "usuarios_actualizar_espacios"
  ON espacios_de_trabajo FOR UPDATE
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "usuarios_eliminar_espacios"
  ON espacios_de_trabajo FOR DELETE
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

-- ============================================================================
-- POLÍTICAS: embudos
-- ============================================================================

CREATE POLICY "usuarios_ver_embudos"
  ON embudos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM espacios_de_trabajo
      WHERE espacios_de_trabajo.id = embudos.espacio_id
        AND espacios_de_trabajo.organizacion_id = public.user_organization_id()
    ) OR public.is_super_admin()
  );

CREATE POLICY "usuarios_crear_embudos"
  ON embudos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM espacios_de_trabajo
      WHERE espacios_de_trabajo.id = embudos.espacio_id
        AND espacios_de_trabajo.organizacion_id = public.user_organization_id()
    ) OR public.is_super_admin()
  );

CREATE POLICY "usuarios_actualizar_embudos"
  ON embudos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM espacios_de_trabajo
      WHERE espacios_de_trabajo.id = embudos.espacio_id
        AND espacios_de_trabajo.organizacion_id = public.user_organization_id()
    ) OR public.is_super_admin()
  );

CREATE POLICY "usuarios_eliminar_embudos"
  ON embudos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM espacios_de_trabajo
      WHERE espacios_de_trabajo.id = embudos.espacio_id
        AND espacios_de_trabajo.organizacion_id = public.user_organization_id()
    ) OR public.is_super_admin()
  );

-- ============================================================================
-- POLÍTICAS: contactos
-- ============================================================================

CREATE POLICY "usuarios_ver_contactos"
  ON contactos FOR SELECT
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "usuarios_crear_contactos"
  ON contactos FOR INSERT
  WITH CHECK (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "usuarios_actualizar_contactos"
  ON contactos FOR UPDATE
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "usuarios_eliminar_contactos"
  ON contactos FOR DELETE
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

-- ============================================================================
-- POLÍTICAS: sesiones
-- ============================================================================

CREATE POLICY "usuarios_ver_sesiones"
  ON sesiones FOR SELECT
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "usuarios_crear_sesiones"
  ON sesiones FOR INSERT
  WITH CHECK (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "usuarios_actualizar_sesiones"
  ON sesiones FOR UPDATE
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "usuarios_eliminar_sesiones"
  ON sesiones FOR DELETE
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

-- ============================================================================
-- POLÍTICAS: whatsapp_sessions
-- ============================================================================

CREATE POLICY "usuarios_ver_whatsapp"
  ON whatsapp_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sesiones
      WHERE sesiones.id = whatsapp_sessions.sesion_id
        AND sesiones.organizacion_id = public.user_organization_id()
    ) OR public.is_super_admin()
  );

CREATE POLICY "usuarios_modificar_whatsapp"
  ON whatsapp_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sesiones
      WHERE sesiones.id = whatsapp_sessions.sesion_id
        AND sesiones.organizacion_id = public.user_organization_id()
    ) OR public.is_super_admin()
  );

-- ============================================================================
-- POLÍTICAS: chats
-- ============================================================================

CREATE POLICY "usuarios_ver_chats"
  ON chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sesiones
      WHERE sesiones.id = chats.sesion_id
        AND sesiones.organizacion_id = public.user_organization_id()
    ) OR public.is_super_admin()
  );

CREATE POLICY "usuarios_crear_chats"
  ON chats FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sesiones
      WHERE sesiones.id = chats.sesion_id
        AND sesiones.organizacion_id = public.user_organization_id()
    ) OR public.is_super_admin()
  );

CREATE POLICY "usuarios_actualizar_chats"
  ON chats FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sesiones
      WHERE sesiones.id = chats.sesion_id
        AND sesiones.organizacion_id = public.user_organization_id()
    ) OR public.is_super_admin()
  );

CREATE POLICY "usuarios_eliminar_chats"
  ON chats FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sesiones
      WHERE sesiones.id = chats.sesion_id
        AND sesiones.organizacion_id = public.user_organization_id()
    ) OR public.is_super_admin()
  );

-- ============================================================================
-- POLÍTICAS: mensajes
-- ============================================================================

CREATE POLICY "usuarios_ver_mensajes"
  ON mensajes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chats
      JOIN sesiones ON sesiones.id = chats.sesion_id
      WHERE chats.id = mensajes.chat_id
        AND sesiones.organizacion_id = public.user_organization_id()
    ) OR public.is_super_admin()
  );

CREATE POLICY "usuarios_crear_mensajes"
  ON mensajes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      JOIN sesiones ON sesiones.id = chats.sesion_id
      WHERE chats.id = mensajes.chat_id
        AND sesiones.organizacion_id = public.user_organization_id()
    ) OR public.is_super_admin()
  );

-- ============================================================================
-- POLÍTICAS: etiquetas
-- ============================================================================

CREATE POLICY "usuarios_ver_etiquetas"
  ON etiquetas FOR SELECT
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "usuarios_crear_etiquetas"
  ON etiquetas FOR INSERT
  WITH CHECK (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "usuarios_actualizar_etiquetas"
  ON etiquetas FOR UPDATE
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "usuarios_eliminar_etiquetas"
  ON etiquetas FOR DELETE
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

-- ============================================================================
-- POLÍTICAS: respuestas_rapidas
-- ============================================================================

CREATE POLICY "usuarios_ver_respuestas"
  ON respuestas_rapidas FOR SELECT
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "usuarios_crear_respuestas"
  ON respuestas_rapidas FOR INSERT
  WITH CHECK (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "usuarios_actualizar_respuestas"
  ON respuestas_rapidas FOR UPDATE
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "usuarios_eliminar_respuestas"
  ON respuestas_rapidas FOR DELETE
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

-- ============================================================================
-- POLÍTICAS: plantilla_mensajes
-- ============================================================================

CREATE POLICY "usuarios_ver_plantillas"
  ON plantilla_mensajes FOR SELECT
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "usuarios_crear_plantillas"
  ON plantilla_mensajes FOR INSERT
  WITH CHECK (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "usuarios_actualizar_plantillas"
  ON plantilla_mensajes FOR UPDATE
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "usuarios_eliminar_plantillas"
  ON plantilla_mensajes FOR DELETE
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

-- ============================================================================
-- POLÍTICAS: tareas
-- ============================================================================

CREATE POLICY "usuarios_ver_tareas"
  ON tareas FOR SELECT
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "usuarios_crear_tareas"
  ON tareas FOR INSERT
  WITH CHECK (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "usuarios_actualizar_tareas"
  ON tareas FOR UPDATE
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "usuarios_eliminar_tareas"
  ON tareas FOR DELETE
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

-- ============================================================================
-- POLÍTICAS: productos
-- ============================================================================

CREATE POLICY "usuarios_ver_productos"
  ON productos FOR SELECT
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "usuarios_crear_productos"
  ON productos FOR INSERT
  WITH CHECK (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "usuarios_actualizar_productos"
  ON productos FOR UPDATE
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "usuarios_eliminar_productos"
  ON productos FOR DELETE
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

-- ============================================================================
-- POLÍTICAS: ventas
-- ============================================================================

CREATE POLICY "usuarios_ver_ventas"
  ON ventas FOR SELECT
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "usuarios_crear_ventas"
  ON ventas FOR INSERT
  WITH CHECK (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "usuarios_actualizar_ventas"
  ON ventas FOR UPDATE
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "usuarios_eliminar_ventas"
  ON ventas FOR DELETE
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

-- ============================================================================
-- POLÍTICAS: notificaciones
-- ============================================================================

CREATE POLICY "usuarios_ver_notificaciones"
  ON notificaciones FOR SELECT
  USING (usuario_id = auth.uid() OR public.is_super_admin());

CREATE POLICY "sistema_crear_notificaciones"
  ON notificaciones FOR INSERT
  WITH CHECK (true);

CREATE POLICY "usuarios_actualizar_notificaciones"
  ON notificaciones FOR UPDATE
  USING (usuario_id = auth.uid() OR public.is_super_admin());

CREATE POLICY "usuarios_eliminar_notificaciones"
  ON notificaciones FOR DELETE
  USING (usuario_id = auth.uid() OR public.is_super_admin());

-- ============================================================================
-- POLÍTICAS: subscription_plans
-- ============================================================================

CREATE POLICY "todos_ver_planes_activos"
  ON subscription_plans FOR SELECT
  USING (activo = true OR public.is_super_admin());

CREATE POLICY "superadmin_modificar_planes"
  ON subscription_plans FOR ALL
  USING (public.is_super_admin());

-- ============================================================================
-- POLÍTICAS: organization_subscriptions
-- ============================================================================

CREATE POLICY "usuarios_ver_suscripcion"
  ON organization_subscriptions FOR SELECT
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "superadmin_modificar_suscripciones"
  ON organization_subscriptions FOR ALL
  USING (public.is_super_admin());

-- ============================================================================
-- POLÍTICAS: user_permissions
-- ============================================================================

CREATE POLICY "usuarios_ver_permisos_propios"
  ON user_permissions FOR SELECT
  USING (usuario_id = auth.uid() OR public.is_super_admin());

CREATE POLICY "admin_ver_permisos_org"
  ON user_permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u1, usuarios u2
      WHERE u1.id = auth.uid()
        AND u2.id = user_permissions.usuario_id
        AND u1.organizacion_id = u2.organizacion_id
        AND u1.rol IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "admin_modificar_permisos"
  ON user_permissions FOR ALL
  USING (
    public.is_super_admin() OR
    EXISTS (
      SELECT 1 FROM usuarios u1, usuarios u2
      WHERE u1.id = auth.uid()
        AND u2.id = user_permissions.usuario_id
        AND u1.organizacion_id = u2.organizacion_id
        AND u1.rol = 'admin'
    )
  );

-- ============================================================================
-- POLÍTICAS: usage_tracking
-- ============================================================================

CREATE POLICY "usuarios_ver_uso"
  ON usage_tracking FOR SELECT
  USING (organizacion_id = public.user_organization_id() OR public.is_super_admin());

CREATE POLICY "superadmin_modificar_tracking"
  ON usage_tracking FOR ALL
  USING (public.is_super_admin());

-- ============================================================================
-- POLÍTICAS: audit_logs
-- ============================================================================

CREATE POLICY "superadmin_ver_audit"
  ON audit_logs FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "sistema_crear_audit"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- POLÍTICAS: instagram_sessions
-- ============================================================================

CREATE POLICY "usuarios_ver_instagram"
  ON instagram_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sesiones s
      WHERE s.id = instagram_sessions.sesion_id
        AND s.organizacion_id = public.user_organization_id()
    ) OR public.is_super_admin()
  );

CREATE POLICY "usuarios_modificar_instagram"
  ON instagram_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sesiones s
      WHERE s.id = instagram_sessions.sesion_id
        AND s.organizacion_id = public.user_organization_id()
    ) OR public.is_super_admin()
  );

-- ============================================================================
-- POLÍTICAS: facebook_sessions
-- ============================================================================

CREATE POLICY "usuarios_ver_facebook"
  ON facebook_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sesiones s
      WHERE s.id = facebook_sessions.sesion_id
        AND s.organizacion_id = public.user_organization_id()
    ) OR public.is_super_admin()
  );

CREATE POLICY "usuarios_modificar_facebook"
  ON facebook_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sesiones s
      WHERE s.id = facebook_sessions.sesion_id
        AND s.organizacion_id = public.user_organization_id()
    ) OR public.is_super_admin()
  );

-- ============================================================================
-- POLÍTICAS: telegram_sessions
-- ============================================================================

CREATE POLICY "usuarios_ver_telegram"
  ON telegram_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sesiones s
      WHERE s.id = telegram_sessions.sesion_id
        AND s.organizacion_id = public.user_organization_id()
    ) OR public.is_super_admin()
  );

CREATE POLICY "usuarios_modificar_telegram"
  ON telegram_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sesiones s
      WHERE s.id = telegram_sessions.sesion_id
        AND s.organizacion_id = public.user_organization_id()
    ) OR public.is_super_admin()
  );
