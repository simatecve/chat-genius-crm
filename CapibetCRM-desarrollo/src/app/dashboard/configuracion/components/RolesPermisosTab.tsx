'use client';

import { useEffect, useMemo, useState } from 'react';
import { userServices } from '@/services/userServices';
import { userPermissionsServices } from '@/services/userPermissionsServices';
import { UsuarioResponse } from '@/app/api/usuarios/domain/usuario';

type PermissionField = {
  key: keyof import('@/app/api/user_permissions/domain/user_permissions').UserPermissionsData;
  label: string;
  group: string;
};

const PERMISSION_FIELDS: PermissionField[] = [
  { key: 'puede_ver_dashboard', label: 'Ver Dashboard', group: 'General' },
  { key: 'puede_ver_contactos', label: 'Ver Contactos', group: 'Contactos' },
  { key: 'puede_crear_contactos', label: 'Crear Contactos', group: 'Contactos' },
  { key: 'puede_editar_contactos', label: 'Editar Contactos', group: 'Contactos' },
  { key: 'puede_eliminar_contactos', label: 'Eliminar Contactos', group: 'Contactos' },
  { key: 'puede_importar_contactos', label: 'Importar Contactos', group: 'Contactos' },
  { key: 'puede_ver_chats', label: 'Ver Chats', group: 'Chats' },
  { key: 'puede_enviar_mensajes', label: 'Enviar Mensajes', group: 'Chats' },
  { key: 'puede_ver_mensajes_otros', label: 'Ver Mensajes de Otros', group: 'Chats' },
  { key: 'puede_eliminar_mensajes', label: 'Eliminar Mensajes', group: 'Chats' },
  { key: 'puede_ver_embudos', label: 'Ver Embudos', group: 'Embudos' },
  { key: 'puede_crear_embudos', label: 'Crear Embudos', group: 'Embudos' },
  { key: 'puede_editar_embudos', label: 'Editar Embudos', group: 'Embudos' },
  { key: 'puede_eliminar_embudos', label: 'Eliminar Embudos', group: 'Embudos' },
  { key: 'puede_mover_contactos_embudos', label: 'Mover Contactos en Embudos', group: 'Embudos' },
  { key: 'puede_ver_ventas', label: 'Ver Ventas', group: 'Ventas' },
  { key: 'puede_crear_ventas', label: 'Crear Ventas', group: 'Ventas' },
  { key: 'puede_editar_ventas', label: 'Editar Ventas', group: 'Ventas' },
  { key: 'puede_eliminar_ventas', label: 'Eliminar Ventas', group: 'Ventas' },
  { key: 'puede_ver_tareas', label: 'Ver Tareas', group: 'Tareas' },
  { key: 'puede_crear_tareas', label: 'Crear Tareas', group: 'Tareas' },
  { key: 'puede_asignar_tareas', label: 'Asignar Tareas', group: 'Tareas' },
  { key: 'puede_eliminar_tareas', label: 'Eliminar Tareas', group: 'Tareas' },
  { key: 'puede_ver_reportes', label: 'Ver Reportes', group: 'Reportes' },
  { key: 'puede_exportar_datos', label: 'Exportar Datos', group: 'Reportes' },
  { key: 'puede_ver_analytics', label: 'Ver Analytics', group: 'Reportes' },
  { key: 'puede_gestionar_usuarios', label: 'Gestionar Usuarios', group: 'Configuración' },
  { key: 'puede_ver_configuracion', label: 'Ver Configuración', group: 'Configuración' },
  { key: 'puede_editar_configuracion', label: 'Editar Configuración', group: 'Configuración' },
  { key: 'puede_gestionar_plantillas', label: 'Gestionar Plantillas', group: 'Configuración' },
  { key: 'puede_gestionar_respuestas_rapidas', label: 'Gestionar Respuestas Rápidas', group: 'Configuración' },
  { key: 'puede_gestionar_whatsapp', label: 'Gestionar WhatsApp', group: 'Canales' },
  { key: 'puede_gestionar_instagram', label: 'Gestionar Instagram', group: 'Canales' },
  { key: 'puede_gestionar_facebook', label: 'Gestionar Facebook', group: 'Canales' },
  { key: 'puede_gestionar_telegram', label: 'Gestionar Telegram', group: 'Canales' },
];

type GroupKey = 'admin' | 'cajero';

