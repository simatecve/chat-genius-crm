import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link2, Plus, Smartphone, CheckCircle, XCircle, Clock, Trash2, RefreshCw, Loader2, Pencil, Building2, GitBranch } from 'lucide-react';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';
import { supabase } from '@/integrations/supabase/client';
import WhatsAppConnectionForm from './WhatsAppConnectionForm';
import TelegramConnectionForm from './TelegramConnectionForm';
import TelegramBotConnectionForm from './TelegramBotConnectionForm';
import TwilioConnectionForm from './TwilioConnectionForm';
import WebChatConnectionForm from './WebChatConnectionForm';
import { useToast } from '@/hooks/use-toast';

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
  type: 'whatsapp' | 'telegram' | 'telegram-bot' | 'twilio' | 'webchat';
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
  { id: 'instagram', name: 'Instagram', icon: '📷', color: 'hsl(var(--muted))', enabled: false },
  { id: 'messenger', name: 'Messenger', icon: '💬', color: 'hsl(var(--muted))', enabled: false },
  { id: 'web-chat', name: 'Web Chatbot', icon: '💻', color: 'hsl(var(--primary))', enabled: true },
  { id: 'google-calendar', name: 'Google Calendar', icon: '📅', color: 'hsl(var(--muted))', enabled: false },
  { id: 'email', name: 'Email', icon: '✉️', color: 'hsl(var(--muted))', enabled: false },
];

const SessionsManager = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelSelectorOpen, setChannelSelectorOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [deletingSession, setDeletingSession] = useState<string | null>(null);
  const [verifyingSession, setVerifyingSession] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedWorkspaceId, setEditedWorkspaceId] = useState<string | null>(null);
  const [editedEmbudoId, setEditedEmbudoId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [embudos, setEmbudos] = useState<LeadColumn[]>([]);
  const { effectiveUserId, loading: userIdLoading } = useEffectiveUserId();
  const { toast } = useToast();

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

  // Filtrar embudos por workspace seleccionado
  const filteredEmbudos = useMemo(() => {
    if (!editedWorkspaceId) return embudos;
    return embudos.filter(e => e.workspace_id === editedWorkspaceId);
  }, [editedWorkspaceId, embudos]);

  const fetchAllSessions = async () => {
    if (!effectiveUserId) return;

    try {
      setLoading(true);

      // Fetch WhatsApp connections
      const { data: whatsappData } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('user_id', effectiveUserId)
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
      case 'whatsapp':
        return '📱';
      case 'telegram':
        return '✈️';
      case 'telegram-bot':
        return '🤖';
      case 'twilio':
        return '📞';
      case 'webchat':
        return '💻';
      default:
        return '📡';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'whatsapp':
        return 'hsl(var(--whatsapp-green))';
      case 'telegram':
      case 'telegram-bot':
        return 'hsl(var(--telegram-blue))';
      case 'twilio':
        return 'hsl(var(--twilio-red))';
      case 'webchat':
        return 'hsl(var(--primary))';
      default:
        return 'hsl(var(--muted))';
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
          connection_id: session.id 
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
    setEditedName(session.name);
    setEditedWorkspaceId(session.workspace_id || null);
    setEditedEmbudoId(session.default_column_id || null);
  };

  const handleSaveEdit = async () => {
    if (!editingSession || !editedName.trim()) return;

    setSavingEdit(true);
    try {
      let error = null;

      const commonData = {
        workspace_id: editedWorkspaceId || null,
        default_column_id: editedEmbudoId || null
      };

      switch (editingSession.type) {
        case 'whatsapp':
          const { error: waError } = await supabase
            .from('whatsapp_connections')
            .update({ name: editedName.trim(), ...commonData })
            .eq('id', editingSession.id);
          error = waError;
          break;

        case 'telegram-bot':
          const { error: tgError } = await supabase
            .from('telegram_bots')
            .update({ bot_name: editedName.trim(), ...commonData })
            .eq('id', editingSession.id);
          error = tgError;
          break;

        case 'twilio':
          const { error: twError } = await supabase
            .from('twilio_connections')
            .update({ connection_name: editedName.trim(), ...commonData })
            .eq('id', editingSession.id);
          error = twError;
          break;

        case 'webchat':
          const { error: wcError } = await supabase
            .from('web_chatbots')
            .update({ name: editedName.trim(), ...commonData })
            .eq('id', editingSession.id);
          error = wcError;
          break;
      }

      if (error) throw error;

      toast({
        title: "Sesión actualizada",
        description: "La sesión ha sido actualizada correctamente",
      });

      setEditingSession(null);
      fetchAllSessions();
    } catch (error: any) {
      console.error('Error updating session:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la sesión",
        variant: "destructive",
      });
    } finally {
      setSavingEdit(false);
    }
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
          if (wahaError) throw wahaError;
          break;

        case 'telegram-bot':
          const { error: telegramError } = await supabase
            .from('telegram_bots')
            .delete()
            .eq('id', session.id);
          if (telegramError) throw telegramError;
          break;

        case 'twilio':
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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link2 className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Sesiones</h2>
          <span className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground">
            {sessions.length}
          </span>
        </div>
        <Button 
          variant="default" 
          size="sm"
          onClick={() => setChannelSelectorOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Añadir Canal
        </Button>
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
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Smartphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No hay sesiones conectadas</h3>
            <p className="text-muted-foreground mb-4">
              Comienza añadiendo tu primer canal de comunicación
            </p>
            <Button onClick={() => setChannelSelectorOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Añadir Canal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map(session => (
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

      {/* Edit Session Dialog */}
      <Dialog open={!!editingSession} onOpenChange={(open) => !open && setEditingSession(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Sesión</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="session-name">Nombre</Label>
              <Input
                id="session-name"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Nombre de la sesión"
              />
            </div>

            {/* Workspace */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Espacio de Trabajo
              </Label>
              <Select 
                value={editedWorkspaceId || 'none'} 
                onValueChange={(val) => {
                  setEditedWorkspaceId(val === 'none' ? null : val);
                  // Reset embudo when workspace changes
                  setEditedEmbudoId(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar espacio..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {workspaces.map(ws => (
                    <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Embudo */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Embudo por Defecto
              </Label>
              <Select 
                value={editedEmbudoId || 'none'} 
                onValueChange={(val) => setEditedEmbudoId(val === 'none' ? null : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar embudo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {filteredEmbudos.map(embudo => (
                    <SelectItem key={embudo.id} value={embudo.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: embudo.color || '#3b82f6' }} 
                        />
                        <span>{embudo.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editedWorkspaceId && filteredEmbudos.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No hay embudos en este espacio de trabajo
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSession(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit || !editedName.trim()}>
              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SessionsManager;
