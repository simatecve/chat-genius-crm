import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Upload, Users, FileText, Loader2, X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Database } from '@/integrations/supabase/types';

type ContactList = Database['public']['Tables']['contact_lists']['Row'];
type WhatsAppConnection = Database['public']['Tables']['whatsapp_connections']['Row'];

interface ManualContact {
  phone: string;
  name: string;
}

const CreateMassCampaign = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [whatsappConnections, setWhatsappConnections] = useState<WhatsAppConnection[]>([]);
  
  const [contactMode, setContactMode] = useState<'list' | 'manual' | 'csv'>('list');
  const [manualContacts, setManualContacts] = useState<ManualContact[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    contact_list_id: '',
    whatsapp_connection_name: '',
    message: '',
    edit_with_ai: false,
    min_delay: 1,
    max_delay: 5,
  });

  useEffect(() => {
    if (user) {
      loadData();
      if (isEditing && id) {
        loadCampaign(id);
      } else {
        setLoading(false);
      }
    }
  }, [user, id, isEditing]);

  const loadData = async () => {
    try {
      const [listsResult, connectionsResult] = await Promise.all([
        supabase
          .from('contact_lists')
          .select('*')
          .eq('user_id', user?.id)
          .order('name'),
        supabase
          .from('whatsapp_connections')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
      ]);

      if (listsResult.error) throw listsResult.error;
      if (connectionsResult.error) throw connectionsResult.error;

      setContactLists(listsResult.data || []);
      setWhatsappConnections(connectionsResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive',
      });
    }
  };

  const loadCampaign = async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from('mass_campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          name: data.name,
          description: data.description || '',
          contact_list_id: data.contact_list_id || '',
          whatsapp_connection_name: data.whatsapp_connection_name || '',
          message: data.message,
          edit_with_ai: data.edit_with_ai || false,
          min_delay: data.min_delay || 1,
          max_delay: data.max_delay || 5,
        });
      }
    } catch (error) {
      console.error('Error loading campaign:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la campaña',
        variant: 'destructive',
      });
      navigate('/campanas-masivas');
    } finally {
      setLoading(false);
    }
  };

  const handleAddManualContact = () => {
    setManualContacts([...manualContacts, { phone: '', name: '' }]);
  };

  const handleRemoveManualContact = (index: number) => {
    setManualContacts(manualContacts.filter((_, i) => i !== index));
  };

  const handleManualContactChange = (index: number, field: 'phone' | 'name', value: string) => {
    const updated = [...manualContacts];
    updated[index][field] = value;
    setManualContacts(updated);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      toast({
        title: 'Archivo cargado',
        description: `${file.name} listo para procesar`,
      });
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre de la campaña es requerido',
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.message.trim()) {
      toast({
        title: 'Error',
        description: 'El mensaje es requerido',
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.whatsapp_connection_name) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar una sesión de WhatsApp',
        variant: 'destructive',
      });
      return false;
    }

    if (contactMode === 'list' && !formData.contact_list_id) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar una lista de contactos',
        variant: 'destructive',
      });
      return false;
    }

    if (contactMode === 'manual' && manualContacts.length === 0) {
      toast({
        title: 'Error',
        description: 'Debe agregar al menos un contacto',
        variant: 'destructive',
      });
      return false;
    }

    if (contactMode === 'csv' && !csvFile) {
      toast({
        title: 'Error',
        description: 'Debe cargar un archivo CSV',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSaving(true);

    try {
      // Aquí procesaríamos los contactos según el modo seleccionado
      let contactListId = formData.contact_list_id;

      // Si es modo manual o CSV, crear una lista temporal
      if (contactMode === 'manual' || contactMode === 'csv') {
        const listName = `${formData.name} - ${new Date().toLocaleDateString()}`;
        const { data: newList, error: listError } = await supabase
          .from('contact_lists')
          .insert({
            user_id: user?.id,
            name: listName,
            description: `Lista creada automáticamente para campaña: ${formData.name}`
          })
          .select()
          .single();

        if (listError) throw listError;
        contactListId = newList.id;

        // Procesar contactos manuales
        if (contactMode === 'manual') {
          const contactsToInsert = manualContacts
            .filter(c => c.phone.trim())
            .map(c => ({
              user_id: user?.id,
              phone_number: c.phone.trim(),
              name: c.name.trim() || c.phone.trim()
            }));

          if (contactsToInsert.length > 0) {
            const { data: insertedContacts, error: contactsError } = await supabase
              .from('contacts')
              .insert(contactsToInsert)
              .select();

            if (contactsError) throw contactsError;

            const membersToInsert = insertedContacts.map(contact => ({
              contact_list_id: contactListId,
              contact_id: contact.id
            }));

            const { error: membersError } = await supabase
              .from('contact_list_members')
              .insert(membersToInsert);

            if (membersError) throw membersError;
          }
        }

        // TODO: Procesar CSV
        if (contactMode === 'csv' && csvFile) {
          toast({
            title: 'Información',
            description: 'El procesamiento de CSV se implementará próximamente',
          });
        }
      }

      const campaignData = {
        user_id: user?.id,
        name: formData.name.trim(),
        description: formData.description.trim(),
        message: formData.message.trim(),
        campaign_message: formData.message.trim(),
        whatsapp_connection_name: formData.whatsapp_connection_name,
        contact_list_id: contactListId,
        edit_with_ai: formData.edit_with_ai,
        min_delay: formData.min_delay,
        max_delay: formData.max_delay,
        status: 'ready'
      };

      if (isEditing && id) {
        const { error } = await supabase
          .from('mass_campaigns')
          .update(campaignData)
          .eq('id', id)
          .eq('user_id', user?.id);

        if (error) throw error;

        toast({
          title: 'Éxito',
          description: 'Campaña actualizada correctamente',
        });
      } else {
        const { error } = await supabase
          .from('mass_campaigns')
          .insert([campaignData]);

        if (error) throw error;

        toast({
          title: 'Éxito',
          description: 'Campaña creada correctamente',
        });
      }

      navigate('/campanas-masivas');
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la campaña',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/campanas-masivas')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isEditing ? 'Editar Campaña Masiva' : 'Nueva Campaña Masiva'}
            </h1>
            <p className="text-muted-foreground">
              Configure los detalles de su campaña de WhatsApp
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre de la Campaña *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Promoción Black Friday"
                  className="bg-background border-border"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción opcional de la campaña"
                  className="bg-background border-border"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Contactos</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={contactMode} onValueChange={(value: any) => setContactMode(value)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="list">
                    <Users className="h-4 w-4 mr-2" />
                    Lista Existente
                  </TabsTrigger>
                  <TabsTrigger value="manual">
                    <Plus className="h-4 w-4 mr-2" />
                    Manual
                  </TabsTrigger>
                  <TabsTrigger value="csv">
                    <FileText className="h-4 w-4 mr-2" />
                    CSV
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="space-y-4">
                  <div>
                    <Label htmlFor="contact_list">Seleccionar Lista de Contactos *</Label>
                    <Select
                      value={formData.contact_list_id}
                      onValueChange={(value) => setFormData({ ...formData, contact_list_id: value })}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Selecciona una lista" />
                      </SelectTrigger>
                      <SelectContent>
                        {contactLists.map((list) => (
                          <SelectItem key={list.id} value={list.id}>
                            {list.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="manual" className="space-y-4">
                  <div className="space-y-3">
                    {manualContacts.map((contact, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Teléfono con código país (ej: 5491123456789)"
                          value={contact.phone}
                          onChange={(e) => handleManualContactChange(index, 'phone', e.target.value)}
                          className="flex-1 bg-background border-border"
                        />
                        <Input
                          placeholder="Nombre (opcional)"
                          value={contact.name}
                          onChange={(e) => handleManualContactChange(index, 'name', e.target.value)}
                          className="flex-1 bg-background border-border"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleRemoveManualContact(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddManualContact}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Contacto
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="csv" className="space-y-4">
                  <div>
                    <Label htmlFor="csv">Cargar Archivo CSV</Label>
                    <div className="mt-2">
                      <Input
                        id="csv"
                        type="file"
                        accept=".csv"
                        onChange={handleCsvUpload}
                        className="bg-background border-border"
                      />
                    </div>
                    {csvFile && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Archivo seleccionado: {csvFile.name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      El CSV debe tener columnas: telefono, nombre
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Configuración de WhatsApp</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="whatsapp_connection">Sesión de WhatsApp *</Label>
                {whatsappConnections.length === 0 ? (
                  <div className="p-4 border border-border rounded-md bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      No hay sesiones de WhatsApp configuradas.{' '}
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-primary"
                        onClick={() => navigate('/conexiones-whatsapp')}
                      >
                        Crear una sesión
                      </Button>
                    </p>
                  </div>
                ) : (
                  <Select
                    value={formData.whatsapp_connection_name}
                    onValueChange={(value) => setFormData({ ...formData, whatsapp_connection_name: value })}
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Selecciona una sesión" />
                    </SelectTrigger>
                    <SelectContent>
                      {whatsappConnections.map((connection) => {
                        const sessionName = connection.name || connection.phone_number;
                        
                        return (
                          <SelectItem 
                            key={connection.id} 
                            value={sessionName}
                          >
                            {sessionName}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <Label htmlFor="message">Mensaje de la Campaña *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Escribe el mensaje que se enviará a los contactos"
                  className="bg-background border-border"
                  rows={5}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit_with_ai"
                  checked={formData.edit_with_ai}
                  onCheckedChange={(checked) => setFormData({ ...formData, edit_with_ai: checked })}
                />
                <Label htmlFor="edit_with_ai" className="cursor-pointer">
                  Editar mensaje con IA (personalización automática)
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min_delay">Delay Mínimo (segundos) *</Label>
                  <Input
                    id="min_delay"
                    type="number"
                    value={formData.min_delay}
                    onChange={(e) => setFormData({ ...formData, min_delay: parseInt(e.target.value) || 1 })}
                    min="1"
                    className="bg-background border-border"
                  />
                </div>
                <div>
                  <Label htmlFor="max_delay">Delay Máximo (segundos) *</Label>
                  <Input
                    id="max_delay"
                    type="number"
                    value={formData.max_delay}
                    onChange={(e) => setFormData({ ...formData, max_delay: parseInt(e.target.value) || 5 })}
                    min="1"
                    className="bg-background border-border"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/campanas-masivas')}
              className="border-border"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-primary hover:bg-primary/90"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                isEditing ? 'Actualizar Campaña' : 'Crear Campaña'
              )}
            </Button>
          </div>
        </form>
      </div>
  );
};

export default CreateMassCampaign;
