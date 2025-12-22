import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit, Trash2, MoreVertical, Building, Mail, Phone, DollarSign, Users, MessageSquare, BotOff, Bot, Tag } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { TriggerActivationService } from '@/services/triggerActivationService';
import { useAuth } from '@/hooks/useAuth';
import { useBotBlock } from '@/hooks/useBotBlock';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTags, syncTagsBetweenContactAndLead } from '@/hooks/useTags';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

type LeadColumn = Tables<'lead_columns'>;
type Lead = Tables<'leads'>;

interface ConversationSummary {
  id: string;
  phone_number: string;
  pushname: string | null;
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number | null;
}

interface LeadWithColumn extends Lead {
  lead_columns?: LeadColumn;
  conversations?: ConversationSummary[];
}

interface KanbanBoardProps {
  columns: LeadColumn[];
  leads: LeadWithColumn[];
  onEditColumn: (column: LeadColumn) => void;
  onDeleteColumn: (columnId: string) => void;
  onCreateLead: (columnId: string) => void;
  onEditLead?: (lead: Lead) => void;
  onDeleteLead?: (leadId: string) => void;
  onMoveLeadToColumn?: (leadId: string, targetColumnId: string) => void;
  onConvertToContactList?: (column: LeadColumn) => void;
  onManageMessageTriggers?: (column: LeadColumn) => void;
  onOpenConversation?: (lead: LeadWithColumn) => void;
}

interface LeadCardProps {
  lead: LeadWithColumn;
  index: number;
  onEdit?: (lead: Lead) => void;
  onDelete?: (leadId: string) => void;
  onOpenConversation?: (lead: LeadWithColumn) => void;
  getTagColor: (tagName: string) => string;
}

