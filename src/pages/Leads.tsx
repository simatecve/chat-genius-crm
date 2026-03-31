import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';
import { useInfiniteLeads } from '@/hooks/useInfiniteLeads';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, MoreVertical, Building, Mail, Phone, DollarSign, Users, Search, ChevronDown, ArrowLeft, MessageSquare, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Tables } from '@/integrations/supabase/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import KanbanBoard from '@/components/KanbanBoard';
import { MessageTriggersDialog } from '@/components/MessageTriggersDialog';
import ChatModal from '@/components/conversations/ChatModal';
import { useMessages, useConversations } from '@/hooks/useConversations';
type LeadColumn = Tables<'lead_columns'>;
type Lead = Tables<'leads'>;
type Workspace = Tables<'workspaces'>;
interface ConversationSummary {
  id: string;
  phone_number: string;
  pushname: string | null;
  last_message: string | null;
  last_message_time: string | null;
  last_inbound_message_time?: string | null;
  unread_count: number | null;
  channel_type?: string | null;
}
interface LeadWithColumn extends Lead {
  lead_columns?: LeadColumn;
  conversations?: ConversationSummary[];
  isVirtual?: boolean; // Flag para identificar leads creados desde conversaciones huérfanas
  originalConversationId?: string; // ID de la conversación original para leads virtuales
}
const Leads = () => {
  const {
    user
  } = useAuth();
  const {
    hasPermission,
    isAdmin
  } = useUserPermissions();
  const {
    effectiveUserId,
    loading: effectiveUserIdLoading
  } = useEffectiveUserId();
  const navigate = useNavigate();

  // Permisos específicos de embudos
  const canCreateFunnels = isAdmin || hasPermission('puede_crear_embudos');
  const canEditFunnels = isAdmin || hasPermission('puede_editar_embudos');
  const canDeleteFunnels = isAdmin || hasPermission('puede_eliminar_embudos');
  const canMoveContacts = isAdmin || hasPermission('puede_mover_contactos_embudos');
  const [columns, setColumns] = useState<LeadColumn[]>([]);
  const [leads, setLeads] = useState<LeadWithColumn[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#22c55e');
  const [editingColumn, setEditingColumn] = useState<LeadColumn | null>(null);
  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    value: '',
    notes: '',
    column_id: ''
  });
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showColumnDialog, setShowColumnDialog] = useState(false);
  const [showLeadDialog, setShowLeadDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [convertingColumn, setConvertingColumn] = useState<LeadColumn | null>(null);
  const [contactListName, setContactListName] = useState('');
  const [showMessageTriggersDialog, setShowMessageTriggersDialog] = useState(false);
  const [selectedColumnForTriggers, setSelectedColumnForTriggers] = useState<LeadColumn | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [filteredLeads, setFilteredLeads] = useState<LeadWithColumn[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Obtener IDs de columnas y columna por defecto
  const columnIds = useMemo(() => columns.map(c => c.id), [columns]);
  const defaultColumnId = useMemo(() => {
    const defaultCol = columns.find(c => c.is_default);
    return defaultCol?.id || columns[0]?.id || null;
  }, [columns]);

  // Obtener channel_type del workspace seleccionado
  const workspaceChannelType = useMemo(() => {
    const workspace = workspaces.find(w => w.id === selectedWorkspace);
    return workspace?.channel_type || null;
  }, [workspaces, selectedWorkspace]);

  // Hook de paginación infinita
  const {
    getAllLeads,
    getLeadsForColumn,
    getColumnState,
    loadMore,
    refreshAll,
    initialLoading: infiniteLoading,
    moveLeadOptimistic,
    isMoving
  } = useInfiniteLeads({
    userId: effectiveUserId,
    workspaceId: selectedWorkspace,
    workspaceChannelType,
    columnIds,
    defaultColumnId,
    pageSize: 20
  });

  // Ref para debounce de recargas realtime
  const reloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadLeadsRef = useRef<() => Promise<void>>();

  // Estado para el modal de chat
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [selectedWhatsAppSession, setSelectedWhatsAppSession] = useState<string | null>(null);

  // Hook para mensajes del chat seleccionado
  const {
    messages,
    sendMessage,
    isSending
  } = useMessages(selectedConversationId);

  // Hook para marcar como leído
  const {
    markAsRead
  } = useConversations();

  // Manejar envío de mensaje desde el modal (soporta múltiples canales)
  const handleSendMessage = async (messageText: string, attachment?: File) => {
    if (!messageText.trim() && !attachment || !selectedConversation || !effectiveUserId) return;
    try {
      const channelType = selectedConversation.channel_type || 'whatsapp';
      const phoneNumber = selectedConversation.phone_number;

      // Por ahora solo soportamos mensajes de texto
      if (attachment) {
        console.warn('Attachments not yet supported');
        toast({
          title: "No soportado",
          description: "El envío de archivos aún no está disponible",
          variant: "default"
        });
        return;
      }

      // Si es Twilio - usar la conexión original de la conversación
      if (channelType === 'twilio') {
        const twilioConnectionId = selectedConversation.twilio_connection_id;
        
        if (!twilioConnectionId) {
          toast({
            title: "Error",
            description: "Esta conversación no tiene una conexión Twilio asignada. La sesión original puede haber sido eliminada.",
            variant: "destructive"
          });
          return;
        }
        
        await sendMessage({
          conversationId: selectedConversation.id,
          userId: effectiveUserId,
          message: messageText.trim(),
          sessionName: '',
          phoneNumber: phoneNumber,
          channelType: 'twilio',
          twilioConnectionId: twilioConnectionId
        });
        return;
      }

      // Si es Telegram
      if (channelType === 'telegram') {
        const telegramBotId = selectedConversation.telegram_bot_id;
        if (!telegramBotId) {
          toast({
            title: "Error",
            description: "No se encontró el bot de Telegram para esta conversación",
            variant: "destructive"
          });
          return;
        }
        await sendMessage({
          conversationId: selectedConversation.id,
          userId: effectiveUserId,
          message: messageText.trim(),
          sessionName: '',
          phoneNumber: phoneNumber,
          channelType: 'telegram',
          telegramBotId: telegramBotId
        });
        return;
      }

      // Si es WhatsApp (WAHA) - usar la sesión seleccionada
      let sessionName = selectedWhatsAppSession;
      
      // Si no hay sesión seleccionada, buscar una activa
      if (!sessionName) {
        const {
          data: whatsappConnection
        } = await supabase.from('whatsapp_connections').select('name').eq('user_id', effectiveUserId).eq('status', 'WORKING').limit(1).single();
        
        if (!whatsappConnection) {
          toast({
            title: "Error",
            description: "No se encontró una sesión activa de WhatsApp para responder",
            variant: "destructive"
          });
          return;
        }
        sessionName = whatsappConnection.name;
      }
      
      await sendMessage({
        conversationId: selectedConversation.id,
        userId: effectiveUserId,
        message: messageText.trim(),
        sessionName: sessionName,
        phoneNumber: phoneNumber,
        channelType: 'whatsapp'
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive"
      });
    }
  };

  // Función para manejar click en lead y abrir conversación en modal
  const handleLeadClick = async (lead: LeadWithColumn) => {
    // Si el lead tiene conversaciones asociadas, abrir modal con la primera
    if (lead.conversations && lead.conversations.length > 0) {
      const firstConversation = lead.conversations[0];

      // Cargar datos completos de la conversación
      const {
        data: fullConversation,
        error
      } = await supabase.from('conversations').select('*').eq('id', firstConversation.id).single();
      if (fullConversation && !error) {
        setSelectedConversation(fullConversation);
        setSelectedConversationId(fullConversation.id);
        setIsChatModalOpen(true);

        // Marcar como leído al abrir
        markAsRead(fullConversation.id);
      } else {
        toast({
          title: "Error",
          description: "No se pudo cargar la conversación",
          variant: "destructive"
        });
      }
    } else {
      // Si no tiene conversaciones, mostrar un mensaje
      toast({
        title: "Sin conversaciones",
        description: "Este contacto aún no tiene conversaciones de WhatsApp",
        variant: "default"
      });
    }
  };
  useEffect(() => {
    if (effectiveUserId && !effectiveUserIdLoading) {
      loadData();
    }
  }, [effectiveUserId, effectiveUserIdLoading]);

  // Reload columns when workspace changes
  useEffect(() => {
    if (effectiveUserId && !effectiveUserIdLoading && selectedWorkspace) {
      loadColumns();
      loadLeads();
    }
  }, [selectedWorkspace, effectiveUserId, effectiveUserIdLoading]);

  // Función debounced para recargar leads (evita múltiples recargas seguidas)
  const debouncedLoadLeads = useCallback(() => {
    // Si hay un movimiento en progreso, ignorar el evento Realtime
    if (isMoving()) {
      console.log('[Leads] Skipping Realtime reload - move in progress');
      return;
    }
    
    if (reloadTimeoutRef.current) {
      clearTimeout(reloadTimeoutRef.current);
    }
    setIsRefreshing(true);
    reloadTimeoutRef.current = setTimeout(async () => {
      // Use refreshAll from useInfiniteLeads to update the actual displayed data
      await refreshAll();
      setIsRefreshing(false);
    }, 500);
  }, [isMoving, refreshAll]);

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
    };
  }, []);

  // Suscripción realtime para reordenar cuando lleguen nuevos mensajes y detectar nuevos leads/conversaciones
  useEffect(() => {
    if (!effectiveUserId) return;

    // Canal fijo sin Date.now() para reutilizar conexiones
    const channelName = `leads-realtime-${effectiveUserId}`;
    const channel = supabase.channel(channelName)
    // Conversations: INSERT y UPDATE
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'conversations',
      filter: `user_id=eq.${effectiveUserId}`
    }, () => debouncedLoadLeads()).on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'conversations',
      filter: `user_id=eq.${effectiveUserId}`
    }, () => debouncedLoadLeads())
    // Leads: INSERT, UPDATE y DELETE
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'leads',
      filter: `user_id=eq.${effectiveUserId}`
    }, () => debouncedLoadLeads()).on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'leads',
      filter: `user_id=eq.${effectiveUserId}`
    }, () => debouncedLoadLeads()).on('postgres_changes', {
      event: 'DELETE',
      schema: 'public',
      table: 'leads',
      filter: `user_id=eq.${effectiveUserId}`
    }, () => debouncedLoadLeads())
    // Messages: INSERT (sin filtro porque no tiene user_id directo)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages'
    }, () => debouncedLoadLeads()).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveUserId, debouncedLoadLeads]);

  // Obtener leads desde el hook de paginación
  const paginatedLeads = useMemo(() => getAllLeads(), [getAllLeads]);

  // Filtrar leads en tiempo real - usar siempre los leads paginados
  useEffect(() => {
    if (!searchFilter.trim()) {
      setFilteredLeads(paginatedLeads);
    } else {
      const filtered = paginatedLeads.filter(lead => {
        const searchTerm = searchFilter.toLowerCase();
        const nameMatch = lead.name?.toLowerCase().includes(searchTerm);
        const phoneMatch = lead.phone?.toLowerCase().includes(searchTerm);
        return nameMatch || phoneMatch;
      });
      setFilteredLeads(filtered);
    }
  }, [paginatedLeads, searchFilter]);
  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadWorkspaces(), loadColumns(), loadLeads()]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Error al cargar los datos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const loadWorkspaces = async () => {
    if (!effectiveUserId) return;

    // Mostrar todos los workspaces incluyendo webchat
    const {
      data,
      error
    } = await supabase.from('workspaces').select('*').eq('user_id', effectiveUserId).order('position');
    if (error) {
      console.error('Error loading workspaces:', error);
      return;
    }

    // Si no hay workspaces normales, crear uno por defecto
    if (!data || data.length === 0) {
      const {
        data: newWorkspace,
        error: createError
      } = await supabase.from('workspaces').insert({
        user_id: effectiveUserId,
        name: 'Mi Espacio de Trabajo',
        position: 0
        // channel_type queda NULL = workspace normal
      }).select().single();
      if (createError) {
        console.error('Error creating default workspace:', createError);
        return;
      }

      // Crear columna por defecto en el nuevo workspace
      await supabase.from('lead_columns').insert({
        user_id: effectiveUserId,
        workspace_id: newWorkspace.id,
        name: 'Nuevos Contactos',
        color: '#22c55e',
        position: 0,
        is_default: true
      });
      setWorkspaces([newWorkspace]);
      setSelectedWorkspace(newWorkspace.id);
      return;
    }
    setWorkspaces(data || []);

    // Verificar que el workspace seleccionado sea válido (no webchat)
    const validWorkspaceIds = data.map(w => w.id);
    if (selectedWorkspace && !validWorkspaceIds.includes(selectedWorkspace)) {
      // El workspace seleccionado no es válido (es webchat), resetear al primero
      console.log('[Leads] Resetting selectedWorkspace - current is webchat or invalid');
      setSelectedWorkspace(data[0].id);
    } else if (!selectedWorkspace && data.length > 0) {
      // Seleccionar el primer workspace por defecto
      setSelectedWorkspace(data[0].id);
    }
  };
  const loadColumns = async () => {
    if (!effectiveUserId) return;
    let query = supabase.from('lead_columns').select('*').eq('user_id', effectiveUserId);

    // Filtrar por workspace si está seleccionado (incluir también columnas sin workspace)
    if (selectedWorkspace) {
      query = query.or(`workspace_id.eq.${selectedWorkspace},workspace_id.is.null`);
    }
    const {
      data,
      error
    } = await query.order('position');
    if (error) {
      console.error('Error loading columns:', error);
      return;
    }
    if (!data || data.length === 0) {
      // Crear columna por defecto si no existe ninguna
      await createDefaultColumn();
      return;
    }
    setColumns(data);
  };
  const createDefaultColumn = async () => {
    if (!effectiveUserId) return;
    const {
      data,
      error
    } = await supabase.from('lead_columns').insert({
      name: 'Nuevos Leads',
      color: '#22c55e',
      position: 0,
      is_default: true,
      user_id: effectiveUserId,
      workspace_id: selectedWorkspace
    }).select().single();
    if (error) {
      console.error('Error creating default column:', error);
      return;
    }
    setColumns([data]);
  };
  const loadLeads = async () => {
    if (!effectiveUserId) return;

    // Si hay workspace seleccionado, primero obtener los IDs de las columnas
    let columnIds: string[] = [];
    let defaultColumnId: string | null = null;
    if (selectedWorkspace) {
      // Incluir columnas con workspace_id igual al seleccionado O sin workspace (null)
      const {
        data: columnsData,
        error: columnsError
      } = await supabase.from('lead_columns').select('id, is_default').eq('user_id', effectiveUserId).or(`workspace_id.eq.${selectedWorkspace},workspace_id.is.null`);
      if (columnsError) {
        console.error('Error loading columns for leads:', columnsError);
        return;
      }
      columnIds = columnsData?.map(col => col.id) || [];

      // Encontrar columna por defecto para asignar leads virtuales
      const defaultCol = columnsData?.find(col => col.is_default);
      defaultColumnId = defaultCol?.id || columnsData?.[0]?.id || null;

      // Si no hay columnas en el workspace, crear una por defecto
      if (columnIds.length === 0) {
        console.log('[Leads] No columns found, creating default column');
        const {
          data: newColumn,
          error: createError
        } = await supabase.from('lead_columns').insert({
          user_id: effectiveUserId,
          workspace_id: selectedWorkspace,
          name: 'Nuevos Contactos',
          color: '#22c55e',
          position: 0,
          is_default: true
        }).select().single();
        if (createError) {
          console.error('Error creating default column:', createError);
          setLeads([]);
          return;
        }
        columnIds = [newColumn.id];
        defaultColumnId = newColumn.id;
        setColumns([newColumn]);
      }
    }

    // Construir query de leads con límite para performance
    let query = supabase.from('leads').select(`
        *,
        lead_columns(*),
        conversations:conversations!conversations_lead_id_fkey(
          id,
          phone_number,
          pushname,
          last_message,
          last_message_time,
          last_inbound_message_time,
          unread_count,
          channel_type
        )
      `);

    // Filtrar por columnas del workspace si está seleccionado
    if (selectedWorkspace && columnIds.length > 0) {
      query = query.in('column_id', columnIds);
    }

    // Cargar leads reales - sin límite para no perder conversaciones
    const {
      data: realLeads,
      error
    } = await query.order('last_inbound_message_time', {
      ascending: false,
      nullsFirst: false
    });
    if (error) {
      console.error('Error loading leads:', error);
      return;
    }

    // Cargar conversaciones huérfanas (sin lead_id) - EXCLUYENDO webchat
    // Filtradas por workspace/conexión para consistencia con el hook useInfiniteLeads
    
    // Obtener channel_type del workspace seleccionado
    const selectedWorkspaceData = workspaces.find(w => w.id === selectedWorkspace);
    const wsChannelType = selectedWorkspaceData?.channel_type;
    
    // Obtener IDs de conexiones según el channel_type del workspace
    let connectionIds: string[] = [];
    
    if (selectedWorkspace && wsChannelType === 'twilio') {
      const { data: twilioConns } = await supabase
        .from('twilio_connections')
        .select('id')
        .eq('workspace_id', selectedWorkspace);
      connectionIds = twilioConns?.map(c => c.id) || [];
    } else if (selectedWorkspace && wsChannelType === 'telegram') {
      const { data: telegramBots } = await supabase
        .from('telegram_bots')
        .select('id')
        .eq('workspace_id', selectedWorkspace);
      connectionIds = telegramBots?.map(b => b.id) || [];
    }
    
    // Base query para conversaciones huérfanas
    let orphanQuery = supabase
      .from('conversations')
      .select('id, phone_number, pushname, last_message, last_message_time, last_inbound_message_time, unread_count, channel_type, twilio_connection_id, telegram_bot_id, created_at, updated_at')
      .eq('user_id', effectiveUserId)
      .is('lead_id', null)
      ;
    
    // Aplicar filtro por conexiones si el workspace tiene channel_type específico
    if (wsChannelType === 'twilio') {
      if (connectionIds.length > 0) {
        // Incluir conexiones activas del workspace O conexiones eliminadas (NULL)
        // para mantener visibles las conversaciones de sesiones eliminadas
        orphanQuery = orphanQuery.or(
          `twilio_connection_id.in.(${connectionIds.join(',')}),twilio_connection_id.is.null`
        );
        orphanQuery = orphanQuery.eq('channel_type', 'twilio');
      } else {
        // Si no hay conexiones activas, solo mostrar las de conexiones eliminadas
        orphanQuery = orphanQuery.is('twilio_connection_id', null)
          .eq('channel_type', 'twilio');
      }
    } else if (wsChannelType === 'telegram' && connectionIds.length > 0) {
      orphanQuery = orphanQuery.in('telegram_bot_id', connectionIds);
    } else if (wsChannelType === 'whatsapp') {
      orphanQuery = orphanQuery.eq('channel_type', 'whatsapp');
    }
    // Si channel_type es null o 'all', no aplicar filtro adicional (comportamiento original)
    
    const {
      data: orphanConversations,
      error: orphanError
    } = await orphanQuery.order('last_inbound_message_time', {
      ascending: false,
      nullsFirst: false
    }).limit(200);
    
    if (orphanError) {
      console.error('Error loading orphan conversations:', orphanError);
    }
    console.log('[Leads] Orphan conversations loaded:', orphanConversations?.length || 0, 'defaultColumnId:', defaultColumnId, 'wsChannelType:', wsChannelType);

    // Usar todos los leads reales sin filtrar webchat
    const filteredRealLeads = (realLeads || []).map(lead => ({
      ...lead,
      conversations: lead.conversations || []
    }));

    // Crear leads virtuales desde conversaciones huérfanas
    const virtualLeads: LeadWithColumn[] = (orphanConversations || []).map((conv, index) => ({
      id: `virtual-${conv.id}`,
      name: conv.pushname || conv.phone_number || 'Sin nombre',
      phone: conv.phone_number,
      email: null,
      company: null,
      notes: null,
      value: null,
      tags: null,
      column_id: defaultColumnId || '',
      position: index,
      user_id: effectiveUserId,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      last_inbound_message_time: conv.last_inbound_message_time,
      bot_active: true,
      isVirtual: true,
      originalConversationId: conv.id,
      conversations: [{
        id: conv.id,
        phone_number: conv.phone_number,
        pushname: conv.pushname,
        last_message: conv.last_message,
        last_message_time: conv.last_message_time,
        last_inbound_message_time: conv.last_inbound_message_time,
        unread_count: conv.unread_count,
        channel_type: conv.channel_type
      }]
    }));

    // Combinar leads reales (sin webchat) + virtuales
    const allLeads = [...filteredRealLeads, ...virtualLeads];

    // Ordenar leads por último mensaje recibido (más reciente arriba) - ordenamiento global
    const sortedData = allLeads.sort((a, b) => {
      const aTime = a.conversations?.[0]?.last_inbound_message_time || a.conversations?.[0]?.last_message_time || a.updated_at;
      const bTime = b.conversations?.[0]?.last_inbound_message_time || b.conversations?.[0]?.last_message_time || b.updated_at;

      // Más reciente primero (descendente)
      return new Date(bTime || 0).getTime() - new Date(aTime || 0).getTime();
    });
    setLeads(sortedData);
  };

  // Actualizar ref de loadLeads para uso en debounce
  loadLeadsRef.current = loadLeads;
  const handleCreateColumn = async () => {
    if (!newColumnName.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la columna es requerido",
        variant: "destructive"
      });
      return;
    }
    if (!selectedWorkspace) {
      toast({
        title: "Error",
        description: "Por favor selecciona un espacio de trabajo primero",
        variant: "destructive"
      });
      return;
    }
    const {
      data,
      error
    } = await supabase.from('lead_columns').insert({
      name: newColumnName,
      color: newColumnColor,
      position: columns.length,
      is_default: false,
      user_id: effectiveUserId,
      workspace_id: selectedWorkspace
    }).select().single();
    if (error) {
      console.error('Error creating column:', error);
      toast({
        title: "Error",
        description: "Error al crear la columna",
        variant: "destructive"
      });
      return;
    }
    setColumns([...columns, data]);
    setNewColumnName('');
    setNewColumnColor('#22c55e');
    setShowColumnDialog(false);
    toast({
      title: "Éxito",
      description: "Columna creada correctamente"
    });
  };
  const handleUpdateColumn = async () => {
    if (!editingColumn || !newColumnName.trim()) return;
    const {
      error
    } = await supabase.from('lead_columns').update({
      name: newColumnName,
      color: newColumnColor
    }).eq('id', editingColumn.id);
    if (error) {
      console.error('Error updating column:', error);
      toast({
        title: "Error",
        description: "Error al actualizar la columna",
        variant: "destructive"
      });
      return;
    }
    setColumns(columns.map(col => col.id === editingColumn.id ? {
      ...col,
      name: newColumnName,
      color: newColumnColor
    } : col));
    setEditingColumn(null);
    setNewColumnName('');
    setNewColumnColor('#3b82f6');
    setShowColumnDialog(false);
    toast({
      title: "Éxito",
      description: "Columna actualizada correctamente"
    });
  };
  const handleDeleteColumn = async (columnId: string) => {
    const column = columns.find(col => col.id === columnId);
    if (column?.is_default) {
      toast({
        title: "Error",
        description: "No se puede eliminar la columna inicial",
        variant: "destructive"
      });
      return;
    }
    const {
      error
    } = await supabase.from('lead_columns').delete().eq('id', columnId);
    if (error) {
      console.error('Error deleting column:', error);
      toast({
        title: "Error",
        description: "Error al eliminar la columna",
        variant: "destructive"
      });
      return;
    }
    setColumns(columns.filter(col => col.id !== columnId));
    setLeads(leads.filter(lead => lead.column_id !== columnId));
    toast({
      title: "Éxito",
      description: "Columna eliminada correctamente"
    });
  };
  const handleCreateLead = async () => {
    if (!newLead.name.trim()) return;

    // Si no se especifica columna, usar la columna por defecto
    let targetColumnId = newLead.column_id;
    if (!targetColumnId) {
      const defaultColumn = columns.find(col => col.is_default);
      if (defaultColumn) {
        targetColumnId = defaultColumn.id;
      } else if (columns.length > 0) {
        targetColumnId = columns[0].id;
      } else {
        toast({
          title: "Error",
          description: "No hay columnas disponibles",
          variant: "destructive"
        });
        return;
      }
    }
    const {
      data,
      error
    } = await supabase.from('leads').insert({
      name: newLead.name,
      email: newLead.email || null,
      phone: newLead.phone || null,
      company: newLead.company || null,
      value: newLead.value ? parseFloat(newLead.value) : null,
      notes: newLead.notes || null,
      column_id: targetColumnId,
      user_id: effectiveUserId,
      position: leads.filter(l => l.column_id === targetColumnId).length
    }).select(`
        *,
        lead_columns(*)
      `).single();
    if (error) {
      console.error('Error creating lead:', error);
      toast({
        title: "Error",
        description: "Error al crear el lead",
        variant: "destructive"
      });
      return;
    }
    setLeads([...leads, data]);
    setNewLead({
      name: '',
      email: '',
      phone: '',
      company: '',
      value: '',
      notes: '',
      column_id: ''
    });
    setShowLeadDialog(false);
    toast({
      title: "Éxito",
      description: "Lead creado correctamente"
    });
  };
  const handleMoveLeadToColumn = async (leadId: string, targetColumnId: string) => {
    // Verificar si es un lead virtual (conversación huérfana)
    const isVirtualLead = leadId.startsWith('virtual-');
    if (isVirtualLead) {
      // Convertir lead virtual a lead real
      const virtualLead = leads.find(l => l.id === leadId);
      if (!virtualLead || !virtualLead.originalConversationId) return;
      const previousLeads = [...leads];

      // Remover el lead virtual de la UI inmediatamente
      setLeads(leads.filter(l => l.id !== leadId));
      try {
        // Crear lead real en la base de datos
        const {
          data: newLead,
          error: createError
        } = await supabase.from('leads').insert({
          name: virtualLead.name,
          phone: virtualLead.phone,
          column_id: targetColumnId,
          position: leads.filter(l => l.column_id === targetColumnId).length,
          user_id: effectiveUserId
        }).select(`
            *,
            lead_columns(*)
          `).single();
        if (createError) throw createError;

        // Vincular la conversación al nuevo lead
        const {
          error: linkError
        } = await supabase.from('conversations').update({
          lead_id: newLead.id
        }).eq('id', virtualLead.originalConversationId);
        if (linkError) {
          console.error('Error linking conversation:', linkError);
        }

        // Agregar el lead real a la lista
        setLeads(prev => [...prev.filter(l => l.id !== leadId), {
          ...newLead,
          conversations: virtualLead.conversations
        }]);
        toast({
          title: "Lead creado",
          description: `${virtualLead.name} fue agregado al embudo`
        });
      } catch (error) {
        console.error('Error converting virtual lead:', error);
        setLeads(previousLeads);
        toast({
          title: "Error",
          description: "Error al crear el lead",
          variant: "destructive"
        });
      }
      return;
    }

    // Lead real - comportamiento normal
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    
    const sourceColumnId = lead.column_id;
    const previousLeads = [...leads];

    // ✅ ACTUALIZACIÓN OPTIMISTA INMEDIATA - UI responde al instante
    // Actualizar estado local
    setLeads(leads.map(l => l.id === leadId ? {
      ...l,
      column_id: targetColumnId,
      position: leads.filter(x => x.column_id === targetColumnId).length
    } : l));
    
    // También actualizar el cache del hook de paginación
    moveLeadOptimistic(leadId, sourceColumnId, targetColumnId);

    // Llamada a BD en background (no bloquea UI)
    try {
      const {
        error
      } = await supabase.from('leads').update({
        column_id: targetColumnId,
        position: leads.filter(l => l.column_id === targetColumnId).length
      }).eq('id', leadId);
      if (error) throw error;
    } catch (error) {
      // Revertir si falla
      console.error('Error moving lead:', error);
      setLeads(previousLeads);
      toast({
        title: "Error",
        description: "Error al mover el lead. Se revirtió el cambio.",
        variant: "destructive"
      });
    }
  };
  const handleDeleteLead = async (leadId: string) => {
    const {
      error
    } = await supabase.from('leads').delete().eq('id', leadId);
    if (error) {
      console.error('Error deleting lead:', error);
      toast({
        title: "Error",
        description: "Error al eliminar el lead",
        variant: "destructive"
      });
      return;
    }
    setLeads(leads.filter(lead => lead.id !== leadId));
    toast({
      title: "Éxito",
      description: "Lead eliminado correctamente"
    });
  };
  const openEditColumnDialog = (column: LeadColumn) => {
    setEditingColumn(column);
    setNewColumnName(column.name);
    setNewColumnColor(column.color);
    setShowColumnDialog(true);
  };
  const openCreateColumnDialog = () => {
    if (!selectedWorkspace) {
      toast({
        title: "Atención",
        description: "Por favor selecciona un espacio de trabajo primero",
        variant: "default"
      });
      return;
    }
    setEditingColumn(null);
    setNewColumnName('');
    setNewColumnColor('#22c55e');
    setShowColumnDialog(true);
  };
  const openCreateLeadDialog = (columnId: string) => {
    setNewLead({
      name: '',
      email: '',
      phone: '',
      company: '',
      value: '',
      notes: '',
      column_id: columnId
    });
    setShowLeadDialog(true);
  };
  const openConvertDialog = (column: LeadColumn) => {
    setConvertingColumn(column);
    setContactListName(`Lista de ${column.name}`);
    setShowConvertDialog(true);
  };
  const openMessageTriggersDialog = (column: LeadColumn) => {
    setSelectedColumnForTriggers(column);
    setShowMessageTriggersDialog(true);
  };
  const closeMessageTriggersDialog = () => {
    setShowMessageTriggersDialog(false);
    setSelectedColumnForTriggers(null);
  };
  const handleConvertToContactList = async () => {
    if (!convertingColumn || !contactListName.trim()) return;
    try {
      // Obtener leads de la columna
      const columnLeads = leads.filter(lead => lead.column_id === convertingColumn.id);
      if (columnLeads.length === 0) {
        toast({
          title: "Error",
          description: "No hay leads en esta columna para convertir",
          variant: "destructive"
        });
        return;
      }

      // Crear la lista de contactos
      const {
        data: contactList,
        error: listError
      } = await supabase.from('contact_lists').insert({
        name: contactListName,
        description: `Lista creada desde la columna: ${convertingColumn.name}`,
        user_id: effectiveUserId
      }).select().single();
      if (listError) {
        console.error('Error creating contact list:', listError);
        toast({
          title: "Error",
          description: "Error al crear la lista de contactos",
          variant: "destructive"
        });
        return;
      }

      // Convertir leads a contactos
      const contactsToInsert = [];
      const contactListMembersToInsert = [];
      for (const lead of columnLeads) {
        if (lead.phone) {
          // Solo convertir leads que tengan teléfono
          // Crear contacto
          const {
            data: contact,
            error: contactError
          } = await supabase.from('contacts').insert({
            name: lead.name,
            phone_number: lead.phone,
            email: lead.email,
            user_id: effectiveUserId
          }).select().single();
          if (contactError) {
            console.error('Error creating contact:', contactError);
            continue; // Continuar con el siguiente lead
          }

          // Agregar a la lista de contactos
          const {
            error: memberError
          } = await supabase.from('contact_list_members').insert({
            contact_id: contact.id,
            contact_list_id: contactList.id
          });
          if (memberError) {
            console.error('Error adding contact to list:', memberError);
          }
        }
      }
      setShowConvertDialog(false);
      setConvertingColumn(null);
      setContactListName('');
      toast({
        title: "Éxito",
        description: `Lista de contactos "${contactListName}" creada correctamente`
      });
    } catch (error) {
      console.error('Error converting to contact list:', error);
      toast({
        title: "Error",
        description: "Error al convertir a lista de contactos",
        variant: "destructive"
      });
    }
  };
  if (loading) {
    return <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando...</div>
      </div>;
  }
  return <div className="space-y-6 bg-background min-h-screen p-6">
      {/* Header with Workspace Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestión de Embudos </h1>
            <p className="text-muted-foreground mt-1">Organiza y gestiona tus leads en diferentes etapas</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Select value={selectedWorkspace || ''} onValueChange={setSelectedWorkspace}>
            <SelectTrigger className="w-[280px] bg-card border-border">
              <SelectValue placeholder="Seleccionar espacio" />
            </SelectTrigger>
            <SelectContent>
              {workspaces.map(workspace => <SelectItem key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </SelectItem>)}
            </SelectContent>
          </Select>

          {/* Indicador de actualización realtime */}
          {isRefreshing && <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-md border border-primary/20">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="text-xs text-primary">Actualizando...</span>
            </div>}

          <Button variant="outline" size="icon" onClick={() => loadLeads()} disabled={loading || isRefreshing} title="Recargar leads">
            <RefreshCw className={`h-4 w-4 ${loading || isRefreshing ? 'animate-spin' : ''}`} />
          </Button>

          {canCreateFunnels && <Button onClick={openCreateColumnDialog} className="bg-gradient-primary hover:opacity-90 transition-all duration-200 shadow-glow">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Columna
            </Button>}
        </div>
      </div>

      {/* Search Filter */}
      

      {/* Filter Results Info */}
      {searchFilter && <div className="flex items-center justify-between bg-primary/10 p-3 rounded-lg border border-primary/20">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground">
              Mostrando {filteredLeads.length} de {leads.length} embudos que coinciden con "{searchFilter}"
            </span>
          </div>
          {filteredLeads.length === 0 && <span className="text-sm text-muted-foreground">No se encontraron resultados</span>}
        </div>}

      <KanbanBoard columns={columns} leads={filteredLeads} onEditColumn={canEditFunnels ? openEditColumnDialog : undefined} onDeleteColumn={canDeleteFunnels ? handleDeleteColumn : undefined} onCreateLead={canCreateFunnels ? openCreateLeadDialog : undefined} onDeleteLead={canDeleteFunnels ? handleDeleteLead : undefined} onMoveLeadToColumn={canMoveContacts ? handleMoveLeadToColumn : undefined} onConvertToContactList={openConvertDialog} onManageMessageTriggers={openMessageTriggersDialog} onOpenConversation={handleLeadClick} onLoadMore={loadMore} getColumnState={getColumnState} />

      {/* Column Dialog */}
      <Dialog open={showColumnDialog} onOpenChange={setShowColumnDialog}>
        <DialogContent className="bg-[#2a3942] border-[#3e4c59] text-white max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">
              {editingColumn ? 'Editar embudo' : 'Agregar embudo'}
            </DialogTitle>
          </DialogHeader>
          
          {/* Icono de edición centrado */}
          <div className="flex justify-center py-4">
            <div className="w-16 h-16 rounded-lg bg-[#202c33] flex items-center justify-center">
              <Edit className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          <div className="space-y-6">
            {/* Campo de nombre con badge */}
            <div className="space-y-2">
              <div className="flex items-center space-x-3 bg-[#202c33] rounded-lg px-4 py-3">
                <span className="bg-pink-500 text-white text-xs font-bold px-2 py-1 rounded">
                  {editingColumn ? columns.findIndex(c => c.id === editingColumn.id) + 1 : columns.length + 1}
                </span>
                <Input id="column-name" value={newColumnName} onChange={e => setNewColumnName(e.target.value)} placeholder="Nombre del embudo" className="flex-1 border-0 bg-transparent text-white placeholder:text-gray-500 focus-visible:ring-0 px-0 uppercase" />
              </div>
            </div>

            {/* Sección de colores */}
            <div className="space-y-3">
              <Label className="text-white text-lg font-semibold">Color</Label>
              <div className="grid grid-cols-9 gap-2">
                {/* Fila 1: Verdes */}
                {['#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0891b2', '#0284c7', '#3b82f6', '#2563eb', '#1d4ed8'].map(color => <button key={color} type="button" onClick={() => setNewColumnColor(color)} className={`w-10 h-10 rounded-full transition-transform hover:scale-110 ${newColumnColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#2a3942]' : ''}`} style={{
                backgroundColor: color
              }} />)}
                
                {/* Fila 2: Purples y Magentas */}
                {['#8b5cf6', '#7c3aed', '#a855f7', '#d946ef', '#ec4899', '#db2777', '#ef4444', '#f87171', '#fb923c'].map(color => <button key={color} type="button" onClick={() => setNewColumnColor(color)} className={`w-10 h-10 rounded-full transition-transform hover:scale-110 ${newColumnColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#2a3942]' : ''}`} style={{
                backgroundColor: color
              }} />)}
                
                {/* Fila 3: Rojos y Naranjas */}
                {['#dc2626', '#b91c1c', '#b45309', '#d97706', '#f59e0b', '#f97316', '#fb923c', '#fbbf24', '#facc15'].map(color => <button key={color} type="button" onClick={() => setNewColumnColor(color)} className={`w-10 h-10 rounded-full transition-transform hover:scale-110 ${newColumnColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#2a3942]' : ''}`} style={{
                backgroundColor: color
              }} />)}
                
                {/* Fila 4: Grises y Negro */}
                {['#ffffff', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937', '#000000'].map(color => <button key={color} type="button" onClick={() => setNewColumnColor(color)} className={`w-10 h-10 rounded-full transition-transform hover:scale-110 ${newColumnColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#2a3942]' : ''} ${color === '#ffffff' ? 'border border-gray-600' : ''}`} style={{
                backgroundColor: color
              }} />)}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button onClick={editingColumn ? handleUpdateColumn : handleCreateColumn} className="w-full bg-[#00a884] hover:bg-[#00a884]/90 text-white font-medium py-3 rounded-lg">
              <Edit className="h-4 w-4 mr-2" />
              {editingColumn ? 'Editar embudo' : 'Agregar embudo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lead Dialog */}
      <Dialog open={showLeadDialog} onOpenChange={setShowLeadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Embudo</DialogTitle>
            <DialogDescription>
              Agrega un nuevo embudo a la columna
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="lead-name">Nombre *</Label>
              <Input id="lead-name" value={newLead.name} onChange={e => setNewLead({
              ...newLead,
              name: e.target.value
            })} placeholder="Nombre del lead" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-email">Email</Label>
              <Input id="lead-email" type="email" value={newLead.email} onChange={e => setNewLead({
              ...newLead,
              email: e.target.value
            })} placeholder="email@ejemplo.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-phone">Teléfono</Label>
              <Input id="lead-phone" value={newLead.phone} onChange={e => setNewLead({
              ...newLead,
              phone: e.target.value
            })} placeholder="+54 9 11 1234-5678" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-company">Empresa</Label>
              <Input id="lead-company" value={newLead.company} onChange={e => setNewLead({
              ...newLead,
              company: e.target.value
            })} placeholder="Nombre de la empresa" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-value">Valor Estimado</Label>
              <Input id="lead-value" type="number" value={newLead.value} onChange={e => setNewLead({
              ...newLead,
              value: e.target.value
            })} placeholder="1000" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-notes">Notas</Label>
              <Textarea id="lead-notes" value={newLead.notes} onChange={e => setNewLead({
              ...newLead,
              notes: e.target.value
            })} placeholder="Notas adicionales..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeadDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateLead}>
              Crear Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de conversión a lista de contactos */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convertir a Lista de Contactos</DialogTitle>
            <DialogDescription>
              Convertir todos los embudos de la columna "{convertingColumn?.name}" en una lista de contactos.
              Solo se convertirán los embudos que tengan número de teléfono.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contact-list-name" className="text-right">
                Nombre de la lista
              </Label>
              <Input id="contact-list-name" value={contactListName} onChange={e => setContactListName(e.target.value)} className="col-span-3" placeholder="Nombre para la lista de contactos" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvertDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConvertToContactList}>
              Convertir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Triggers Dialog */}
      <MessageTriggersDialog isOpen={showMessageTriggersDialog} onClose={closeMessageTriggersDialog} column={selectedColumnForTriggers} />
      {/* Modal de Chat */}
      <ChatModal 
        isOpen={isChatModalOpen} 
        onClose={() => {
          setIsChatModalOpen(false);
          setSelectedConversation(null);
          setSelectedConversationId(null);
          setSelectedWhatsAppSession(null);
        }} 
        conversation={selectedConversation} 
        messages={messages} 
        onSendMessage={handleSendMessage} 
        isSending={isSending}
        onWhatsAppSessionChange={setSelectedWhatsAppSession}
      />
    </div>;
};
export default Leads;