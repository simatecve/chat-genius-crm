import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { usersService, UserProfile } from '@/services/usersService';
import { userPermissionsService, UserPermissions } from '@/services/userPermissionsService';

interface EditPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleType: 'superadmin' | 'admin' | 'cashier' | 'user';
  roleName: string;
}

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

export default function EditPermissionsDialog({
  open,
  onOpenChange,
  roleType,
  roleName
}: EditPermissionsDialogProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [permsByUser, setPermsByUser] = useState<Record<string, Partial<UserPermissions>>>({});
  const [loading, setLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const groupedFields = PERMISSION_FIELDS.reduce((acc, field) => {
    if (!acc[field.group]) acc[field.group] = [];
    acc[field.group].push(field);
    return acc;
  }, {} as Record<string, PermissionField[]>);

  const filterUsersByRole = (allUsers: UserProfile[]) => {
    return allUsers.filter(user => {
      switch (roleType) {
        case 'superadmin':
          return user.profile_type === 'superadmin';
        case 'admin':
          return user.profile_type === 'client' || user.role === 'admin';
        case 'cashier':
        case 'user':
          return user.role === 'user' && user.profile_type !== 'superadmin';
        default:
          return false;
      }
    });
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await usersService.getAllUsers();
      const filteredUsers = filterUsersByRole(allUsers);
      setUsers(filteredUsers);

      const permsMap: Record<string, Partial<UserPermissions>> = {};
      await Promise.all(
        filteredUsers.map(async (user) => {
          try {
            const perms = await userPermissionsService.getByUserId(user.id);
            permsMap[user.id] = perms || {};
          } catch (e) {
            permsMap[user.id] = {};
          }
        })
      );
      setPermsByUser(permsMap);
    } catch (e: any) {
      console.error('Error loading users:', e);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open, roleType]);

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
      toast.error('Error al guardar permisos');
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Permisos - {roleName}</DialogTitle>
          <DialogDescription>
            Configura los permisos para los usuarios con rol {roleName}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando usuarios...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay usuarios con este rol
          </div>
        ) : (
          <div className="space-y-6">
            {users.map(user => (
              <div key={user.id} className="border border-border rounded-lg">
                <div className="flex items-center justify-between p-4 bg-muted/50">
                  <div>
                    <div className="font-medium text-foreground">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setAllForUser(user.id, true)}
                      variant="outline"
                      size="sm"
                    >
                      Todos
                    </Button>
                    <Button
                      onClick={() => setAllForUser(user.id, false)}
                      variant="outline"
                      size="sm"
                    >
                      Ninguno
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {Object.entries(groupedFields).map(([groupName, fields]) => (
                    <div key={groupName} className="space-y-2">
                      <div className="text-sm font-medium text-foreground">{groupName}</div>
                      <div className="space-y-1.5">
                        {fields.map(field => (
                          <label
                            key={String(field.key)}
                            className="flex items-center gap-2 text-sm cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(permsByUser[user.id]?.[field.key])}
                              onChange={() => toggleField(user.id, field.key)}
                              className="rounded border-input"
                            />
                            <span className="text-muted-foreground">{field.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