const LeadCard: React.FC<LeadCardProps & { etiquetas: any[], onTagsUpdated?: () => void }> = ({ lead, index, onEdit, onDelete, onOpenConversation, getTagColor, etiquetas, onTagsUpdated }) => {
  const navigate = useNavigate();
  const { isBlocked, isLoading: isBotToggling, toggleBotBlock } = useBotBlock(
    lead.phone || null,
    lead.name || null
  );
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [leadTags, setLeadTags] = useState<string[]>(lead.tags || []);
  const [savingTags, setSavingTags] = useState(false);
  
  const hasConversation = lead.conversations && lead.conversations.length > 0;
  const conversation = hasConversation ? lead.conversations[0] : null;

  const handleOpenConversation = async () => {
    if (onOpenConversation) {
      onOpenConversation(lead);
      return;
    }
    if (lead.phone) {
      // Buscar conversación por número de teléfono
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('phone_number', lead.phone.replace(/\D/g, ''))
        .limit(1);
      
      if (conversations && conversations.length > 0) {
        navigate('/conversations', { state: { conversationId: conversations[0].id } });
      } else if (conversation) {
        // Fallback a la conversación pre-cargada
        navigate('/conversations', { state: { conversationId: conversation.id } });
      }
    }
  };

  // Manejar toggle de etiqueta
  const handleTagToggle = (tagName: string) => {
    setLeadTags(prev => 
      prev.includes(tagName) 
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  // Guardar etiquetas
  const handleSaveTags = async () => {
    setSavingTags(true);
    try {
      // Actualizar lead
      const { error } = await supabase
        .from('leads')
        .update({ tags: leadTags })
        .eq('id', lead.id);
      
      if (error) throw error;

      // Sincronizar con contacto si tiene teléfono
      if (lead.phone) {
        await syncTagsBetweenContactAndLead(lead.phone, leadTags);
      }

      toast({ title: 'Etiquetas actualizadas' });
      setShowTagDialog(false);
      onTagsUpdated?.();
    } catch (error) {
      console.error('Error saving tags:', error);
      toast({ title: 'Error al guardar etiquetas', variant: 'destructive' });
    } finally {
      setSavingTags(false);
    }
  };

  return (
    <>
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`mb-3 ${snapshot.isDragging ? 'opacity-50' : ''}`}
        >
          <Card 
            className="p-2.5 hover:bg-muted/30 transition-all cursor-pointer border-border/40 bg-card/80"
            onClick={(e) => {
              // Solo navegar si no se hizo clic en un botón o menú
              const target = e.target as HTMLElement;
              if (!target.closest('button') && lead.phone) {
                handleOpenConversation();
              }
            }}
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-medium">
                    {lead.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {lead.name}
                    </div>
                    {lead.phone && (
                      <div className="text-xs text-muted-foreground truncate">
                        {lead.phone}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {lead.phone && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0 hover:bg-primary/10"
                        onClick={toggleBotBlock}
                        disabled={isBotToggling}
                        title={isBlocked ? 'Bot desactivado - Click para activar' : 'Bot activo - Click para desactivar'}
                      >
                        {isBlocked ? (
                          <BotOff className="h-3 w-3 text-destructive" />
                        ) : (
                          <Bot className="h-3 w-3 text-green-500" />
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0 hover:bg-primary/10"
                        onClick={handleOpenConversation}
                        title="Abrir conversación"
                      >
                        <MessageSquare className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  {(onEdit || onDelete || lead.phone) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {lead.phone && (
                          <DropdownMenuItem onClick={handleOpenConversation}>
                            <MessageSquare className="h-3 w-3 mr-2" />
                            Ver Conversación
                          </DropdownMenuItem>
                        )}
                        {lead.phone && (
                          <DropdownMenuItem 
                            onClick={toggleBotBlock}
                            disabled={isBotToggling}
                          >
                            {isBlocked ? (
                              <>
                                <Bot className="h-3 w-3 mr-2" />
                                Activar Bot
                              </>
                            ) : (
                              <>
                                <BotOff className="h-3 w-3 mr-2" />
                                Desactivar Bot
                              </>
                            )}
                          </DropdownMenuItem>
                        )}
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(lead)}>
                            <Edit className="h-3 w-3 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setShowTagDialog(true)}>
                          <Tag className="h-3 w-3 mr-2" />
                          Etiquetas
                        </DropdownMenuItem>
                        {onDelete && (
                          <DropdownMenuItem 
                            onClick={() => onDelete(lead.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
              
              {(lead.company || lead.email || lead.notes) && (
                <div className="space-y-1 text-xs text-muted-foreground">
                  {lead.company && (
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3 shrink-0" />
                      <span className="truncate">{lead.company}</span>
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{lead.email}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Etiquetas del lead */}
              {lead.tags && lead.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {lead.tags.slice(0, 3).map((tag) => (
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
                  {lead.tags.length > 3 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      +{lead.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
              
              {lead.value && (
                <Badge variant="secondary" className="text-xs font-medium w-fit">
                  ${lead.value.toLocaleString()}
                </Badge>
              )}
              
              {hasConversation && conversation && (
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-muted-foreground">
                      {conversation.last_message && conversation.last_message.length > 25 
                        ? `${conversation.last_message.substring(0, 25)}...` 
                        : conversation.last_message || "Activo"}
                    </span>
                  </div>
                  {conversation.unread_count > 0 && (
                    <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                      {conversation.unread_count}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </Draggable>
    {/* Dialog de etiquetas - fuera del Draggable */}
    <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Gestionar Etiquetas</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-60">
          <div className="space-y-2 p-1">
            {etiquetas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay etiquetas disponibles
              </p>
            ) : (
              etiquetas.map((etiqueta) => (
                <div 
                  key={etiqueta.id} 
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                  onClick={() => handleTagToggle(etiqueta.nombre)}
                >
                  <Checkbox 
                    checked={leadTags.includes(etiqueta.nombre)}
                    onCheckedChange={() => handleTagToggle(etiqueta.nombre)}
                  />
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: etiqueta.color }}
                  />
                  <span className="text-sm">{etiqueta.nombre}</span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setShowTagDialog(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSaveTags} disabled={savingTags}>
            {savingTags ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  columns,
  leads,
  onEditColumn,
  onDeleteColumn,
  onCreateLead,
  onEditLead,
  onDeleteLead,
  onMoveLeadToColumn,
  onConvertToContactList,
  onManageMessageTriggers,
  onOpenConversation
}) => {
  const { user } = useAuth();
  const { getTagColor, etiquetas, refresh: refreshTags } = useTags();
  const queryClient = useQueryClient();
  
  const getLeadsByColumn = (columnId: string) => {
    return leads
      .filter(lead => lead.column_id === columnId)
      .sort((a, b) => {
        // Obtener el último mensaje de cada lead
        const lastMessageA = a.conversations?.[0]?.last_message_time;
        const lastMessageB = b.conversations?.[0]?.last_message_time;
        
        // Si ninguno tiene conversación, mantener orden por posición
        if (!lastMessageA && !lastMessageB) return a.position - b.position;
        
        // Leads sin conversación van al final
        if (!lastMessageA) return 1;
        if (!lastMessageB) return -1;
        
        // Ordenar por fecha descendente (más reciente primero)
        return new Date(lastMessageB).getTime() - new Date(lastMessageA).getTime();
      });
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Move lead to different column
    if (destination.droppableId !== source.droppableId && onMoveLeadToColumn) {
      // Encontrar el lead que se está moviendo
      const movedLead = leads.find(lead => lead.id === draggableId);
      
      if (movedLead && user) {
        try {
          // Activar disparadores antes de mover el lead
          await TriggerActivationService.activateTriggersOnLeadMove({
            leadId: movedLead.id,
            leadName: movedLead.name,
            leadPhone: movedLead.phone || undefined,
            fromColumnId: source.droppableId,
            toColumnId: destination.droppableId,
            userId: user.id
          });
        } catch (error) {
          console.error('Error al activar disparadores:', error);
          // Continuar con el movimiento aunque falle la activación de disparadores
        }
      }
      
      onMoveLeadToColumn(draggableId, destination.droppableId);
    }
  };



  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <TooltipProvider>
        <div className="flex gap-4 overflow-x-auto pb-4 px-1">
          {columns.map((column) => {
            const columnLeads = getLeadsByColumn(column.id);
            // Contar conversaciones en este embudo
            const conversationsCount = columnLeads.reduce((count, lead) => {
              return count + (lead.conversations?.length || 0);
            }, 0);
            
            return (
              <div 
                key={column.id} 
                className="flex-shrink-0 w-64"
              >
                <Card 
                  className="h-full border-t-4 bg-card/50 backdrop-blur-sm"
                  style={{ borderTopColor: column.color }}
                >
                  <CardHeader className="pb-3 pt-4 px-4">
                    <div className="flex items-center justify-between">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center space-x-2 flex-1 cursor-help">
                            <CardTitle className="text-sm font-semibold uppercase tracking-wide truncate">
                              {column.name}
                            </CardTitle>
                            {column.is_default && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                Por defecto
                              </Badge>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="top" 
                          className="bg-[#1f2c34] border-[#2a3942] px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{column.name}</span>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span className="text-sm font-medium">{conversationsCount}</span>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground font-medium">
                      {columnLeads.length}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="ml-auto h-7 w-7 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditColumn(column)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {onManageMessageTriggers && (
                          <DropdownMenuItem onClick={() => onManageMessageTriggers(column)}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Disparadores de Mensaje
                          </DropdownMenuItem>
                        )}
                        {onConvertToContactList && (
                          <DropdownMenuItem onClick={() => onConvertToContactList(column)}>
                            <Users className="h-4 w-4 mr-2" />
                            Convertir a Lista de Contactos
                          </DropdownMenuItem>
                        )}
                        {!column.is_default && (
                          <DropdownMenuItem 
                            onClick={() => onDeleteColumn(column.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 px-3 pb-3">
                  {/* Add Lead Button */}
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted/50 h-8"
                    onClick={() => onCreateLead(column.id)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-2" />
                    <span className="text-xs">Agregar Lead</span>
                  </Button>

                  {/* Droppable Area for Leads */}
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[200px] space-y-2 ${
                          snapshot.isDraggingOver ? 'bg-primary/5 rounded-lg p-2' : ''
                        }`}
                      >
                        {columnLeads.map((lead, index) => (
                          <LeadCard
                            key={lead.id}
                            lead={lead}
                            index={index}
                            onEdit={onEditLead}
                            onDelete={onDeleteLead}
                            onOpenConversation={onOpenConversation}
                            getTagColor={getTagColor}
                            etiquetas={etiquetas}
                            onTagsUpdated={() => {
                              refreshTags();
                              queryClient.invalidateQueries({ queryKey: ['leads'] });
                            }}
                          />
                        ))}
                        {provided.placeholder}
                        
                        {columnLeads.length === 0 && (
                          <div className="text-center text-muted-foreground text-sm py-8">
                            No hay leads en esta columna
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
      </TooltipProvider>
    </DragDropContext>
  );
};

export default KanbanBoard;
