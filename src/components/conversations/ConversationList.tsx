import React, { useEffect, useState, useCallback, memo, useMemo } from 'react';
import { Search, MessageCircle, Phone, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import EmbudosFilter from './EmbudosFilter';
import { EmbudoResponse } from '@/services/embudoServices';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProfile } from '@/hooks/useProfile';
import { FilterMode, SessionOption } from '@/pages/Conversations';
import { useTags } from '@/hooks/useTags';
import { supabase } from '@/integrations/supabase/client';

type Conversation = Database['public']['Tables']['conversations']['Row'];

interface ContactWithTags {
  phone_number: string;
  tags: string[] | null;
}

interface Workspace {
  id: string;
  name: string;
  position: number;
  user_id: string;
  created_at: string | null;
  updated_at: string | null;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  isLoading: boolean;
  unreadCount: number;
  workspaces?: Workspace[];
  selectedWorkspace?: Workspace | null;
  onWorkspaceSelect?: (workspace: Workspace | null) => void;
  embudos?: EmbudoResponse[];
  selectedEmbudo?: EmbudoResponse | null;
  onEmbudoSelect?: (embudo: EmbudoResponse | null) => void;
  filterMode?: FilterMode;
  onFilterModeChange?: (mode: FilterMode) => void;
  sessionOptions?: SessionOption[];
  selectedSessionFilter?: string | null;
  onSessionFilterChange?: (sessionId: string | null) => void;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  searchTerm,
  onSearchChange,
  isLoading,
  unreadCount,
  workspaces = [],
  selectedWorkspace = null,
  onWorkspaceSelect = () => {},
  embudos = [],
  selectedEmbudo = null,
  onEmbudoSelect = () => {},
  filterMode = 'all',
  onFilterModeChange = () => {},
  sessionOptions = [],
  selectedSessionFilter = null,
  onSessionFilterChange = () => {}
}) => {
  const { isCajero } = useProfile();
  const { etiquetas, getTagColor } = useTags();
  const [contactTags, setContactTags] = useState<Record<string, string[]>>({});

  // Cargar etiquetas de contactos
  useEffect(() => {
    const loadContactTags = async () => {
      if (conversations.length === 0) return;
      
      const phoneNumbers = conversations.map(c => c.phone_number).filter(Boolean);
      if (phoneNumbers.length === 0) return;

      const { data: contacts } = await supabase
        .from('contacts')
        .select('phone_number, tags')
        .in('phone_number', phoneNumbers);

      if (contacts) {
        const tagsMap: Record<string, string[]> = {};
        contacts.forEach(c => {
          if (c.tags && c.tags.length > 0) {
            tagsMap[c.phone_number] = c.tags;
          }
        });
        setContactTags(tagsMap);
      }
    };

    loadContactTags();
  }, [conversations]);

  // Función para enmascarar números de teléfono
  const maskPhoneNumber = (phone: string | null) => {
    if (!phone) return 'Contacto';
    return '****' + phone.slice(-4);
  };
  
  // Formatear tiempo
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    if (diffInHours < 24) {
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (diffInHours < 168) {
      // 7 días
      return date.toLocaleDateString('es-ES', {
        weekday: 'short'
      });
    } else {
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit'
      });
    }
  };

  // Obtener iniciales del nombre
  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  const getSessionIcon = (type: SessionOption['type']) => {
    switch (type) {
      case 'whatsapp':
        return <Phone className="h-3 w-3 text-primary" />;
      case 'telegram':
        return <Send className="h-3 w-3 text-telegram-blue" />;
      case 'twilio':
        return <MessageCircle className="h-3 w-3 text-[hsl(var(--twilio-red))]" />;
    }
  };

  return <div className="h-full border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold">Chats</h1>
          {unreadCount > 0 && <Badge variant="destructive" className="text-xs">{unreadCount}</Badge>}
        </div>

        {/* Filtro de Modo */}
        <Select value={filterMode} onValueChange={(value: FilterMode) => onFilterModeChange(value)}>
          <SelectTrigger className="w-full mb-2 text-sm">
            <SelectValue placeholder="Mostrar conversaciones" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las conversaciones</SelectItem>
            <SelectItem value="unassigned">Sin embudo asignado</SelectItem>
            <SelectItem value="funnel">Por embudo</SelectItem>
          </SelectContent>
        </Select>

        {/* Selector de Sesión */}
        {sessionOptions.length > 0 && (
          <Select 
            value={selectedSessionFilter || 'all'} 
            onValueChange={value => onSessionFilterChange(value === 'all' ? null : value)}
          >
            <SelectTrigger className="w-full mb-2 text-sm">
              <SelectValue placeholder="Todas las sesiones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las sesiones</SelectItem>
              {sessionOptions.map(session => (
                <SelectItem key={session.id} value={session.id}>
                  <div className="flex items-center gap-2">
                    {getSessionIcon(session.type)}
                    <span>{session.name}</span>
                    <span className="text-xs text-muted-foreground">({session.identifier.slice(-6)})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Selector de Workspace (solo cuando filterMode es 'funnel') */}
        {filterMode === 'funnel' && workspaces.length > 0 && (
          <Select value={selectedWorkspace?.id || ''} onValueChange={value => {
            const workspace = workspaces.find(w => w.id === value);
            onWorkspaceSelect(workspace || null);
          }}>
            <SelectTrigger className="w-full bg-primary text-primary-foreground border-2 border-primary hover:bg-primary/90 font-medium text-sm">
              <SelectValue placeholder="Seleccionar espacio">
                {selectedWorkspace?.name || 'Seleccionar espacio'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {workspaces.map(workspace => (
                <SelectItem key={workspace.id} value={workspace.id}>{workspace.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Filtro de Embudos (solo cuando filterMode es 'funnel') */}
      {filterMode === 'funnel' && embudos.length > 0 && (
        <EmbudosFilter embudos={embudos} selectedEmbudo={selectedEmbudo} onEmbudoSelect={onEmbudoSelect} />
      )}

      {/* Barra de búsqueda */}
      <div className="relative p-4 pt-2 pb-2">
        <Search className="absolute left-7 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar conversaciones..." value={searchTerm} onChange={e => onSearchChange(e.target.value)} className="pl-10" />
      </div>

      {/* Lista de conversaciones */}
      <ScrollArea className="flex-1">
        {isLoading ? <div className="p-4 text-center text-muted-foreground">
            Cargando conversaciones...
          </div> : conversations.length === 0 ? <div className="p-4 text-center text-muted-foreground">
            {searchTerm ? 'No se encontraron conversaciones' : 'No hay conversaciones'}
          </div> : <div className="divide-y divide-border">
            {conversations.map(conversation => <ConversationItem key={conversation.id} conversation={conversation} isSelected={selectedConversation?.id === conversation.id} onSelect={() => onSelectConversation(conversation)} formatTime={formatTime} getInitials={getInitials} isCajero={isCajero} maskPhoneNumber={maskPhoneNumber} tags={contactTags[conversation.phone_number] || []} getTagColor={getTagColor} />)}
          </div>}
      </ScrollArea>
    </div>;
};

// Componente separado y memoizado para cada item de conversación
interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
  formatTime: (dateString: string) => string;
  getInitials: (name: string | null) => string;
  isCajero: boolean;
  maskPhoneNumber: (phone: string | null) => string;
  tags: string[];
  getTagColor: (tagName: string) => string;
}

const ConversationItem = memo<ConversationItemProps>(({
  conversation,
  isSelected,
  onSelect,
  formatTime,
  getInitials,
  isCajero,
  maskPhoneNumber,
  tags,
  getTagColor
}) => {
  // Determinar el ícono según el tipo de canal
  const channelIcon = useMemo(() => {
    if (conversation.channel_type === 'telegram') {
      return <MessageCircle className="h-4 w-4 text-telegram-blue" />;
    }
    if (conversation.channel_type === 'twilio') {
      return <MessageCircle className="h-4 w-4 text-[hsl(var(--twilio-red))]" />;
    }
    return null;
  }, [conversation.channel_type]);

  return (
    <div 
      onClick={onSelect} 
      className={cn(
        "p-4 cursor-pointer hover:bg-muted/50 transition-colors", 
        isSelected && "bg-muted"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(conversation.pushname)}
            </AvatarFallback>
          </Avatar>
          {channelIcon && (
            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border border-border">
              {channelIcon}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-medium truncate">
                {conversation.pushname || (isCajero ? maskPhoneNumber(conversation.whatsapp_number) : conversation.whatsapp_number)}
              </h3>
            </div>
            <span className="text-xs text-muted-foreground">
              {conversation.last_message_time && formatTime(conversation.last_message_time)}
            </span>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {tags.slice(0, 3).map((tag) => (
                <Badge 
                  key={tag} 
                  variant="outline" 
                  className="text-[10px] px-1.5 py-0 h-4 border-0"
                  style={{ 
                    backgroundColor: `${getTagColor(tag)}20`,
                    color: getTagColor(tag)
                  }}
                >
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-1">
            <p className="text-sm text-muted-foreground truncate">
              {conversation.last_message || 'Sin mensajes'}
            </p>
            {conversation.unread_count && conversation.unread_count > 0 && (
              <Badge variant="destructive" className="text-xs ml-2">
                {conversation.unread_count}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

ConversationItem.displayName = 'ConversationItem';

export default memo(ConversationList);