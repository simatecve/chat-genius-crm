'use client';

import { useEffect, useMemo, useState } from 'react';
import { usersService, UserProfile } from '@/services/usersService';
import { userPermissionsService, UserPermissions } from '@/services/userPermissionsService';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type PermissionField = {
  key: keyof UserPermissions;
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

type RoleTab = 'admin' | 'cajero';

export default function RolesPermisosTab() {
  const [activeTab, setActiveTab] = useState<RoleTab>('admin');
  const [usuarios, setUsuarios] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [permsByUser, setPermsByUser] = useState<Record<string, Partial<UserPermissions>>>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const groupedFields = useMemo(() => {
    const map: Record<string, PermissionField[]> = {};
    PERMISSION_FIELDS.forEach(f => {
      if (!map[f.group]) map[f.group] = [];
      map[f.group].push(f);
    });
    return map;
  }, []);

  const isAdminRole = (role: string | null, profileType: string | null) => {
    return profileType === 'client' || profileType === 'superadmin' || role === 'admin';
  };

  const isCajeroRole = (role: string | null, profileType: string | null) => {
    return role === 'user' && profileType !== 'superadmin';
  };

  const filteredUsuarios = useMemo(() => {
    if (activeTab === 'admin') {
      return usuarios.filter(u => isAdminRole(u.role, u.profile_type));
    }
    return usuarios.filter(u => isCajeroRole(u.role, u.profile_type));
  }, [usuarios, activeTab]);

  const defaultPermsForRole = (role: string | null, profileType: string | null): Partial<UserPermissions> => {
    if (isAdminRole(role, profileType)) {
      const allTrue: Partial<UserPermissions> = {};
      PERMISSION_FIELDS.forEach(f => {
        (allTrue as any)[f.key] = true;
      });
      return allTrue;
    }
    
    // Default permissions for cajero
    return {
      puede_ver_dashboard: true,
      puede_ver_chats: true,
      puede_enviar_mensajes: true,
      puede_ver_embudos: true,
      puede_mover_contactos_embudos: true,
      puede_ver_tareas: true,
      puede_ver_contactos: true
    };
  };

  const loadUsuarios = async () => {
    setLoading(true);
    setError('');
    try {
      const users = await usersService.getAllUsers();
      setUsuarios(users);
      
      // Load permissions for each user
      const permsMap: Record<string, Partial<UserPermissions>> = {};
      await Promise.all(
        users.map(async (user) => {
          try {
            const perms = await userPermissionsService.getByUserId(user.id);
            permsMap[user.id] = perms || defaultPermsForRole(user.role, user.profile_type);
          } catch (e) {
            permsMap[user.id] = defaultPermsForRole(user.role, user.profile_type);
          }
        })
      );
      setPermsByUser(permsMap);
    } catch (e: any) {
      console.error('Error loading users:', e);
      setError(e.message || 'Error al cargar usuarios');
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsuarios();
  }, []);

  const toggleField = (userId: string, field: keyof UserPermissions) => {
    setPermsByUser(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: !(prev[userId]?.[field] as boolean)
      }
    }));
  };

  const setAllForUser = (userId: string, value: boolean) => {
    const next: Partial<UserPermissions> = { ...permsByUser[userId] };
    PERMISSION_FIELDS.forEach(f => {
      (next as any)[f.key] = value;
    });
    setPermsByUser(prev => ({ ...prev, [userId]: next }));
  };

  const saveUserPerms = async (user: UserProfile) => {
    setSavingUserId(user.id);
    try {
      const current = permsByUser[user.id];
      await userPermissionsService.upsert({
        user_id: user.id,
        ...current
      } as any);
      
      toast.success('Permisos guardados correctamente');
    } catch (e: any) {
      console.error('Error saving permissions:', e);
      setError(e.message || 'Error al guardar permisos');
      toast.error('Error al guardar permisos');
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <Button
            onClick={() => setActiveTab('admin')}
            variant={activeTab === 'admin' ? 'default' : 'outline'}
            className="px-4 py-2 rounded-lg text-sm"
          >
            Admin
          </Button>
          <Button
            onClick={() => setActiveTab('cajero')}
            variant={activeTab === 'cajero' ? 'default' : 'outline'}
            className="px-4 py-2 rounded-lg text-sm"
          >
            Cajero
          </Button>
        </div>
        <div>
          {loading && <span className="text-muted-foreground text-sm">Cargando...</span>}
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {filteredUsuarios.map(user => (
          <div key={user.id} className="bg-card border border-border rounded-lg">
            <div className="flex items-center justify-between p-4">
              <div>
                <div className="text-foreground font-medium">
                  {user.first_name} {user.last_name}
                </div>
                <div className="text-muted-foreground text-xs">
                  {user.email} • Rol: {user.role || 'Sin rol'}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setAllForUser(user.id, true)}
                  variant="outline"
                  size="sm"
                >
                  Seleccionar todo
                </Button>
                <Button
                  onClick={() => setAllForUser(user.id, false)}
                  variant="outline"
                  size="sm"
                >
                  Quitar todo
                </Button>
                <Button
                  onClick={() => saveUserPerms(user)}
                  disabled={savingUserId === user.id}
                  size="sm"
                >
                  {savingUserId === user.id ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              {Object.entries(groupedFields).map(([groupName, fields]) => (
                <div key={groupName} className="bg-muted/50 rounded-lg p-4">
                  <div className="text-foreground text-sm font-medium mb-2">{groupName}</div>
                  <div className="space-y-2">
                    {fields.map(field => (
                      <label 
                        key={String(field.key)} 
                        className="flex items-center space-x-2 text-sm text-foreground cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(permsByUser[user.id]?.[field.key])}
                          onChange={() => toggleField(user.id, field.key)}
                          className="rounded border-input"
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
        
        {filteredUsuarios.length === 0 && !loading && (
          <div className="text-muted-foreground text-sm text-center py-8">
            No hay usuarios con este rol
          </div>
        )}
      </div>
    </div>
  );
}
