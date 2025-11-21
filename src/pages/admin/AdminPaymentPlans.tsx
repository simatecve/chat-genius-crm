import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  CreditCard, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  Star
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type PaymentPlan = Database['public']['Tables']['subscription_plans']['Row'];
type PaymentPlanInsert = Database['public']['Tables']['subscription_plans']['Insert'];
type PaymentPlanUpdate = Database['public']['Tables']['subscription_plans']['Update'];

const AdminPaymentPlans = () => {
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    is_active: true,
    max_bot_responses: '',
    max_contacts: '',
    max_conversations: '',
    max_device_sessions: '',
    max_monthly_campaigns: '',
    max_storage_mb: '',
    max_whatsapp_connections: ''
  });
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching payment plans:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los planes de pago",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    if (!formData.name || !formData.price) {
      toast({
        title: "Error",
        description: "Nombre y precio son requeridos",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);

      const planData: PaymentPlanInsert = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        is_active: formData.is_active,
        max_bot_responses: parseInt(formData.max_bot_responses),
        max_contacts: parseInt(formData.max_contacts),
        max_conversations: formData.max_conversations ? parseInt(formData.max_conversations) : 0,
        max_device_sessions: formData.max_device_sessions ? parseInt(formData.max_device_sessions) : 0,
        max_monthly_campaigns: parseInt(formData.max_monthly_campaigns),
        max_storage_mb: parseInt(formData.max_storage_mb),
        max_whatsapp_connections: parseInt(formData.max_whatsapp_connections)
      };

      const { error } = await supabase
        .from('subscription_plans')
        .insert(planData);

      if (error) throw error;

      toast({
        title: "Plan creado",
        description: "El plan de pago ha sido creado exitosamente",
      });

      setIsCreateDialogOpen(false);
      resetForm();
      fetchPlans();
    } catch (error: any) {
      console.error('Error creating payment plan:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el plan de pago",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdatePlan = async () => {
    if (!selectedPlan) return;

    try {
      setUpdating(true);

      const planData: PaymentPlanUpdate = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        is_active: formData.is_active,
        max_bot_responses: parseInt(formData.max_bot_responses),
        max_contacts: parseInt(formData.max_contacts),
        max_conversations: formData.max_conversations ? parseInt(formData.max_conversations) : 0,
        max_device_sessions: formData.max_device_sessions ? parseInt(formData.max_device_sessions) : 0,
        max_monthly_campaigns: parseInt(formData.max_monthly_campaigns),
        max_storage_mb: parseInt(formData.max_storage_mb),
        max_whatsapp_connections: parseInt(formData.max_whatsapp_connections)
      };

      const { error } = await supabase
        .from('subscription_plans')
        .update(planData)
        .eq('id', selectedPlan.id);

      if (error) throw error;

      toast({
        title: "Plan actualizado",
        description: "El plan de pago ha sido actualizado",
      });

      setIsEditDialogOpen(false);
      setSelectedPlan(null);
      fetchPlans();
    } catch (error: any) {
      console.error('Error updating payment plan:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el plan de pago",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: "Plan eliminado",
        description: "El plan de pago ha sido eliminado",
      });

      fetchPlans();
    } catch (error: any) {
      console.error('Error deleting payment plan:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el plan de pago",
        variant: "destructive",
      });
    }
  };

  const handleTogglePlanStatus = async (planId: string, newStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update({ is_active: newStatus })
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: newStatus ? "Plan activado" : "Plan desactivado",
        description: `El plan ha sido ${newStatus ? 'activado' : 'desactivado'} correctamente`,
      });

      fetchPlans();
    } catch (error: any) {
      console.error('Error toggling plan status:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo cambiar el estado del plan",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (plan: PaymentPlan) => {
    setSelectedPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      price: plan.price.toString(),
      is_active: plan.is_active,
      max_bot_responses: plan.max_bot_responses.toString(),
      max_contacts: plan.max_contacts.toString(),
      max_conversations: plan.max_conversations?.toString() || '0',
      max_device_sessions: plan.max_device_sessions?.toString() || '0',
      max_monthly_campaigns: plan.max_monthly_campaigns.toString(),
      max_storage_mb: plan.max_storage_mb.toString(),
      max_whatsapp_connections: plan.max_whatsapp_connections.toString()
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      is_active: true,
      max_bot_responses: '',
      max_contacts: '',
      max_conversations: '',
      max_device_sessions: '',
      max_monthly_campaigns: '',
      max_storage_mb: '',
      max_whatsapp_connections: ''
    });
  };

  const filteredPlans = plans.filter(plan => 
    plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plan.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando planes de pago...</p>
          </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <CreditCard className="mr-3 h-8 w-8" />
              Planes de Pago
            </h1>
            <p className="text-gray-600 mt-2">Administra los planes de suscripción disponibles</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Crear Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Plan de Pago</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nombre del Plan *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Plan Básico"
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Precio *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="29.99"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción del plan..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="max_contacts">Máx. Contactos *</Label>
                    <Input
                      id="max_contacts"
                      type="number"
                      value={formData.max_contacts}
                      onChange={(e) => setFormData({ ...formData, max_contacts: e.target.value })}
                      placeholder="1000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_monthly_campaigns">Máx. Campañas/Mes *</Label>
                    <Input
                      id="max_monthly_campaigns"
                      type="number"
                      value={formData.max_monthly_campaigns}
                      onChange={(e) => setFormData({ ...formData, max_monthly_campaigns: e.target.value })}
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_whatsapp_connections">Máx. Conexiones WhatsApp *</Label>
                    <Input
                      id="max_whatsapp_connections"
                      type="number"
                      value={formData.max_whatsapp_connections}
                      onChange={(e) => setFormData({ ...formData, max_whatsapp_connections: e.target.value })}
                      placeholder="5"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="max_bot_responses">Máx. Respuestas Bot *</Label>
                    <Input
                      id="max_bot_responses"
                      type="number"
                      value={formData.max_bot_responses}
                      onChange={(e) => setFormData({ ...formData, max_bot_responses: e.target.value })}
                      placeholder="500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_storage_mb">Máx. Almacenamiento (MB) *</Label>
                    <Input
                      id="max_storage_mb"
                      type="number"
                      value={formData.max_storage_mb}
                      onChange={(e) => setFormData({ ...formData, max_storage_mb: e.target.value })}
                      placeholder="1024"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_conversations">Máx. Conversaciones</Label>
                    <Input
                      id="max_conversations"
                      type="number"
                      value={formData.max_conversations}
                      onChange={(e) => setFormData({ ...formData, max_conversations: e.target.value })}
                      placeholder="100"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="max_device_sessions">Máx. Sesiones de Dispositivo</Label>
                  <Input
                    id="max_device_sessions"
                    type="number"
                    value={formData.max_device_sessions}
                    onChange={(e) => setFormData({ ...formData, max_device_sessions: e.target.value })}
                    placeholder="3"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <span className="text-sm">Activo</span>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreatePlan} disabled={creating}>
                    {creating ? "Creando..." : "Crear Plan"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar planes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="secondary">
            {filteredPlans.length} plan{filteredPlans.length !== 1 ? 'es' : ''}
          </Badge>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => (
            <Card key={plan.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="flex items-center space-x-1">
                    {plan.is_active ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-bold">${plan.price}</span>
                  <span className="text-gray-500">/mes</span>
                </div>
                {plan.description && (
                  <p className="text-gray-600 text-sm">{plan.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Limits */}
                  <div className="space-y-2">
                    {plan.max_contacts && (
                      <div className="flex justify-between text-sm">
                        <span>Contactos:</span>
                        <span className="font-medium">{plan.max_contacts}</span>
                      </div>
                    )}
                    {plan.max_monthly_campaigns && (
                      <div className="flex justify-between text-sm">
                        <span>Campañas Mensuales:</span>
                        <span className="font-medium">{plan.max_monthly_campaigns}</span>
                      </div>
                    )}
                    {plan.max_whatsapp_connections && (
                      <div className="flex justify-between text-sm">
                        <span>Conexiones WhatsApp:</span>
                        <span className="font-medium">{plan.max_whatsapp_connections}</span>
                      </div>
                    )}
                    {plan.max_bot_responses && (
                      <div className="flex justify-between text-sm">
                        <span>Respuestas Bot:</span>
                        <span className="font-medium">{plan.max_bot_responses}</span>
                      </div>
                    )}
                    {plan.max_storage_mb && (
                      <div className="flex justify-between text-sm">
                        <span>Almacenamiento:</span>
                        <span className="font-medium">{plan.max_storage_mb} MB</span>
                      </div>
                    )}
                    {plan.max_conversations && (
                      <div className="flex justify-between text-sm">
                        <span>Conversaciones:</span>
                        <span className="font-medium">{plan.max_conversations}</span>
                      </div>
                    )}
                    {plan.max_device_sessions && (
                      <div className="flex justify-between text-sm">
                        <span>Sesiones de Dispositivo:</span>
                        <span className="font-medium">{plan.max_device_sessions}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-4">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(plan)}
                        className="flex-1"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar plan?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Se eliminará permanentemente el plan de pago.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeletePlan(plan.id)}>
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <Button
                      variant={plan.is_active ? "destructive" : "default"}
                      size="sm"
                      onClick={() => handleTogglePlanStatus(plan.id, !plan.is_active)}
                      className="w-full"
                    >
                      {plan.is_active ? (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Desactivar
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Activar
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Created date */}
                  <div className="flex items-center text-xs text-gray-500 pt-2 border-t">
                    <Calendar className="h-3 w-3 mr-1" />
                    Creado: {new Date(plan.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPlans.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron planes de pago</p>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Plan de Pago</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_name">Nombre del Plan *</Label>
                  <Input
                    id="edit_name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Plan Básico"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_price">Precio *</Label>
                  <Input
                    id="edit_price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="29.99"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit_description">Descripción</Label>
                <Textarea
                  id="edit_description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción del plan..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit_max_contacts">Máx. Contactos</Label>
                  <Input
                    id="edit_max_contacts"
                    type="number"
                    value={formData.max_contacts}
                    onChange={(e) => setFormData({ ...formData, max_contacts: e.target.value })}
                    placeholder="1000"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_max_monthly_campaigns">Máx. Campañas Mensuales</Label>
                  <Input
                    id="edit_max_monthly_campaigns"
                    type="number"
                    value={formData.max_monthly_campaigns}
                    onChange={(e) => setFormData({ ...formData, max_monthly_campaigns: e.target.value })}
                    placeholder="50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <span className="text-sm">Activo</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit_max_whatsapp_connections">Máx. Conexiones WhatsApp</Label>
                  <Input
                    id="edit_max_whatsapp_connections"
                    type="number"
                    value={formData.max_whatsapp_connections}
                    onChange={(e) => setFormData({ ...formData, max_whatsapp_connections: e.target.value })}
                    placeholder="5"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_max_bot_responses">Máx. Respuestas Bot</Label>
                  <Input
                    id="edit_max_bot_responses"
                    type="number"
                    value={formData.max_bot_responses}
                    onChange={(e) => setFormData({ ...formData, max_bot_responses: e.target.value })}
                    placeholder="1000"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_max_storage_mb">Máx. Almacenamiento (MB)</Label>
                  <Input
                    id="edit_max_storage_mb"
                    type="number"
                    value={formData.max_storage_mb}
                    onChange={(e) => setFormData({ ...formData, max_storage_mb: e.target.value })}
                    placeholder="1024"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_max_conversations">Máx. Conversaciones</Label>
                  <Input
                    id="edit_max_conversations"
                    type="number"
                    value={formData.max_conversations}
                    onChange={(e) => setFormData({ ...formData, max_conversations: e.target.value })}
                    placeholder="500"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_max_device_sessions">Máx. Sesiones de Dispositivo</Label>
                  <Input
                    id="edit_max_device_sessions"
                    type="number"
                    value={formData.max_device_sessions}
                    onChange={(e) => setFormData({ ...formData, max_device_sessions: e.target.value })}
                    placeholder="3"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdatePlan} disabled={updating}>
                  {updating ? "Actualizando..." : "Actualizar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
  );
};

export default AdminPaymentPlans;