import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Search, Send, Edit, Trash2, MessageSquare, Users, Clock, Eye } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { CampaignSendSummaryModal } from '@/components/campaigns/CampaignSendSummaryModal';

type Campaign = Database['public']['Tables']['mass_campaigns']['Row'];

export function MassCampaigns() {
  const { effectiveUserId } = useEffectiveUserId();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingCampaign, setSendingCampaign] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, { queued: number; sent: number; failed: number; pending: number }>>({});
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedCampaignName, setSelectedCampaignName] = useState<string>('');

  useEffect(() => {
    if (effectiveUserId) {
      fetchCampaigns();
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
      await loadProgress(data || []);
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

  const loadProgress = async (list: Campaign[]) => {
    const entries = await Promise.all(list.map(async (c) => {
      const { data } = await supabase
        .from('campaign_sends')
        .select('id, status')
        .eq('campaign_id', c.id);
      const queued = (data || []).filter(d => d.status === 'queued').length;
      const sent = (data || []).filter(d => d.status === 'sent').length;
      const failed = (data || []).filter(d => d.status === 'failed').length;
      const pending = (data || []).filter(d => d.status === 'pending').length;
      return [c.id, { queued, sent, failed, pending }] as const;
    }));
    setProgressMap(Object.fromEntries(entries));
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
      // Iniciar el envío usando el edge function local
      const { data, error } = await supabase.functions.invoke('send-mass-campaign', {
        body: { campaign_id: campaign.id }
      });

      if (error) throw error;

      // Actualizar el estado local
      setCampaigns(campaigns.map(c => 
        c.id === campaign.id ? { ...c, status: 'sending' } : c
      ));

      toast({
        title: 'Éxito',
        description: `Campaña encolada: ${data.enqueued_count}/${data.total_count}`,
      });

      // Recargar campañas para obtener el estado actualizado
      setTimeout(() => {
        fetchCampaigns();
      }, 1000);

    } catch (error) {
      console.error('Error sending campaign:', error);
      
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

  useEffect(() => {
    const hasSending = campaigns.some(c => c.status === 'sending');
    if (!hasSending) return;
    const interval = setInterval(() => {
      fetchCampaigns();
    }, 3000);
    return () => clearInterval(interval);
  }, [campaigns]);

  const getStatusBadge = (status: string, updatedAt?: string | null) => {
    // Check if campaign is stuck in "sending" for more than 10 minutes
    const isStuck = status === 'sending' && updatedAt && 
      (Date.now() - new Date(updatedAt).getTime()) > 10 * 60 * 1000;
    
    const statusConfig = {
      draft: { label: 'Borrador', variant: 'secondary' as const },
      ready: { label: 'Lista', variant: 'default' as const },
      sending: { label: isStuck ? '⚠️ Atascada' : 'Enviando', variant: isStuck ? 'destructive' as const : 'default' as const },
      sent: { label: 'Enviada', variant: 'default' as const },
      completed: { label: 'Completada', variant: 'default' as const },
      partial: { label: 'Parcial', variant: 'secondary' as const },
      failed: { label: 'Fallida', variant: 'destructive' as const },
      error: { label: 'Error', variant: 'destructive' as const },
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Campañas Masivas</h1>
            <p className="text-muted-foreground mt-1">Gestiona tus campañas de mensajería</p>
          </div>
          <Button 
            onClick={() => navigate('/crear-campana-masiva')}
            className="bg-gradient-to-r from-primary to-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Campaña
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar campañas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {filteredCampaigns.length === 0 ? (
          <Card className="bg-gradient-to-br from-card to-card/80 border-border">
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
                  onClick={() => navigate('/crear-campana-masiva')}
                  className="bg-gradient-to-r from-primary to-primary/90"
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
              <Card key={campaign.id} className="bg-gradient-to-br from-card to-card/80 border-l-4 border-l-primary hover:shadow-lg transition-shadow rounded-xl">
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
                    {getStatusBadge(campaign.status || 'draft', campaign.updated_at)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Preview del mensaje */}
                  {campaign.message && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {campaign.message}
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">
                        {campaign.whatsapp_connection_name || campaign.channel_type || 'Sin conexión'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">
                        Delay: {campaign.min_delay}s - {campaign.max_delay}s
                      </span>
                    </div>
                    {campaign.edit_with_ai && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-primary">✨ Con IA</span>
                      </div>
                    )}
                    
                    {/* Progress Bar Visual */}
                    {(() => {
                      const progress = progressMap[campaign.id];
                      const sent = progress?.sent || 0;
                      const failed = progress?.failed || 0;
                      const pending = (progress?.pending || 0) + (progress?.queued || 0);
                      const total = sent + failed + pending || campaign.total_count || 1;
                      
                      const sentPercent = (sent / total) * 100;
                      const failedPercent = (failed / total) * 100;
                      const pendingPercent = (pending / total) * 100;
                      
                      return (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progreso</span>
                            <span>{sent + failed}/{total}</span>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden flex">
                            <div 
                              className="h-full bg-green-500 transition-all duration-300" 
                              style={{ width: `${sentPercent}%` }} 
                            />
                            <div 
                              className="h-full bg-red-500 transition-all duration-300" 
                              style={{ width: `${failedPercent}%` }} 
                            />
                            <div 
                              className="h-full bg-yellow-500 transition-all duration-300" 
                              style={{ width: `${pendingPercent}%` }} 
                            />
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-green-500">✓ {sent}</span>
                            <span className="text-red-500">✗ {failed}</span>
                            <span className="text-yellow-500">⏳ {pending}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/crear-campana-masiva/${campaign.id}`)}
                      className="flex-1 border-border hover:bg-muted"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCampaignId(campaign.id);
                        setSelectedCampaignName(campaign.name);
                      }}
                      className="border-border hover:bg-muted"
                      title="Ver detalles de envío"
                    >
                      <Eye className="h-4 w-4" />
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

                  {campaign.status !== 'sent' && campaign.status !== 'completed' && campaign.status !== 'sending' && (
                    <Button
                      onClick={() => handleSendCampaign(campaign)}
                      disabled={sendingCampaign === campaign.id}
                      className="w-full bg-gradient-to-r from-primary to-primary/90"
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

      {/* Modal de resumen */}
      <CampaignSendSummaryModal
        isOpen={!!selectedCampaignId}
        onClose={() => setSelectedCampaignId(null)}
        campaignId={selectedCampaignId || ''}
        campaignName={selectedCampaignName}
      />
    </div>
  );
}

export default MassCampaigns;
