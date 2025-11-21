import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Bot, Trash2, Edit, MessageSquare, Clock, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';


import { Tables } from '@/integrations/supabase/types';

// Interfaces TypeScript basadas en la estructura de la BD
interface AIAgent {
  id: string;
  user_id: string;
  name: string;
  whatsapp_connection_id: string | null;
  instructions: string;
  message_delay: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  whatsapp_connection_name: string | null;
}

interface WhatsAppConnection {
  id: string;
  name: string;
  phone_number: string;
  status: string | null;
}

interface FormData {
  name: string;
  whatsapp_connection_id: string;
  instructions: string;
  message_delay: number;
  is_active: boolean;
}

const AIAgents = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [whatsappConnections, setWhatsappConnections] = useState<WhatsAppConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    whatsapp_connection_id: 'none',
    instructions: '',
    message_delay: 1,
    is_active: false
  });
  const { toast } = useToast();
  const { user } = useAuth();

  // Cargar agentes y conexiones de WhatsApp
  useEffect(() => {
    if (user) {
      loadAgents();
      loadWhatsAppConnections();
    }
  }, [user]);



  const loadAgents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_bots')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error loading agents:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los agentes de IA",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadWhatsAppConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('id, name, phone_number, status')
        .eq('user_id', user?.id)
        .eq('status', 'conectado');

      if (error) throw error;
      setWhatsappConnections(data || []);
    } catch (error) {
      console.error('Error loading WhatsApp connections:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las conexiones de WhatsApp",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.instructions.trim()) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingAgent) {
        setUpdating(true);
        await updateAgent();
      } else {
        setCreating(true);
        await createAgent();
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const createAgent = async () => {
    try {
      const whatsappConnection = whatsappConnections.find(conn => conn.id === formData.whatsapp_connection_id);
      
      const { data, error } = await supabase
        .from('ai_bots')
        .insert({
          user_id: user?.id!,
          name: formData.name.trim(),
          whatsapp_connection_id: formData.whatsapp_connection_id === 'none' ? null : formData.whatsapp_connection_id || null,
          whatsapp_connection_name: whatsappConnection?.name || null,
          instructions: formData.instructions.trim(),
          message_delay: formData.message_delay * 1000,
          is_active: formData.is_active
        })
        .select()
        .single();

      if (error) throw error;

      setAgents(prev => [data, ...prev]);
      resetForm();
      setDialogOpen(false);
      
      toast({
        title: "Éxito",
        description: "Agente de IA creado correctamente"
      });
    } catch (error: any) {
      console.error('Error creating agent:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el agente de IA",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const updateAgent = async () => {
    if (!editingAgent) return;

    try {
      const whatsappConnection = whatsappConnections.find(conn => conn.id === formData.whatsapp_connection_id);
      
      const { data, error } = await supabase
        .from('ai_bots')
        .update({
          name: formData.name.trim(),
          whatsapp_connection_id: formData.whatsapp_connection_id === 'none' ? null : formData.whatsapp_connection_id || null,
          whatsapp_connection_name: whatsappConnection?.name || null,
          instructions: formData.instructions.trim(),
          message_delay: formData.message_delay * 1000,
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingAgent.id)
        .eq('user_id', user?.id)
        .select()
        .single();

      if (error) throw error;

      setAgents(prev => prev.map(agent => 
        agent.id === editingAgent.id ? data : agent
      ));
      resetForm();
      setDialogOpen(false);
      setEditingAgent(null);
      
      toast({
        title: "Éxito",
        description: "Agente de IA actualizado correctamente"
      });
    } catch (error: any) {
      console.error('Error updating agent:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el agente de IA",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const deleteAgent = async (agentId: string) => {
    try {
      setDeleting(agentId);
      
      const { error } = await supabase
        .from('ai_bots')
        .delete()
        .eq('id', agentId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setAgents(prev => prev.filter(agent => agent.id !== agentId));
      
      toast({
        title: "Éxito",
        description: "Agente de IA eliminado correctamente"
      });
    } catch (error: any) {
      console.error('Error deleting agent:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el agente de IA",
        variant: "destructive"
      });
    } finally {
      setDeleting(null);
    }
  };

  const toggleAgentStatus = async (agent: AIAgent) => {
    try {
      const { error } = await supabase
        .from('ai_bots')
        .update({ 
          is_active: !agent.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', agent.id)
        .eq('user_id', user?.id);

      if (error) throw error;

      setAgents(prev => prev.map(a => 
        a.id === agent.id ? { ...a, is_active: !a.is_active } : a
      ));
      
      toast({
        title: "Éxito",
        description: `Agente ${!agent.is_active ? 'activado' : 'desactivado'} correctamente`
      });
    } catch (error: any) {
      console.error('Error toggling agent status:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo cambiar el estado del agente",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (agent: AIAgent) => {
    setEditingAgent(agent);
    setFormData({
        name: agent.name,
        whatsapp_connection_id: agent.whatsapp_connection_id || 'none',
        instructions: agent.instructions,
        message_delay: Math.round(agent.message_delay / 1000),
        is_active: agent.is_active
      });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      whatsapp_connection_id: 'none',
      instructions: '',
      message_delay: 1,
      is_active: false
    });
    setEditingAgent(null);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    resetForm();
  };

  const navigateToCreateAgent = () => {
    navigate('/crear-agente');
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">Cargando agentes de IA...</p>
          </div>
        </div>
    );
  }

  return (
    
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agentes de IA</h1>
            <p className="text-muted-foreground">
              Gestiona tus asistentes de inteligencia artificial para WhatsApp
            </p>
          </div>
          
          <Button onClick={navigateToCreateAgent}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Agente
          </Button>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingAgent ? 'Editar Agente de IA' : 'Crear Nuevo Agente de IA'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre del Agente *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ej: Asistente de Ventas"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp_connection">Conexión WhatsApp</Label>
                    <Select
                      value={formData.whatsapp_connection_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, whatsapp_connection_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar conexión" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin conexión</SelectItem>
                        {whatsappConnections.map((connection) => (
                          <SelectItem key={connection.id} value={connection.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{connection.name} ({connection.phone_number})</span>
                              <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                                connection.status === 'conectado' 
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {connection.status || 'desconectado'}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="instructions">Instrucciones del Agente *</Label>
                  <Textarea
                    id="instructions"
                    value={formData.instructions}
                    onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                    placeholder="Describe cómo debe comportarse el agente, qué respuestas debe dar, etc."
                    rows={6}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="message_delay">Retraso de Mensaje (segundos)</Label>
                    <Input
                      id="message_delay"
                      type="number"
                      min="1"
                      max="60"
                      step="1"
                      value={formData.message_delay}
                      onChange={(e) => setFormData(prev => ({ ...prev, message_delay: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="is_active">Estado del Agente</Label>
                    <div className="flex items-center space-x-2 pt-2">
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                      />
                      <Label htmlFor="is_active" className="text-sm">
                        {formData.is_active ? 'Activo' : 'Inactivo'}
                      </Label>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={creating || updating}>
                    {creating || updating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {editingAgent ? 'Actualizando...' : 'Creando...'}
                      </>
                    ) : (
                      editingAgent ? 'Actualizar Agente' : 'Crear Agente'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de Agentes */}
        {agents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bot className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay agentes de IA</h3>
              <p className="text-muted-foreground text-center mb-4">
                Crea tu primer agente de IA para automatizar respuestas en WhatsApp
              </p>
              <Button onClick={navigateToCreateAgent}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primer Agente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <Card key={agent.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        agent.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <Bot className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {agent.whatsapp_connection_name || 'Sin conexión'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(agent)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar agente?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. El agente "{agent.name}" será eliminado permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteAgent(agent.id)}
                              className="bg-red-600 hover:bg-red-700"
                              disabled={deleting === agent.id}
                            >
                              {deleting === agent.id ? 'Eliminando...' : 'Eliminar'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {agent.instructions}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{Math.round(agent.message_delay / 1000)}s</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">
                        {agent.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                      <Switch
                        checked={agent.is_active}
                        onCheckedChange={() => toggleAgentStatus(agent)}
                      />
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Creado: {new Date(agent.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    
  );
};

export default AIAgents;