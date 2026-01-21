import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Link2, Plus, Smartphone, CheckCircle, XCircle, Clock, Trash2, RefreshCw, Loader2, Pencil, MessageSquare, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';
import { useTwilioUsage } from '@/hooks/useTwilioUsage';
import { useSessionStats } from '@/hooks/useSessionStats';
import { supabase } from '@/integrations/supabase/client';
import WhatsAppConnectionForm from './WhatsAppConnectionForm';
import TelegramConnectionForm from './TelegramConnectionForm';
import TelegramBotConnectionForm from './TelegramBotConnectionForm';
import TwilioConnectionForm from './TwilioConnectionForm';
import WebChatConnectionForm from './WebChatConnectionForm';
import { FacebookConnectionForm } from './FacebookConnectionForm';
import EditSessionDialog from './EditSessionDialog';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
interface Channel {
  id: string;
  name: string;
  icon: string;
  color: string;
  enabled: boolean;
}

interface Session {
  id: string;
  name: string;
  type: 'whatsapp' | 'telegram' | 'telegram-bot' | 'twilio' | 'webchat' | 'facebook' | 'instagram';
  identifier: string;
  status: string;
  created_at: string;
  workspace_id?: string | null;
  default_column_id?: string | null;
}

interface Workspace {
  id: string;
  name: string;
  position: number;
}

interface LeadColumn {
  id: string;
  name: string;
  color: string | null;
  workspace_id: string | null;
  position: number;
}

const channels: Channel[] = [
  { id: 'whatsapp-qr', name: 'WhatsApp QR', icon: '📱', color: 'hsl(var(--whatsapp-green))', enabled: true },
  { id: 'twilio-whatsapp', name: 'Twilio WhatsApp', icon: '📞', color: 'hsl(var(--twilio-red))', enabled: true },
  { id: 'telegram', name: 'Telegram', icon: '✈️', color: 'hsl(var(--telegram-blue))', enabled: true },
  { id: 'telegram-bot', name: 'Telegram Bot', icon: '🤖', color: 'hsl(var(--telegram-blue))', enabled: true },
  { id: 'whatsapp-api', name: 'WhatsApp API', icon: '📱', color: 'hsl(var(--muted))', enabled: false },
  { id: 'facebook', name: 'Facebook/Instagram', icon: '📘', color: 'hsl(var(--primary))', enabled: true },
  { id: 'web-chat', name: 'Web Chatbot', icon: '💻', color: 'hsl(var(--primary))', enabled: true },
  { id: 'google-calendar', name: 'Google Calendar', icon: '📅', color: 'hsl(var(--muted))', enabled: false },
  { id: 'email', name: 'Email', icon: '✉️', color: 'hsl(var(--muted))', enabled: false },
];

type ChannelFilterType = 'all' | Session['type'];

const filterOptions: { value: ChannelFilterType; label: string; icon: string }[] = [
  { value: 'all', label: 'Todos los canales', icon: '📡' },
  { value: 'whatsapp', label: 'WhatsApp QR', icon: '📱' },
  { value: 'twilio', label: 'Twilio', icon: '📞' },
  { value: 'telegram-bot', label: 'Telegram Bot', icon: '🤖' },
  { value: 'webchat', label: 'Web Chat', icon: '💻' },
  { value: 'facebook', label: 'Facebook', icon: '📘' },
  { value: 'instagram', label: 'Instagram', icon: '📷' },
];

