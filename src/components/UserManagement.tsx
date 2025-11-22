import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Trash2, Shield, Settings, Users } from 'lucide-react';
import {
  fetchAllUsers,
  fetchAllPermissions,
  fetchRolePermissions,
  createUser,
  updateUserRole,
  updateRolePermissions,
  deleteUser,
  type UserWithRole,
  type Permission,
  type AppRole,
} from '@/services/userRolesService';
import { Badge } from '@/components/ui/badge';

const UserManagement = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditRoleDialog, setShowEditRoleDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const { toast } = useToast();

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'user' as AppRole
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, permsData] = await Promise.all([
        fetchAllUsers(),
        fetchAllPermissions()
      ]);
      setUsers(usersData);
      setPermissions(permsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la información',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      await createUser(
        newUser.email,
        newUser.password,
        newUser.firstName,
        newUser.lastName,
        newUser.role
      );
      
      toast({
        title: 'Éxito',
        description: 'Usuario creado correctamente'
      });
      
      setShowCreateDialog(false);
      setNewUser({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'user'
      });
      loadData();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el usuario',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateUserRole = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      await updateUserRole(selectedUser.id, selectedRole);
      toast({
        title: 'Éxito',
        description: 'Rol actualizado correctamente'
      });
      setShowEditRoleDialog(false);
      setSelectedUser(null);
      loadData();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el rol',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) return;

    try {
      await deleteUser(userId);
      toast({
        title: 'Éxito',
        description: 'Usuario eliminado correctamente'
      });
      loadData();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el usuario',
        variant: 'destructive'
      });
    }
  };

  const handleEditRolePermissions = async (role: AppRole) => {
    try {
      const rolePerms = await fetchRolePermissions(role);
      setSelectedRole(role);
      setSelectedPermissions(rolePerms);
      setShowPermissionsDialog(true);
    } catch (error) {
      console.error('Error loading role permissions:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los permisos',
        variant: 'destructive'
      });
    }
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedRole) return;

    try {
      await updateRolePermissions(selectedRole, selectedPermissions);
      toast({
        title: 'Éxito',
        description: 'Permisos actualizados correctamente'
      });
      setShowPermissionsDialog(false);
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron actualizar los permisos',
        variant: 'destructive'
      });
    }
  };

  const getRoleBadgeVariant = (role: AppRole | null) => {
    switch (role) {
      case 'superadmin': return 'destructive';
      case 'admin': return 'default';
      case 'cashier': return 'secondary';
      case 'user': return 'outline';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: AppRole | null) => {
    switch (role) {
      case 'superadmin': return 'Super Admin';
      case 'admin': return 'Administrador';
      case 'cashier': return 'Cajero';
      case 'user': return 'Usuario';
      default: return 'Sin rol';
    }
  };

  const permissionsByCategory = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="users" className="space-y-6">
      <TabsList>
        <TabsTrigger value="users" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Usuarios
        </TabsTrigger>
        <TabsTrigger value="roles" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Roles y Permisos
        </TabsTrigger>
      </TabsList>

      {/* Usuarios Tab */}
      <TabsContent value="users" className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
            <p className="text-muted-foreground">Administra los usuarios y sus roles</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Crear Usuario
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Fecha de Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.first_name || user.last_name
                        ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                        : 'Sin nombre'}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('es-ES')}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setSelectedRole(user.role || 'user');
                          setShowEditRoleDialog(true);
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Roles Tab */}
      <TabsContent value="roles" className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Roles y Permisos</h2>
          <p className="text-muted-foreground">Configura los permisos para cada rol</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['superadmin', 'admin', 'cashier', 'user'].map((role) => (
            <Card key={role}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{getRoleLabel(role as AppRole)}</span>
                  <Badge variant={getRoleBadgeVariant(role as AppRole)}>
                    {role}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {role === 'superadmin' && 'Acceso completo al sistema'}
                  {role === 'admin' && 'Gestión general sin crear usuarios'}
                  {role === 'cashier' && 'Operaciones y atención al cliente'}
                  {role === 'user' && 'Acceso básico de solo lectura'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleEditRolePermissions(role as AppRole)}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Editar Permisos
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Completa los datos del nuevo usuario
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre</Label>
                <Input
                  id="firstName"
                  value={newUser.firstName}
                  onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido</Label>
                <Input
                  id="lastName"
                  value={newUser.lastName}
                  onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value as AppRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuario</SelectItem>
                  <SelectItem value="cashier">Cajero</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="superadmin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateUser}>Crear Usuario</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={showEditRoleDialog} onOpenChange={setShowEditRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Rol de Usuario</DialogTitle>
            <DialogDescription>
              Selecciona el nuevo rol para {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newRole">Nuevo Rol</Label>
              <Select
                value={selectedRole || 'user'}
                onValueChange={(value) => setSelectedRole(value as AppRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuario</SelectItem>
                  <SelectItem value="cashier">Cajero</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="superadmin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditRoleDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateUserRole}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Permisos - {getRoleLabel(selectedRole)}</DialogTitle>
            <DialogDescription>
              Selecciona los permisos que tendrá este rol
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {Object.entries(permissionsByCategory).map(([category, perms]) => (
              <div key={category} className="space-y-3">
                <h3 className="font-semibold text-sm">{category}</h3>
                <div className="space-y-2 ml-4">
                  {perms.map((perm) => (
                    <div key={perm.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={perm.id}
                        checked={selectedPermissions.includes(perm.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPermissions([...selectedPermissions, perm.id]);
                          } else {
                            setSelectedPermissions(
                              selectedPermissions.filter((id) => id !== perm.id)
                            );
                          }
                        }}
                      />
                      <Label htmlFor={perm.id} className="text-sm cursor-pointer">
                        <span className="font-medium">{perm.description}</span>
                        <span className="text-muted-foreground ml-2">({perm.name})</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissionsDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRolePermissions}>Guardar Permisos</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
};

export default UserManagement;
