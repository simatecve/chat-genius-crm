import React from 'react';
import { Search, MoreVertical, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import EmbudosFilter from './EmbudosFilter';
import { EmbudoResponse } from '@/services/embudoServices';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
type Conversation = Database['public']['Tables']['conversations']['Row'];
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
  onEmbudoSelect = () => {}
}) => {
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
  return <div className="w-[23%] border-r border-border flex flex-col">{/* Reducido 30% desde w-1/3 (33%) */}
      {/* Header de conversaciones */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Chats</h1>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>}
            
          </div>
        </div>

        {/* Selector de Workspace */}
        {workspaces.length > 0 && <Select value={selectedWorkspace?.id || ''} onValueChange={value => {
        const workspace = workspaces.find(w => w.id === value);
        onWorkspaceSelect(workspace || null);
      }}>
            <SelectTrigger className="w-full bg-primary text-primary-foreground border-2 border-primary hover:bg-primary/90 font-medium">
              <SelectValue placeholder="Seleccionar espacio">
                {selectedWorkspace?.name || 'Seleccionar espacio'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {workspaces.map(workspace => <SelectItem key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </SelectItem>)}
            </SelectContent>
          </Select>}
      </div>

      {/* Filtro de Embudos */}
      {embudos.length > 0 && <EmbudosFilter embudos={embudos} selectedEmbudo={selectedEmbudo} onEmbudoSelect={onEmbudoSelect} />}

      {/* Barra de búsqueda */}
      <div className="relative p-4 pt-0">
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
            {conversations.map(conversation => <ConversationItem key={conversation.id} conversation={conversation} isSelected={selectedConversation?.id === conversation.id} onSelect={() => onSelectConversation(conversation)} formatTime={formatTime} getInitials={getInitials} />)}
          </div>}
      </ScrollArea>
    </div>;
};

// Componente separado para cada item de conversación
interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
  formatTime: (dateString: string) => string;
  getInitials: (name: string | null) => string;
}
const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isSelected,
  onSelect,
  formatTime,
  getInitials
}) => {
  return <div onClick={onSelect} className={cn("p-4 cursor-pointer hover:bg-muted/50 transition-colors", isSelected && "bg-muted")}>
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-primary text-primary-foreground">
            {getInitials(conversation.pushname)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium truncate">
              {conversation.pushname || conversation.whatsapp_number}
            </h3>
            <span className="text-xs text-muted-foreground">
              {conversation.last_message_time && formatTime(conversation.last_message_time)}
            </span>
          </div>

          <div className="flex items-center justify-between mt-1">
            <p className="text-sm text-muted-foreground truncate">
              {conversation.last_message || 'Sin mensajes'}
            </p>
            {conversation.unread_count && conversation.unread_count > 0 && <Badge variant="destructive" className="text-xs ml-2">
                {conversation.unread_count}
              </Badge>}
          </div>
        </div>
      </div>
    </div>;
};
export default ConversationList;