export default function RolesPermisosTab() {
  const [activeGroup, setActiveGroup] = useState<GroupKey>('admin');
  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [permsByUser, setPermsByUser] = useState<Record<string, Partial<any>>>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const groupedFields = useMemo(() => {
    const map: Record<string, PermissionField[]> = {};
    PERMISSION_FIELDS.forEach(f => {
      if (!map[f.group]) map[f.group] = [];
      map[f.group].push(f);
    });
    return map;
  }, []);

  const isAdminRole = (rol: string) => rol === 'admin' || rol === 'super_admin' || rol === 'ADMINITRADOR';
  const isCajeroRole = (rol: string) => rol === 'agente' || rol === 'cajero';

  const filteredUsuarios = useMemo(() => {
    if (activeGroup === 'admin') {
      return usuarios.filter(u => isAdminRole(u.rol));
    }
    return usuarios.filter(u => isCajeroRole(u.rol));
  }, [usuarios, activeGroup]);

  const defaultPermsForRole = (rol: string): Partial<any> => {
    if (isAdminRole(rol)) {
      const allTrue: Partial<any> = {};
      PERMISSION_FIELDS.forEach(f => { allTrue[f.key] = true; });
      return allTrue;
    }
    const p: Partial<any> = {};
    PERMISSION_FIELDS.forEach(f => { p[f.key] = false; });
    p.puede_ver_dashboard = true;
    p.puede_ver_chats = true;
    p.puede_enviar_mensajes = true;
    p.puede_ver_embudos = true;
    p.puede_mover_contactos_embudos = true;
    p.puede_ver_tareas = true;
    p.puede_ver_contactos = true;
    return p;
  };

  const loadUsuarios = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await userServices.getAllUsuarios();
      if (result.success && Array.isArray(result.data)) {
        setUsuarios(result.data);
        const ids = result.data.map(u => u.id);
        const promises = ids.map(id => userPermissionsServices.getByUsuario(id));
        const res = await Promise.all(promises);
        const map: Record<string, Partial<any>> = {};
        result.data.forEach((u, i) => {
          const d = res[i].data;
          map[u.id] = d || defaultPermsForRole(u.rol);
        });
        setPermsByUser(map);
      } else {
        setError(result.error || 'Error al cargar usuarios');
      }
    } catch (e) {
      setError('Error de conexión al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsuarios(); }, []);

  const toggleField = (userId: string, field: PermissionField['key']) => {
    setPermsByUser(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: !prev[userId]?.[field] }
    }));
  };

  const setAllForUser = (userId: string, value: boolean) => {
    const next: Partial<any> = { ...permsByUser[userId] };
    PERMISSION_FIELDS.forEach(f => { next[f.key] = value; });
    setPermsByUser(prev => ({ ...prev, [userId]: next }));
  };

  const saveUserPerms = async (user: UsuarioResponse) => {
    setSavingUserId(user.id);
    try {
      const current = permsByUser[user.id];
      const exists = await userPermissionsServices.getByUsuario(user.id);
      if (exists.data) {
        const result = await userPermissionsServices.update(user.id, current);
        if (!result.success) throw new Error(result.error || 'Error al actualizar');
      } else {
        const payload = { usuario_id: user.id, ...current } as any;
        const result = await userPermissionsServices.create(payload);
        if (!result.success) throw new Error(result.error || 'Error al crear');
      }
    } catch (e) {
      setError('Error al guardar permisos');
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveGroup('admin')}
            className={`px-4 py-2 rounded-lg text-sm ${activeGroup === 'admin' ? 'bg-[#F29A1F] text-white' : 'bg-[#2a2d35] text-gray-300'}`}
          >
            ADMIN
          </button>
          <button
            onClick={() => setActiveGroup('cajero')}
            className={`px-4 py-2 rounded-lg text-sm ${activeGroup === 'cajero' ? 'bg-[#F29A1F] text-white' : 'bg-[#2a2d35] text-gray-300'}`}
          >
            cajero
          </button>
        </div>
        <div>
          {loading && <span className="text-gray-400 text-sm">Cargando...</span>}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">{error}</div>
      )}

      <div className="space-y-4">
        {filteredUsuarios.map(user => (
          <div key={user.id} className="bg-[#1a1d23] border border-[#3a3d45] rounded-lg">
            <div className="flex items-center justify-between p-4">
              <div>
                <div className="text-white font-medium">{user.nombre}</div>
                <div className="text-gray-400 text-xs">Rol: {user.rol}</div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setAllForUser(user.id, true)}
                  className="px-3 py-1 bg-[#2a2d35] text-white rounded"
                >
                  Seleccionar todo
                </button>
                <button
                  onClick={() => setAllForUser(user.id, false)}
                  className="px-3 py-1 bg-[#2a2d35] text-white rounded"
                >
                  Quitar todo
                </button>
                <button
                  onClick={() => saveUserPerms(user)}
                  className="px-4 py-2 bg-[#F29A1F] text-white rounded-lg"
                  disabled={savingUserId === user.id}
                >
                  {savingUserId === user.id ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              {Object.entries(groupedFields).map(([groupName, fields]) => (
                <div key={groupName} className="bg-[#2a2d35] rounded-lg p-4">
                  <div className="text-white text-sm font-medium mb-2">{groupName}</div>
                  <div className="space-y-2">
                    {fields.map(field => (
                      <label key={String(field.key)} className="flex items-center space-x-2 text-sm text-gray-300">
                        <input
                          type="checkbox"
                          checked={Boolean(permsByUser[user.id]?.[field.key])}
                          onChange={() => toggleField(user.id, field.key)}
                        />
                        <span>{field.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filteredUsuarios.length === 0 && (
          <div className="text-gray-400 text-sm">Sin usuarios para este rol</div>
        )}
      </div>
    </div>
  );
}
