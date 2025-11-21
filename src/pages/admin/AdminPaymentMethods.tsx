import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Wallet, 
  Plus, 
  Edit, 
  Trash2, 
  CreditCard, 
  DollarSign,
  CheckCircle,
  XCircle,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type PaymentMethod = Tables<'payment_methods'>;

interface PaymentMethodForm {
  name: string;
  provider: string;
  api_key: string;
  secret_key: string;
  webhook_url: string;
  supported_currencies: string[];
  configuration: any;
  is_active: boolean;
}

const AdminPaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [showSecrets, setShowSecrets] = useState<{[key: string]: boolean}>({});
  const [formData, setFormData] = useState<PaymentMethodForm>({
    name: '',
    provider: '',
    api_key: '',
    secret_key: '',
    webhook_url: '',
    supported_currencies: [],
    configuration: {},
    is_active: false
  });

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast.error('Error al cargar los métodos de pago');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('El nombre es requerido');
      return false;
    }
    if (!formData.provider) {
      toast.error('El proveedor es requerido');
      return false;
    }
    if (!formData.api_key.trim()) {
      toast.error('La clave API es requerida');
      return false;
    }
    if (!formData.secret_key.trim()) {
      toast.error('La clave secreta es requerida');
      return false;
    }

    // Validaciones específicas por proveedor
    if (formData.provider === 'stripe') {
      if (!formData.api_key.startsWith('pk_')) {
        toast.error('La clave pública de Stripe debe comenzar con "pk_"');
        return false;
      }
      if (!formData.secret_key.startsWith('sk_')) {
        toast.error('La clave secreta de Stripe debe comenzar con "sk_"');
        return false;
      }
    }

    // Validaciones para Mercado Pago removidas para permitir cualquier formato

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const methodData = {
        ...formData,
        configuration: {
          ...formData.configuration,
          environment: formData.provider === 'stripe' 
            ? (formData.api_key.includes('test') ? 'test' : 'live')
            : (formData.api_key.includes('TEST') ? 'sandbox' : 'production')
        }
      };

      if (editingMethod) {
        const { error } = await supabase
          .from('payment_methods')
          .update(methodData)
          .eq('id', editingMethod.id);

        if (error) throw error;
        toast.success('Método de pago actualizado exitosamente');
        setIsEditDialogOpen(false);
      } else {
        const { error } = await supabase
          .from('payment_methods')
          .insert([methodData]);

        if (error) throw error;
        toast.success('Método de pago creado exitosamente');
        setIsCreateDialogOpen(false);
      }

      fetchPaymentMethods();
      resetForm();
    } catch (error: any) {
      console.error('Error saving payment method:', error);
      toast.error(error.message || 'Error al guardar el método de pago');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este método de pago?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Método de pago eliminado exitosamente');
      fetchPaymentMethods();
    } catch (error: any) {
      console.error('Error deleting payment method:', error);
      toast.error('Error al eliminar el método de pago');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Método de pago ${!currentStatus ? 'activado' : 'desactivado'} exitosamente`);
      fetchPaymentMethods();
    } catch (error: any) {
      console.error('Error toggling payment method:', error);
      toast.error('Error al cambiar el estado del método de pago');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      provider: '',
      api_key: '',
      secret_key: '',
      webhook_url: '',
      supported_currencies: [],
      configuration: {},
      is_active: false
    });
    setEditingMethod(null);
  };

  const openEditDialog = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormData({
      name: method.name,
      provider: method.provider,
      api_key: method.api_key || '',
      secret_key: method.secret_key || '',
      webhook_url: method.webhook_url || '',
      supported_currencies: method.supported_currencies || [],
      configuration: method.configuration || {},
      is_active: method.is_active
    });
    setIsEditDialogOpen(true);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'stripe':
        return <CreditCard className="h-4 w-4" />;
      case 'mercadopago':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  };

  const getEnvironmentBadge = (method: PaymentMethod) => {
    const config = method.configuration as any;
    const environment = config?.environment || 'unknown';
    
    if (environment === 'test' || environment === 'sandbox') {
      return <Badge variant="secondary">Pruebas</Badge>;
    }
    if (environment === 'live' || environment === 'production') {
      return <Badge variant="default">Producción</Badge>;
    }
    return <Badge variant="outline">Desconocido</Badge>;
  };

  const toggleSecretVisibility = (methodId: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [methodId]: !prev[methodId]
    }));
  };

  const maskSecret = (secret: string, show: boolean) => {
    if (show) return secret;
    return secret ? '•'.repeat(Math.min(secret.length, 20)) : '';
  };

  const activeMethodsCount = paymentMethods.filter(m => m.is_active).length;
  const stripeCount = paymentMethods.filter(m => m.provider === 'stripe').length;
  const mercadopagoCount = paymentMethods.filter(m => m.provider === 'mercadopago').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Métodos de Pago</h1>
          <p className="text-muted-foreground">
            Administra los métodos de pago disponibles en el sistema
          </p>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando métodos de pago...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Métodos de Pago</h1>
          <p className="text-muted-foreground">
            Administra los métodos de pago disponibles en el sistema
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Método
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Método de Pago</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="provider">Proveedor *</Label>
                  <Select value={formData.provider} onValueChange={(value) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      provider: value,
                      name: value === 'stripe' ? 'Stripe' : value === 'mercadopago' ? 'Mercado Pago Argentina' : '',
                      supported_currencies: value === 'stripe' ? ['USD', 'EUR', 'ARS'] : value === 'mercadopago' ? ['ARS', 'USD'] : []
                    }));
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stripe">Stripe</SelectItem>
                      <SelectItem value="mercadopago">Mercado Pago Argentina</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nombre del método de pago"
                  />
                </div>
              </div>

              {formData.provider === 'stripe' && (
                <>
                  <div>
                    <Label htmlFor="api_key">Publishable Key *</Label>
                    <Input
                      id="api_key"
                      value={formData.api_key}
                      onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                      placeholder="pk_test_... o pk_live_..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="secret_key">Secret Key *</Label>
                    <Input
                      id="secret_key"
                      type="password"
                      value={formData.secret_key}
                      onChange={(e) => setFormData(prev => ({ ...prev, secret_key: e.target.value }))}
                      placeholder="sk_test_... o sk_live_..."
                    />
                  </div>
                </>
              )}

              {formData.provider === 'mercadopago' && (
                <>
                  <div>
                    <Label htmlFor="api_key">Public Key *</Label>
                    <Input
                      id="api_key"
                      value={formData.api_key}
                      onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                      placeholder="Clave pública de Mercado Pago"
                    />
                  </div>
                  <div>
                    <Label htmlFor="secret_key">Access Token *</Label>
                    <Input
                      id="secret_key"
                      type="password"
                      value={formData.secret_key}
                      onChange={(e) => setFormData(prev => ({ ...prev, secret_key: e.target.value }))}
                      placeholder="Access token de Mercado Pago"
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="webhook_url">Webhook URL (Opcional)</Label>
                <Input
                  id="webhook_url"
                  value={formData.webhook_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, webhook_url: e.target.value }))}
                  placeholder="https://tu-dominio.com/api/webhooks/..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Activar método de pago</Label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Crear Método
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
       <div className="grid gap-4 md:grid-cols-4">
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Total Métodos</CardTitle>
             <Wallet className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{paymentMethods.length}</div>
             <p className="text-xs text-muted-foreground">
               Métodos configurados
             </p>
           </CardContent>
         </Card>
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Activos</CardTitle>
             <CheckCircle className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{activeMethodsCount}</div>
             <p className="text-xs text-muted-foreground">
               Métodos habilitados
             </p>
           </CardContent>
         </Card>
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Stripe</CardTitle>
             <CreditCard className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{stripeCount}</div>
             <p className="text-xs text-muted-foreground">
               Configuraciones Stripe
             </p>
           </CardContent>
         </Card>
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Mercado Pago</CardTitle>
             <DollarSign className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{mercadopagoCount}</div>
             <p className="text-xs text-muted-foreground">
               Configuraciones MP
             </p>
           </CardContent>
         </Card>
       </div>

       {/* Payment Methods Table */}
       <Card>
         <CardHeader>
           <CardTitle>Métodos de Pago Configurados</CardTitle>
         </CardHeader>
         <CardContent>
           {paymentMethods.length === 0 ? (
             <div className="text-center py-12">
               <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
               <h3 className="text-lg font-medium text-gray-900 mb-2">
                 No hay métodos de pago configurados
               </h3>
               <p className="text-gray-500 mb-4">
                 Comienza agregando tu primer método de pago para procesar transacciones.
               </p>
               <Button onClick={() => setIsCreateDialogOpen(true)}>
                 <Plus className="h-4 w-4 mr-2" />
                 Agregar Método de Pago
               </Button>
             </div>
           ) : (
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Proveedor</TableHead>
                   <TableHead>Nombre</TableHead>
                   <TableHead>Entorno</TableHead>
                   <TableHead>Claves API</TableHead>
                   <TableHead>Estado</TableHead>
                   <TableHead>Acciones</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {paymentMethods.map((method) => (
                   <TableRow key={method.id}>
                     <TableCell>
                       <div className="flex items-center space-x-2">
                         {getProviderIcon(method.provider)}
                         <span className="capitalize">{method.provider}</span>
                       </div>
                     </TableCell>
                     <TableCell className="font-medium">{method.name}</TableCell>
                     <TableCell>{getEnvironmentBadge(method)}</TableCell>
                     <TableCell>
                       <div className="space-y-1">
                         <div className="flex items-center space-x-2">
                           <span className="text-xs text-muted-foreground">API:</span>
                           <code className="text-xs bg-muted px-1 rounded">
                             {maskSecret(method.api_key || '', showSecrets[method.id])}
                           </code>
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => toggleSecretVisibility(method.id)}
                           >
                             {showSecrets[method.id] ? (
                               <EyeOff className="h-3 w-3" />
                             ) : (
                               <Eye className="h-3 w-3" />
                             )}
                           </Button>
                         </div>
                         <div className="flex items-center space-x-2">
                           <span className="text-xs text-muted-foreground">Secret:</span>
                           <code className="text-xs bg-muted px-1 rounded">
                             {maskSecret(method.secret_key || '', showSecrets[method.id])}
                           </code>
                         </div>
                       </div>
                     </TableCell>
                     <TableCell>
                       <div className="flex items-center space-x-2">
                         <Switch
                           checked={method.is_active}
                           onCheckedChange={() => handleToggleActive(method.id, method.is_active)}
                         />
                         {method.is_active ? (
                           <Badge variant="default">Activo</Badge>
                         ) : (
                           <Badge variant="secondary">Inactivo</Badge>
                         )}
                       </div>
                     </TableCell>
                     <TableCell>
                       <div className="flex items-center space-x-2">
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => openEditDialog(method)}
                         >
                           <Edit className="h-4 w-4" />
                         </Button>
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => handleDelete(method.id)}
                           className="text-red-600 hover:text-red-700"
                         >
                           <Trash2 className="h-4 w-4" />
                         </Button>
                       </div>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           )}
         </CardContent>
       </Card>

       {/* Edit Dialog */}
       <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
         <DialogContent className="max-w-2xl">
           <DialogHeader>
             <DialogTitle>Editar Método de Pago</DialogTitle>
           </DialogHeader>
           <form onSubmit={handleSubmit} className="space-y-4 max-h-96 overflow-y-auto">
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <Label htmlFor="edit_provider">Proveedor *</Label>
                 <Select value={formData.provider} onValueChange={(value) => {
                   setFormData(prev => ({ 
                     ...prev, 
                     provider: value,
                     supported_currencies: value === 'stripe' ? ['USD', 'EUR', 'ARS'] : value === 'mercadopago' ? ['ARS', 'USD'] : []
                   }));
                 }}>
                   <SelectTrigger>
                     <SelectValue placeholder="Seleccionar proveedor" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="stripe">Stripe</SelectItem>
                     <SelectItem value="mercadopago">Mercado Pago Argentina</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               <div>
                 <Label htmlFor="edit_name">Nombre *</Label>
                 <Input
                   id="edit_name"
                   value={formData.name}
                   onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                   placeholder="Nombre del método de pago"
                 />
               </div>
             </div>

             {formData.provider === 'stripe' && (
               <>
                 <div>
                   <Label htmlFor="edit_api_key">Publishable Key *</Label>
                   <Input
                     id="edit_api_key"
                     value={formData.api_key}
                     onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                     placeholder="pk_test_... o pk_live_..."
                   />
                 </div>
                 <div>
                   <Label htmlFor="edit_secret_key">Secret Key *</Label>
                   <Input
                     id="edit_secret_key"
                     type="password"
                     value={formData.secret_key}
                     onChange={(e) => setFormData(prev => ({ ...prev, secret_key: e.target.value }))}
                     placeholder="sk_test_... o sk_live_..."
                   />
                 </div>
               </>
             )}

             {formData.provider === 'mercadopago' && (
               <>
                 <div>
                   <Label htmlFor="edit_api_key">Public Key *</Label>
                   <Input
                     id="edit_api_key"
                     value={formData.api_key}
                     onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                     placeholder="Clave pública de Mercado Pago"
                   />
                 </div>
                 <div>
                   <Label htmlFor="edit_secret_key">Access Token *</Label>
                   <Input
                     id="edit_secret_key"
                     type="password"
                     value={formData.secret_key}
                     onChange={(e) => setFormData(prev => ({ ...prev, secret_key: e.target.value }))}
                     placeholder="Access token de Mercado Pago"
                   />
                 </div>
               </>
             )}

             <div>
               <Label htmlFor="edit_webhook_url">Webhook URL (Opcional)</Label>
               <Input
                 id="edit_webhook_url"
                 value={formData.webhook_url}
                 onChange={(e) => setFormData(prev => ({ ...prev, webhook_url: e.target.value }))}
                 placeholder="https://tu-dominio.com/api/webhooks/..."
               />
             </div>

             <div className="flex items-center space-x-2">
               <Switch
                 id="edit_is_active"
                 checked={formData.is_active}
                 onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
               />
               <Label htmlFor="edit_is_active">Activar método de pago</Label>
             </div>

             <div className="flex justify-end space-x-2 pt-4">
               <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                 Cancelar
               </Button>
               <Button type="submit">
                 Actualizar Método
               </Button>
             </div>
           </form>
         </DialogContent>
       </Dialog>
     </div>
   );
};

export default AdminPaymentMethods;