const SessionsManager = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelSelectorOpen, setChannelSelectorOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [deletingSession, setDeletingSession] = useState<string | null>(null);
  const [verifyingSession, setVerifyingSession] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [embudos, setEmbudos] = useState<LeadColumn[]>();
  const [channelFilter, setChannelFilter] = useState<ChannelFilterType>('all');
  const { effectiveUserId, loading: userIdLoading } = useEffectiveUserId();
  const { toast } = useToast();
  const { getUsageByConnectionId, getUsagePercentage, getRemainingMessages, dailyLimit, isNearLimit } = useTwilioUsage();
  const { getStatsBySessionId, loading: statsLoading } = useSessionStats(effectiveUserId);

  const filteredSessions = useMemo(() => {
    if (channelFilter === 'all') return sessions;
    return sessions.filter(session => session.type === channelFilter);
  }, [sessions, channelFilter]);

  useEffect(() => {
    if (!userIdLoading && effectiveUserId) {
      fetchAllSessions();
      loadWorkspacesAndEmbudos();
    }
  }, [effectiveUserId, userIdLoading]);

  const loadWorkspacesAndEmbudos = async () => {
    if (!effectiveUserId) return;

    try {
      // Cargar workspaces del usuario
      const { data: workspacesData } = await supabase
        .from('workspaces')
        .select('id, name, position')
        .eq('user_id', effectiveUserId)
        .order('position');
      
      setWorkspaces(workspacesData || []);
      
      // Cargar embudos del usuario
      const { data: embudosData } = await supabase
        .from('lead_columns')
        .select('id, name, color, workspace_id, position')
        .eq('user_id', effectiveUserId)
        .order('position');
      
      setEmbudos(embudosData || []);
    } catch (error) {
      console.error('Error loading workspaces and embudos:', error);
    }
  };


  const fetchAllSessions = async () => {
    if (!effectiveUserId) return;

    try {
      setLoading(true);

      // Fetch WhatsApp connections (excluding deleted/stopped/failed)
      const { data: whatsappData } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('user_id', effectiveUserId)
        .not('status', 'in', '("deleted","STOPPED","FAILED")')
        .order('created_at', { ascending: false });

      // Fetch Telegram bots
      const { data: telegramBotData } = await supabase
        .from('telegram_bots')
        .select('*')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false });

      // Fetch Twilio connections
      const { data: twilioData } = await supabase
        .from('twilio_connections')
        .select('*')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false });

      const allSessions: Session[] = [];

      // Add WhatsApp sessions
      if (whatsappData) {
        whatsappData.forEach(conn => {
          allSessions.push({
            id: conn.id,
            name: conn.name || 'Sin nombre',
            type: 'whatsapp',
            identifier: conn.phone_number,
            status: conn.status || 'disconnected',
            created_at: conn.created_at,
            workspace_id: conn.workspace_id,
            default_column_id: conn.default_column_id
          });
        });
      }

      // Add Telegram Bot sessions
      if (telegramBotData) {
        telegramBotData.forEach(bot => {
          allSessions.push({
            id: bot.id,
            name: bot.bot_name,
            type: 'telegram-bot',
            identifier: bot.bot_username || bot.bot_token?.substring(0, 20) + '...',
            status: bot.status || 'active',
            created_at: bot.created_at,
            workspace_id: bot.workspace_id,
            default_column_id: bot.default_column_id
          });
        });
      }

      // Add Twilio sessions
      if (twilioData) {
        twilioData.forEach(conn => {
          allSessions.push({
            id: conn.id,
            name: conn.connection_name,
            type: 'twilio',
            identifier: conn.phone_number,
            status: conn.status || 'active',
            created_at: conn.created_at,
            workspace_id: conn.workspace_id,
            default_column_id: conn.default_column_id
          });
        });
      }

      // Fetch Web Chatbots
      const { data: webchatData } = await supabase
        .from('web_chatbots')
        .select('*')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false });

      // Add Web Chatbot sessions
      if (webchatData) {
        webchatData.forEach(chat => {
          allSessions.push({
            id: chat.id,
            name: chat.name,
            type: 'webchat',
            identifier: chat.id.substring(0, 8) + '...',
            status: chat.is_active ? 'active' : 'inactive',
            created_at: chat.created_at,
            workspace_id: (chat as any).workspace_id || null,
            default_column_id: (chat as any).default_column_id || null
          });
        });
      }

      // Fetch Facebook connections
      const { data: facebookData } = await supabase
        .from('facebook_connections')
        .select('*')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false });

      // Add Facebook/Instagram sessions
      if (facebookData) {
        facebookData.forEach(conn => {
          allSessions.push({
            id: conn.id,
            name: conn.page_name,
            type: conn.instagram_account_id ? 'instagram' : 'facebook',
            identifier: conn.instagram_username || conn.page_id,
            status: conn.status || 'active',
            created_at: conn.created_at || new Date().toISOString(),
            workspace_id: conn.workspace_id,
            default_column_id: conn.default_column_id
          });
        });
      }

      // Sort by creation date
      allSessions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setSessions(allSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChannelSelect = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    if (channel?.enabled) {
      setSelectedChannel(channelId);
      setChannelSelectorOpen(false);
    }
  };

  const handleCloseForm = () => {
    setSelectedChannel(null);
    fetchAllSessions();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'disconnected':
      case 'inactive':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-warning" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'whatsapp': return '📱';
      case 'telegram': return '✈️';
      case 'telegram-bot': return '🤖';
      case 'twilio': return '📞';
      case 'webchat': return '💻';
      case 'facebook': return '📘';
      case 'instagram': return '📷';
      default: return '📡';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'whatsapp': return 'hsl(var(--whatsapp-green))';
      case 'telegram':
      case 'telegram-bot': return 'hsl(var(--telegram-blue))';
      case 'twilio': return 'hsl(var(--twilio-red))';
      case 'webchat': return 'hsl(var(--primary))';
      case 'facebook':
      case 'instagram': return 'hsl(var(--primary))';
      default: return 'hsl(var(--muted))';
    }
  };

  const handleVerifyStatus = async (session: Session) => {
    if (session.type !== 'whatsapp') {
      toast({
        title: "No disponible",
        description: "La verificación de estatus solo está disponible para WhatsApp",
        variant: "destructive",
      });
      return;
    }

    setVerifyingSession(session.id);
    try {
      const { data, error } = await supabase.functions.invoke('waha-session-status', {
        body: { 
          session_name: session.name,
          connection_id: session.id,
          update_db: true // Solo el botón Verificar actualiza el estado en BD
        }
      });

      if (error) throw error;

      toast({
        title: "Estado de sesión",
        description: `Estado actual: ${data?.status || 'desconocido'}`,
      });

      // Refresh sessions to update status
      fetchAllSessions();
    } catch (error: any) {
      console.error('Error verifying status:', error);
      toast({
        title: "Error",
        description: "No se pudo verificar el estado de la sesión",
        variant: "destructive",
      });
    } finally {
      setVerifyingSession(null);
    }
  };

  const handleEditSession = (session: Session) => {
    setEditingSession(session);
  };

  const handleEditSuccess = () => {
    fetchAllSessions();
  };

  const handleDeleteSession = async (session: Session) => {
    const confirmed = window.confirm(`¿Estás seguro de que quieres eliminar la sesión "${session.name}"?`);
    if (!confirmed) return;

    setDeletingSession(session.id);
    try {
      switch (session.type) {
        case 'whatsapp':
          const { error: wahaError } = await supabase.functions.invoke('waha-delete-session', {
            body: { 
              session_name: session.name,
              connection_id: session.id 
            }
          });
          // Si hay error en WAHA, hacer fallback a eliminación directa de BD
          if (wahaError) {
            console.warn('WAHA delete error, attempting direct DB delete:', wahaError);
            const { error: dbError } = await supabase
              .from('whatsapp_connections')
              .delete()
              .eq('id', session.id);
            if (dbError) throw dbError;
          }
          break;

        case 'telegram-bot':
          const { error: telegramError } = await supabase
            .from('telegram_bots')
            .delete()
            .eq('id', session.id);
          if (telegramError) throw telegramError;
          break;

        case 'twilio':
          // Clean up related records before deletion
          await supabase
            .from('ai_response_buffer')
            .delete()
            .eq('twilio_connection_id', session.id);
          
          await supabase
            .from('mass_campaigns')
            .update({ twilio_connection_id: null })
            .eq('twilio_connection_id', session.id);
          
          const { error: twilioError } = await supabase
            .from('twilio_connections')
            .delete()
            .eq('id', session.id);
          if (twilioError) throw twilioError;
          break;

        case 'webchat':
          const { error: webchatError } = await supabase
            .from('web_chatbots')
            .delete()
            .eq('id', session.id);
          if (webchatError) throw webchatError;
          break;

        case 'facebook':
        case 'instagram':
          const { error: fbError } = await supabase
            .from('facebook_connections')
            .delete()
            .eq('id', session.id);
          if (fbError) throw fbError;
          break;

        default:
          throw new Error('Tipo de sesión no soportado');
      }

      toast({
        title: "Sesión eliminada",
        description: "La sesión ha sido eliminada correctamente",
      });

      fetchAllSessions();
    } catch (error: any) {
      console.error('Error deleting session:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la sesión",
        variant: "destructive",
      });
    } finally {
      setDeletingSession(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-2">
          <Link2 className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Sesiones</h2>
          <span className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground">
            {filteredSessions.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Select value={channelFilter} onValueChange={(v) => setChannelFilter(v as ChannelFilterType)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por canal" />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center gap-2">
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="default" 
            size="sm"
            onClick={() => setChannelSelectorOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Añadir Canal
          </Button>
        </div>
      </div>
      
      <p className="text-muted-foreground text-sm">
        Crear, editar y eliminar tus sesiones vinculadas.
      </p>

      {/* Sessions List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-full"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Smartphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              {channelFilter === 'all' ? 'No hay sesiones conectadas' : `No hay sesiones de ${filterOptions.find(o => o.value === channelFilter)?.label}`}
            </h3>
            <p className="text-muted-foreground mb-4">
              {channelFilter === 'all' 
                ? 'Comienza añadiendo tu primer canal de comunicación'
                : 'Prueba seleccionando otro filtro o añade una nueva sesión'}
            </p>
            <Button onClick={() => setChannelSelectorOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Añadir Canal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSessions.map(session => (
            <Card 
              key={session.id}
              className="hover:shadow-md transition-shadow border-l-4"
              style={{ borderLeftColor: getTypeColor(session.type) }}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getTypeIcon(session.type)}</span>
                    <span className="truncate">{session.name}</span>
                  </div>
                  {getStatusIcon(session.status)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">ID:</span> {session.identifier}
                </div>
                
                {/* Session Stats - Para todos los tipos de sesión */}
                {(() => {
                  const sessionStats = getStatsBySessionId(session.id);
                  return (
                    <div className="space-y-1.5 p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <MessageSquare className="h-3 w-3" />
                          Conversaciones
                        </span>
                        <span className="font-medium text-foreground">
                          {sessionStats?.total_conversations || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <ArrowDownLeft className="h-3 w-3" />
                          Recibidos
                        </span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {sessionStats?.received_messages || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <ArrowUpRight className="h-3 w-3" />
                          Enviados
                        </span>
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {sessionStats?.sent_messages || 0}
                        </span>
                      </div>
                      {/* Twilio daily limit adicional */}
                      {session.type === 'twilio' && (
                        <>
                          <div className="border-t border-border my-1.5" />
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Hoy</span>
                            <span className={`font-medium ${isNearLimit(session.id) ? 'text-warning' : 'text-foreground'}`}>
                              {getUsageByConnectionId(session.id)} / {dailyLimit}
                            </span>
                          </div>
                          <Progress 
                            value={getUsagePercentage(session.id)} 
                            className={`h-1.5 ${isNearLimit(session.id) ? '[&>div]:bg-warning' : ''}`}
                          />
                        </>
                      )}
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {new Date(session.created_at).toLocaleDateString('es-ES')}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    session.status === 'connected' || session.status === 'active' 
                      ? 'bg-success/10 text-success' 
                      : 'bg-destructive/10 text-destructive'
                  }`}>
                    {session.status === 'connected' || session.status === 'active' ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditSession(session)}
                    className="flex-1"
                  >
                    <Pencil className="h-3 w-3" />
                    <span className="ml-1 text-xs">Editar</span>
                  </Button>
                  {session.type === 'whatsapp' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerifyStatus(session)}
                      disabled={verifyingSession === session.id}
                      className="flex-1"
                    >
                      {verifyingSession === session.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      <span className="ml-1 text-xs">Verificar</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteSession(session)}
                    disabled={deletingSession === session.id}
                    className="flex-1 hover:bg-destructive hover:text-destructive-foreground"
                  >
                    {deletingSession === session.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    <span className="ml-1 text-xs">Eliminar</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Channel Selector Dialog */}
      <Dialog open={channelSelectorOpen} onOpenChange={setChannelSelectorOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Seleccionar Canal</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Elige el tipo de canal que deseas conectar
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => handleChannelSelect(channel.id)}
                  disabled={!channel.enabled}
                  className={`
                    relative p-6 rounded-lg border-2 transition-all
                    ${channel.enabled 
                      ? 'cursor-pointer hover:shadow-lg hover:scale-105 hover:border-primary' 
                      : 'cursor-not-allowed opacity-40'
                    }
                    border-border
                  `}
                  style={{
                    backgroundColor: channel.enabled 
                      ? 'hsl(var(--card))'
                      : 'hsl(var(--muted) / 0.3)'
                  }}
                >
                  <div className="flex flex-col items-center space-y-3">
                    <span className="text-4xl">{channel.icon}</span>
                    <span 
                      className={`text-sm font-medium text-center ${
                        channel.enabled ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {channel.name}
                    </span>
                    {!channel.enabled && (
                      <span className="text-xs text-muted-foreground">Próximamente</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Connection Forms */}
      {selectedChannel === 'whatsapp-qr' && (
        <WhatsAppConnectionForm onClose={handleCloseForm} />
      )}
      {selectedChannel === 'telegram' && (
        <TelegramConnectionForm onClose={handleCloseForm} />
      )}
      {selectedChannel === 'telegram-bot' && (
        <TelegramBotConnectionForm onClose={handleCloseForm} />
      )}
      {selectedChannel === 'twilio-whatsapp' && (
        <TwilioConnectionForm onClose={handleCloseForm} />
      )}
      {selectedChannel === 'web-chat' && (
        <WebChatConnectionForm onClose={handleCloseForm} />
      )}
      {selectedChannel === 'facebook' && effectiveUserId && (
        <Dialog open={true} onOpenChange={() => setSelectedChannel(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Conectar Facebook/Instagram</DialogTitle>
            </DialogHeader>
            <FacebookConnectionForm
              userId={effectiveUserId}
              workspaces={workspaces}
              embudos={embudos || []}
              onClose={() => setSelectedChannel(null)}
              onSuccess={handleCloseForm}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Session Dialog */}
      {editingSession && (
        <EditSessionDialog
          open={!!editingSession}
          onClose={() => setEditingSession(null)}
          sessionType={editingSession.type === 'telegram-bot' ? 'telegram' : editingSession.type}
          session={{
            id: editingSession.id,
            name: editingSession.name,
            workspace_id: editingSession.workspace_id,
            default_column_id: editingSession.default_column_id
          }}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
};

export default SessionsManager;
