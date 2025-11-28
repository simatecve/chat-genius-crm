'use client';

import { useState } from 'react';
import RoleCard from './RoleCard';
import EditPermissionsDialog from './EditPermissionsDialog';

type RoleType = 'superadmin' | 'admin' | 'cashier' | 'user';

export default function RolesPermisosTab() {
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const roles = [
    {
      type: 'superadmin' as RoleType,
      title: 'Super Admin',
      description: 'Acceso completo al sistema',
      badge: 'superadmin',
      badgeColor: '#dc2626',
      icon: 'superadmin' as const
    },
    {
      type: 'admin' as RoleType,
      title: 'Administrador',
      description: 'Gestión general sin crear usuarios',
      badge: 'admin',
      badgeColor: '#f59e0b',
      icon: 'admin' as const
    },
    {
      type: 'cashier' as RoleType,
      title: 'Cajero',
      description: 'Operaciones y atención al cliente',
      badge: 'cashier',
      badgeColor: '#3b82f6',
      icon: 'cashier' as const
    },
    {
      type: 'user' as RoleType,
      title: 'Usuario',
      description: 'Acceso básico de solo lectura',
      badge: 'user',
      badgeColor: '#6b7280',
      icon: 'user' as const
    }
  ];

  const handleEditPermissions = (roleType: RoleType) => {
    setSelectedRole(roleType);
    setDialogOpen(true);
  };

  const getRoleName = (roleType: RoleType) => {
    return roles.find(r => r.type === roleType)?.title || '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Roles y Permisos</h2>
        <p className="text-muted-foreground mt-1">Configura los permisos para cada rol</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map(role => (
          <RoleCard
            key={role.type}
            title={role.title}
            description={role.description}
            badge={role.badge}
            badgeColor={role.badgeColor}
            icon={role.icon}
            onEditPermissions={() => handleEditPermissions(role.type)}
          />
        ))}
      </div>

      {selectedRole && (
        <EditPermissionsDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          roleType={selectedRole}
          roleName={getRoleName(selectedRole)}
        />
      )}
    </div>
  );
}
