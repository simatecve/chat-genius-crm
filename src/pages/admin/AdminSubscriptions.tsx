import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, Edit, Trash2, User, Calendar, CreditCard } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;
type SubscriptionPlan = Tables<'subscription_plans'>;
type AdminSubscription = Tables<'admin_subscriptions'>;

interface SubscriptionFormData {
  user_id: string;
  plan_id: string;
  billing_cycle: string;
  start_date: string;
  end_date: string;
  amount: number;
  currency: string;
  auto_renew: boolean;
  notes: string;
}

const AdminSubscriptions = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<AdminSubscription | null>(null);
  
  const [formData, setFormData] = useState<SubscriptionFormData>({
    user_id: '',
    plan_id: '',
    billing_cycle: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    amount: 0,
    currency: 'USD',
    auto_renew: true,
    notes: ''
  });

  // Cargar datos iniciales
  useEffect(() => {
    loadUsers();
    loadPlans();
    loadSubscriptions();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('profile_type', 'cliente')
        .order('first_name');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Error al cargar usuarios');
    }
  };

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error('Error al cargar planes');
    }
  };

  const loadSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_subscriptions')
        .select(`
          *,
          profiles!admin_subscriptions_user_id_fkey(id, first_name, last_name, company_name),
          subscription_plans!admin_subscriptions_plan_id_fkey(id, name, price)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      toast.error('Error al cargar suscripciones');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const subscriptionData = {
        ...formData,
        status: 'active'
      };

      if (editingSubscription) {
        const { error } = await supabase
          .from('admin_subscriptions')
          .update(subscriptionData)
          .eq('id', editingSubscription.id);
        
        if (error) throw error;
        toast.success('Suscripción actualizada exitosamente');
      } else {
        const { error } = await supabase
          .from('admin_subscriptions')
          .insert([subscriptionData]);
        
        if (error) throw error;
        toast.success('Suscripción creada exitosamente');
      }

      setIsDialogOpen(false);
      setEditingSubscription(null);
      resetForm();
      loadSubscriptions();
    } catch (error) {
      console.error('Error saving subscription:', error);
      toast.error('Error al guardar la suscripción');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (subscription: AdminSubscription) => {
    setEditingSubscription(subscription);
    setFormData({
      user_id: subscription.user_id,
      plan_id: subscription.plan_id,
      billing_cycle: subscription.billing_cycle,
      start_date: subscription.start_date,
      end_date: subscription.end_date || '',
      amount: subscription.amount,
      currency: subscription.currency,
      auto_renew: subscription.auto_renew,
      notes: subscription.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta suscripción?')) return;

    try {
      const { error } = await supabase
        .from('admin_subscriptions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Suscripción eliminada exitosamente');
      loadSubscriptions();
    } catch (error) {
      console.error('Error deleting subscription:', error);
      toast.error('Error al eliminar la suscripción');
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      plan_id: '',
      billing_cycle: 'monthly',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      amount: 0,
      currency: 'USD',
      auto_renew: true,
      notes: ''
    });
  };

  const handlePlanChange = (planId: string) => {
    const selectedPlan = plans.find(p => p.id === planId);
    if (selectedPlan) {
      setFormData(prev => ({
        ...prev,
        plan_id: planId,
        amount: selectedPlan.price
      }));
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const userName = `${sub.profiles?.first_name || ''} ${sub.profiles?.last_name || ''} ${sub.profiles?.company_name || ''}`.toLowerCase();
    const planName = sub.subscription_plans?.name?.toLowerCase() || '';
    return userName.includes(searchTerm.toLowerCase()) || planName.includes(searchTerm.toLowerCase());
  });

  const getStatusBadge = (status: string) => {
    const statusColors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return statusColors[status as keyof typeof statusColors] || statusColors.pending;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Suscripciones
          </h1>
          <p className="text-gray-600 mt-2">Administra las suscripciones de usuarios</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingSubscription(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Suscripción
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingSubscription ? 'Editar Suscripción' : 'Nueva Suscripción'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="user_id">Usuario</Label>
                  <Select value={formData.user_id} onValueChange={(value) => setFormData(prev => ({ ...prev, user_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {user.first_name} {user.last_name} {user.company_name && `(${user.company_name})`}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="plan_id">Plan de Suscripción</Label>
                  <Select value={formData.plan_id} onValueChange={handlePlanChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{plan.name}</span>
                            <span className="text-sm text-gray-500">${plan.price}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billing_cycle">Ciclo de Facturación</Label>
                  <Select value={formData.billing_cycle} onValueChange={(value) => setFormData(prev => ({ ...prev, billing_cycle: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensual</SelectItem>
                      <SelectItem value="quarterly">Trimestral</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="amount">Monto</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="currency">Moneda</Label>
                  <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="MXN">MXN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Fecha de Inicio</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="end_date">Fecha de Fin (Opcional)</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.auto_renew}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_renew: checked }))}
                />
                <Label>Renovación Automática</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notas (Opcional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notas adicionales sobre la suscripción..."
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Guardando...' : editingSubscription ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Barra de búsqueda */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por usuario o plan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabla de suscripciones */}
      <Card>
        <CardHeader>
          <CardTitle>Suscripciones Activas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Ciclo</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha Inicio</TableHead>
                <TableHead>Fecha Fin</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.map((subscription) => (
                <TableRow key={subscription.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <div>
                        <div className="font-medium">
                          {subscription.profiles?.first_name} {subscription.profiles?.last_name}
                        </div>
                        {subscription.profiles?.company_name && (
                          <div className="text-sm text-gray-500">
                            {subscription.profiles.company_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      {subscription.subscription_plans?.name}
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{subscription.billing_cycle}</TableCell>
                  <TableCell>{subscription.currency} ${subscription.amount}</TableCell>
                  <TableCell>
                    <Badge className={getStatusBadge(subscription.status)}>
                      {subscription.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(subscription.start_date).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    {subscription.end_date ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(subscription.end_date).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-gray-400">Sin límite</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(subscription)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(subscription.id)}
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
          
          {filteredSubscriptions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No se encontraron suscripciones
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSubscriptions;