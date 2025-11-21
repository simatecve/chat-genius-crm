import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, X } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type Campaign = Database['public']['Tables']['mass_campaigns']['Row'];
type ContactList = Database['public']['Tables']['contact_lists']['Row'];
type WhatsAppConnection = Database['public']['Tables']['whatsapp_connections']['Row'];

interface CreateCampaignProps {
  campaign?: Campaign | null;
  contactLists: ContactList[];
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateCampaign({ campaign, contactLists, onClose, onSuccess }: CreateCampaignProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [whatsappConnections, setWhatsappConnections] = useState<WhatsAppConnection[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    whatsapp_connection_name: '',
    campaign_message: '',
    edit_with_ai: false,
    min_delay: 1000,
    max_delay: 5000,
    status: 'draft',
    contact_list_id: '',
    attachment_urls: [] as string[],
    attachment_names: [] as string[],
  });

  useEffect(() => {
    fetchWhatsAppConnections();
    
    if (campaign) {
      setFormData({
        name: campaign.name,
        description: campaign.description || '',
        whatsapp_connection_name: campaign.whatsapp_connection_name,
        campaign_message: campaign.campaign_message,
        edit_with_ai: campaign.edit_with_ai,
        min_delay: campaign.min_delay,
        max_delay: campaign.max_delay,
        status: campaign.status,
        contact_list_id: campaign.contact_list_id || '',
        attachment_urls: campaign.attachment_urls || [],
        attachment_names: campaign.attachment_names || [],
      });
    }
  }, [campaign]);

  const fetchWhatsAppConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'connected')
        .order('name');

      if (error) throw error;
      setWhatsappConnections(data || []);
    } catch (error) {
      console.error('Error fetching WhatsApp connections:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre de la campaña es requerido',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.whatsapp_connection_name) {
      toast({
        title: 'Error',
        description: 'Debes seleccionar una conexión de WhatsApp',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.campaign_message.trim()) {
      toast({
        title: 'Error',
        description: 'El mensaje de la campaña es requerido',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const campaignData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        whatsapp_connection_name: formData.whatsapp_connection_name,
        campaign_message: formData.campaign_message.trim(),
        edit_with_ai: formData.edit_with_ai,
        min_delay: formData.min_delay,
        max_delay: formData.max_delay,
        status: formData.status,
        contact_list_id: formData.contact_list_id || null,
        attachment_urls: formData.attachment_urls,
        attachment_names: formData.attachment_names,
        user_id: user?.id,
      };

      if (campaign) {
        // Actualizar campaña existente
        const { error } = await supabase
          .from('mass_campaigns')
          .update(campaignData)
          .eq('id', campaign.id);

        if (error) throw error;

        toast({
          title: 'Éxito',
          description: 'Campaña actualizada correctamente',
        });
      } else {
        // Crear nueva campaña
        const { error } = await supabase
          .from('mass_campaigns')
          .insert([campaignData]);

        if (error) throw error;

        toast({
          title: 'Éxito',
          description: 'Campaña creada correctamente',
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast({
        title: 'Error',
        description: campaign ? 'No se pudo actualizar la campaña' : 'No se pudo crear la campaña',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {campaign ? 'Editar Campaña' : 'Nueva Campaña Masiva'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-foreground">Nombre de la campaña *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ej: Promoción Black Friday"
                className="bg-background border-border"
                required
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-foreground">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descripción opcional de la campaña"
                className="bg-background border-border"
                rows={3}
              />
            </div>
          </div>

          {/* Configuración de WhatsApp */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="whatsapp_connection" className="text-foreground">Conexión de WhatsApp *</Label>
              <Select
                value={formData.whatsapp_connection_name}
                onValueChange={(value) => handleInputChange('whatsapp_connection_name', value)}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecciona una conexión" />
                </SelectTrigger>
                <SelectContent>
                  {whatsappConnections.map((connection) => (
                    <SelectItem key={connection.id} value={connection.name}>
                      {connection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="contact_list" className="text-foreground">Lista de contactos</Label>
              <Select
                value={formData.contact_list_id}
                onValueChange={(value) => handleInputChange('contact_list_id', value)}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecciona una lista (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin lista específica</SelectItem>
                  {contactLists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mensaje */}
          <div>
            <Label htmlFor="campaign_message" className="text-foreground">Mensaje de la campaña *</Label>
            <Textarea
              id="campaign_message"
              value={formData.campaign_message}
              onChange={(e) => handleInputChange('campaign_message', e.target.value)}
              placeholder="Escribe el mensaje que se enviará a los contactos"
              className="bg-background border-border"
              rows={5}
              required
            />
          </div>

          {/* Configuración avanzada */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="edit_with_ai"
                checked={formData.edit_with_ai}
                onCheckedChange={(checked) => handleInputChange('edit_with_ai', checked)}
              />
              <Label htmlFor="edit_with_ai" className="text-foreground">
                Editar con IA
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min_delay" className="text-foreground">Delay mínimo (ms)</Label>
                <Input
                  id="min_delay"
                  type="number"
                  value={formData.min_delay}
                  onChange={(e) => handleInputChange('min_delay', parseInt(e.target.value) || 1000)}
                  min="100"
                  className="bg-background border-border"
                />
              </div>
              <div>
                <Label htmlFor="max_delay" className="text-foreground">Delay máximo (ms)</Label>
                <Input
                  id="max_delay"
                  type="number"
                  value={formData.max_delay}
                  onChange={(e) => handleInputChange('max_delay', parseInt(e.target.value) || 5000)}
                  min="100"
                  className="bg-background border-border"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status" className="text-foreground">Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="ready">Lista</SelectItem>
                  <SelectItem value="sending">Enviando</SelectItem>
                  <SelectItem value="sent">Enviada</SelectItem>
                  <SelectItem value="failed">Fallida</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-border hover:bg-accent"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {campaign ? 'Actualizando...' : 'Creando...'}
                </>
              ) : (
                campaign ? 'Actualizar Campaña' : 'Crear Campaña'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateCampaign;