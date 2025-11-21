import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Search, Send, Edit, Trash2, MessageSquare, Users, Clock } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';


type Campaign = Database['public']['Tables']['mass_campaigns']['Row'];
type ContactList = Database['public']['Tables']['contact_lists']['Row'];

export function Campaigns() {
  const { effectiveUserId } = useEffectiveUserId();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingCampaign, setSendingCampaign] = useState<string | null>(null);

  useEffect(() => {
    if (effectiveUserId) {
      fetchCampaigns();
      fetchContactLists();
    }
  }, [effectiveUserId]);

  const fetchCampaigns = async () => {
    if (!effectiveUserId) return;
    
    try {
      const { data, error } = await supabase
        .from('mass_campaigns')
        .select('*')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las campañas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchContactLists = async () => {
    if (!effectiveUserId) return;
    
    try {
      const { data, error } = await supabase
        .from('contact_lists')
        .select('*')
        .eq('user_id', effectiveUserId)
        .order('name');

      if (error) throw error;
      setContactLists(data || []);
    } catch (error) {
      console.error('Error fetching contact lists:', error);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta campaña?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('mass_campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      setCampaigns(campaigns.filter(c => c.id !== campaignId));
      toast({
        title: 'Éxito',
        description: 'Campaña eliminada correctamente',
      });
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la campaña',
        variant: 'destructive',
      });
    }
  };

  const handleSendCampaign = async (campaign: Campaign) => {
    setSendingCampaign(campaign.id);
    
    try {
      // Cambiar el estado a 'sending' al iniciar el proceso
      const { error: updateError } = await supabase
        .from('mass_campaigns')
        .update({ status: 'sending' })
        .eq('id', campaign.id);

      if (updateError) throw updateError;

      // Actualizar la campaña en el estado local
      setCampaigns(campaigns.map(c => 
        c.id === campaign.id ? { ...c, status: 'sending' } : c
      ));

      const response = await fetch('https://n8n.kanbanpro.com.ar/webhook/envio-masivo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaign_id: campaign.id,
          name: campaign.name,
          description: campaign.description,
          whatsapp_connection_name: campaign.whatsapp_connection_name,
          campaign_message: campaign.campaign_message,
          edit_with_ai: campaign.edit_with_ai,
          min_delay: campaign.min_delay,
          max_delay: campaign.max_delay,
          contact_list_id: campaign.contact_list_id,
          attachment_urls: campaign.attachment_urls,
          attachment_names: campaign.attachment_names,
          user_id: campaign.user_id
        }),
      });

      if (!response.ok) {
        throw new Error('Error en el envío');
      }

      toast({
        title: 'Éxito',
        description: 'Campaña iniciada correctamente. El estado se actualizará automáticamente.',
      });
    } catch (error) {
      console.error('Error sending campaign:', error);
      
      // Si hay error, revertir el estado a 'ready'
      const { error: revertError } = await supabase
        .from('mass_campaigns')
        .update({ status: 'ready' })
        .eq('id', campaign.id);

      if (!revertError) {
        setCampaigns(campaigns.map(c => 
          c.id === campaign.id ? { ...c, status: 'ready' } : c
        ));
      }

      toast({
        title: 'Error',
        description: 'No se pudo enviar la campaña',
        variant: 'destructive',
      });
    } finally {
      setSendingCampaign(null);
    }
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getContactListName = (listId: string | null) => {
    if (!listId) return 'Sin lista asignada';
    const list = contactLists.find(l => l.id === listId);
    return list?.name || 'Lista no encontrada';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Borrador', variant: 'secondary' as const },
      ready: { label: 'Lista', variant: 'default' as const },
      sending: { label: 'Enviando', variant: 'default' as const },
      sent: { label: 'Enviada', variant: 'default' as const },
      failed: { label: 'Fallida', variant: 'destructive' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Campañas Masivas</h1>
            <p className="text-muted-foreground">Gestiona tus campañas de WhatsApp</p>
          </div>
          <Button 
            onClick={() => navigate('/crear-campana')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Campaña
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar campañas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background border-border"
          />
        </div>

        {/* Campaigns Grid */}
        {filteredCampaigns.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchTerm ? 'No se encontraron campañas' : 'No tienes campañas aún'}
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm 
                  ? 'Intenta con otros términos de búsqueda'
                  : 'Crea tu primera campaña masiva para comenzar'
                }
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => navigate('/crear-campana')}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primera Campaña
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCampaigns.map((campaign) => (
              <Card key={campaign.id} className="border-border hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-foreground mb-1">
                        {campaign.name}
                      </CardTitle>
                      {campaign.description && (
                        <CardDescription className="text-sm text-muted-foreground">
                          {campaign.description}
                        </CardDescription>
                      )}
                    </div>
                    {getStatusBadge(campaign.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {getContactListName(campaign.contact_list_id)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {campaign.whatsapp_connection_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {campaign.min_delay}ms - {campaign.max_delay}ms
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/crear-campana/${campaign.id}`)}
                      className="flex-1 border-border hover:bg-accent"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      className="border-border hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {campaign.status !== 'sent' && (
                    <Button
                      onClick={() => handleSendCampaign(campaign)}
                      disabled={sendingCampaign === campaign.id}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      {sendingCampaign === campaign.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Enviar Campaña
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    
  );
}

export default Campaigns;