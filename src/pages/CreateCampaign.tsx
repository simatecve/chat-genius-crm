import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Send, Save, X, ArrowLeft, Upload, FileText, Image, Video, File } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Database } from '@/integrations/supabase/types';

type ContactList = Database['public']['Tables']['contact_lists']['Row'];
type WhatsAppConnection = Database['public']['Tables']['whatsapp_connections']['Row'];
type Campaign = Database['public']['Tables']['mass_campaigns']['Row'];

interface FormData {
  name: string;
  description: string;
  whatsapp_connection_name: string;
  campaign_message: string;
  edit_with_ai: boolean;
  min_delay: number;
  max_delay: number;
  status: 'draft' | 'active' | 'paused' | 'completed';
  attachment_urls: string[];
  attachment_names: string[];
  contact_list_id: string;
}

const CreateCampaign = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [whatsappConnections, setWhatsappConnections] = useState<WhatsAppConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    whatsapp_connection_name: '',
    campaign_message: '',
    edit_with_ai: false,
    min_delay: 1,
    max_delay: 5,
    status: 'draft',
    attachment_urls: [],
    attachment_names: [],
    contact_list_id: ''
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadData();
      if (isEditing && id) {
        loadCampaign(id);
      }
    } else {
      setLoading(false);
    }
  }, [user, id, isEditing]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const uploadFiles = async (): Promise<{ urls: string[], names: string[] }> => {
    if (selectedFiles.length === 0) {
      return { urls: [], names: [] };
    }

    setUploadingFiles(true);
    const uploadedUrls: string[] = [];
    const uploadedNames: string[] = [];

    try {
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${user?.id}/${fileName}`;

        const { data, error } = await supabase.storage
          .from('campaign-attachments')
          .upload(filePath, file);

        if (error) {
          console.error('Error uploading file:', error);
          toast({
            title: 'Error',
            description: `Error al subir el archivo ${file.name}`,
            variant: 'destructive'
          });
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('campaign-attachments')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
        uploadedNames.push(file.name);
      }

      return { urls: uploadedUrls, names: uploadedNames };
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: 'Error',
        description: 'Error al subir los archivos',
        variant: 'destructive'
      });
      return { urls: [], names: [] };
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <Image className="h-4 w-4" />;
    }
    if (['mp4', 'avi', 'mov', 'wmv'].includes(ext || '')) {
      return <Video className="h-4 w-4" />;
    }
    if (['pdf'].includes(ext || '')) {
      return <FileText className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar listas de contactos
      const { data: contactListsData, error: contactListsError } = await supabase
        .from('contact_lists')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (contactListsError) {
        console.error('Error loading contact lists:', contactListsError);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las listas de contactos',
          variant: 'destructive'
        });
      } else {
        setContactLists(contactListsData || []);
      }

      // Cargar conexiones de WhatsApp
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (connectionsError) {
        console.error('Error loading WhatsApp connections:', connectionsError);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las conexiones de WhatsApp',
          variant: 'destructive'
        });
      } else {
        setWhatsappConnections(connectionsData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar los datos',
        variant: 'destructive'
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

      if (error) {
        console.error('Error loading campaign:', error);
        toast({
          title: 'Error',
          description: 'No se pudo cargar la campaña',
          variant: 'destructive'
        });
        navigate('/campanas-masivas');
        return;
      }

      if (data) {
        setFormData({
          name: data.name,
          description: data.description || '',
          whatsapp_connection_name: data.whatsapp_connection_name,
          campaign_message: data.campaign_message,
          edit_with_ai: data.edit_with_ai,
          min_delay: data.min_delay,
          max_delay: data.max_delay,
          status: data.status as 'draft' | 'active' | 'paused' | 'completed',
          attachment_urls: data.attachment_urls || [],
          attachment_names: data.attachment_names || [],
          contact_list_id: data.contact_list_id || ''
        });
      }
    } catch (error) {
      console.error('Error loading campaign:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar la campaña',
        variant: 'destructive'
      });
      navigate('/campanas-masivas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre de la campaña es requerido',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.campaign_message.trim()) {
      toast({
        title: 'Error',
        description: 'El mensaje de la campaña es requerido',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.contact_list_id) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar una lista de contactos',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.whatsapp_connection_name) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar una conexión de WhatsApp',
        variant: 'destructive'
      });
      return;
    }

    try {
      setCreating(true);
      
      // Subir archivos si hay alguno seleccionado
      const { urls, names } = await uploadFiles();
      
      const campaignData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        whatsapp_connection_name: formData.whatsapp_connection_name,
        campaign_message: formData.campaign_message.trim(),
        edit_with_ai: formData.edit_with_ai,
        min_delay: formData.min_delay,
        max_delay: formData.max_delay,
        status: formData.status,
        attachment_urls: urls.length > 0 ? urls : formData.attachment_urls,
        attachment_names: names.length > 0 ? names : formData.attachment_names,
        contact_list_id: formData.contact_list_id
      };

      if (isEditing && id) {
        // Actualizar campaña existente
        const { error } = await supabase
          .from('mass_campaigns')
          .update(campaignData)
          .eq('id', id)
          .eq('user_id', user?.id);

        if (error) {
          console.error('Error updating campaign:', error);
          toast({
            title: 'Error',
            description: 'No se pudo actualizar la campaña',
            variant: 'destructive'
          });
          return;
        }

        toast({
          title: 'Éxito',
          description: 'Campaña actualizada exitosamente'
        });
      } else {
        // Crear nueva campaña
        const { error } = await supabase
          .from('mass_campaigns')
          .insert({
            user_id: user?.id,
            ...campaignData
          });

        if (error) {
          console.error('Error creating campaign:', error);
          toast({
            title: 'Error',
            description: 'No se pudo crear la campaña',
            variant: 'destructive'
          });
          return;
        }

        toast({
          title: 'Éxito',
          description: 'Campaña creada exitosamente'
        });
      }
      
      navigate('/campanas-masivas');
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast({
        title: 'Error',
        description: `Error al ${isEditing ? 'actualizar' : 'crear'} la campaña`,
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = () => {
    navigate('/campanas-masivas');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isEditing ? 'Editar Campaña' : 'Crear Nueva Campaña'}
              </h1>
              <p className="text-muted-foreground">
                {isEditing ? 'Modifica los detalles de tu campaña' : 'Configure los detalles de su campaña masiva'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card className="border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center space-x-2 text-foreground">
              <Send className="h-5 w-5 text-primary" />
              <span>Detalles de la Campaña</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground">Nombre de la Campaña *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Promoción Black Friday"
                    className="bg-background border-input text-foreground"
                    required
                  />
                </div>

                {/* Estado */}
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-foreground">Estado</Label>
                  <Select value={formData.status} onValueChange={(value: 'draft' | 'active' | 'paused' | 'completed') => setFormData({ ...formData, status: value })}>
                    <SelectTrigger className="bg-background border-input text-foreground">
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Borrador</SelectItem>
                      <SelectItem value="active">Activa</SelectItem>
                      <SelectItem value="paused">Pausada</SelectItem>
                      <SelectItem value="completed">Completada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-foreground">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción opcional de la campaña"
                  className="bg-background border-input text-foreground min-h-[80px]"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Conexión WhatsApp */}
                <div className="space-y-2">
                  <Label htmlFor="whatsapp_connection" className="text-foreground">Conexión WhatsApp *</Label>
                  <Select value={formData.whatsapp_connection_name} onValueChange={(value) => setFormData({ ...formData, whatsapp_connection_name: value })}>
                    <SelectTrigger className="bg-background border-input text-foreground">
                      <SelectValue placeholder="Seleccionar conexión" />
                    </SelectTrigger>
                    <SelectContent>
                      {whatsappConnections.map((connection) => (
                        <SelectItem key={connection.id} value={connection.name}>
                          <div className="flex items-center justify-between w-full">
                            <span>{connection.name}</span>
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                              connection.status === 'connected'
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

                {/* Lista de Contactos */}
                <div className="space-y-2">
                  <Label htmlFor="contact_list" className="text-foreground">Lista de Contactos *</Label>
                  <Select value={formData.contact_list_id} onValueChange={(value) => setFormData({ ...formData, contact_list_id: value })}>
                    <SelectTrigger className="bg-background border-input text-foreground">
                      <SelectValue placeholder="Seleccionar lista" />
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
              </div>

              {/* Mensaje de la Campaña */}
              <div className="space-y-2">
                <Label htmlFor="campaign_message" className="text-foreground">Mensaje de la Campaña *</Label>
                <Textarea
                  id="campaign_message"
                  value={formData.campaign_message}
                  onChange={(e) => setFormData({ ...formData, campaign_message: e.target.value })}
                  placeholder="Escriba el mensaje que se enviará a los contactos"
                  className="bg-background border-input text-foreground min-h-[120px]"
                  rows={5}
                  required
                />
              </div>

              {/* Archivos Adjuntos */}
              <div className="space-y-2">
                <Label htmlFor="attachments" className="text-foreground">Archivos Adjuntos</Label>
                <div className="space-y-4">
                  <div className="flex items-center justify-center w-full">
                    <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-input rounded-lg cursor-pointer bg-background hover:bg-accent transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold">Haz clic para subir</span> o arrastra y suelta
                        </p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, PDF, MP4 (MAX. 10MB)</p>
                      </div>
                      <input
                        id="file-upload"
                        type="file"
                        multiple
                        accept="image/*,video/*,.pdf,.doc,.docx"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                  
                  {/* Lista de archivos seleccionados */}
                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">Archivos seleccionados:</p>
                      <div className="space-y-2">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                            <div className="flex items-center space-x-3">
                              {getFileIcon(file.name)}
                              <div>
                                <p className="text-sm font-medium text-foreground">{file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Delay Mínimo */}
                <div className="space-y-2">
                  <Label htmlFor="min_delay" className="text-foreground">Delay Mínimo (segundos)</Label>
                  <Input
                    id="min_delay"
                    type="number"
                    min="1"
                    value={formData.min_delay}
                    onChange={(e) => setFormData({ ...formData, min_delay: parseInt(e.target.value) || 1 })}
                    className="bg-background border-input text-foreground"
                  />
                </div>

                {/* Delay Máximo */}
                <div className="space-y-2">
                  <Label htmlFor="max_delay" className="text-foreground">Delay Máximo (segundos)</Label>
                  <Input
                    id="max_delay"
                    type="number"
                    min="1"
                    value={formData.max_delay}
                    onChange={(e) => setFormData({ ...formData, max_delay: parseInt(e.target.value) || 5 })}
                    className="bg-background border-input text-foreground"
                  />
                </div>

                {/* Editar con IA */}
                <div className="space-y-2">
                  <Label htmlFor="edit_with_ai" className="text-foreground">Editar con IA</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      id="edit_with_ai"
                      checked={formData.edit_with_ai}
                      onCheckedChange={(checked) => setFormData({ ...formData, edit_with_ai: checked })}
                    />
                    <span className="text-sm text-muted-foreground">
                      {formData.edit_with_ai ? 'Habilitado' : 'Deshabilitado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={creating}
                  className="border-input text-foreground hover:bg-accent"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={creating || uploadingFiles}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                      {isEditing ? 'Actualizando...' : 'Creando...'}
                    </>
                  ) : uploadingFiles ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                      Subiendo archivos...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isEditing ? 'Actualizar Campaña' : 'Crear Campaña'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
  );
};

export default CreateCampaign;