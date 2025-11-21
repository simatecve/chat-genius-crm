import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Bot, Save, X, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

const CreateAIAgent = () => {
  const navigate = useNavigate();
  const [whatsappConnections, setWhatsappConnections] = useState<WhatsAppConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    whatsapp_connection_id: 'none',
    instructions: '',
    message_delay: 1,
    is_active: false
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadWhatsAppConnections();
    } else {
      // Si no hay usuario, no estamos cargando
      setLoading(false);
    }
  }, [user]);

  const loadWhatsAppConnections = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWhatsappConnections(data || []);
    } catch (error) {
      console.error('Error loading WhatsApp connections:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las conexiones de WhatsApp",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
      setCreating(true);
      await createAgent();
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

      toast({
        title: "Éxito",
        description: "Agente de IA creado correctamente"
      });

      // Navegar de regreso a la página de agentes
      setTimeout(() => {
        navigate('/asistente-ia');
      }, 1500);
      
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

  const handleCancel = () => {
    navigate('/asistente-ia');
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </div>
    );
  }

  return (
    
      <div className="space-y-6">
        <div className="flex items-center space-x-3 mb-6">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Agentes
          </Button>
        </div>
        <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Crear Nuevo Agente de IA</CardTitle>
                  <p className="text-muted-foreground mt-1">
                    Configura un nuevo asistente de inteligencia artificial
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
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
                  rows={8}
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
              
              <div className="flex justify-end space-x-2 pt-6 border-t">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Crear Agente
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        </div>
      </div>
    
  );
};

export default CreateAIAgent;