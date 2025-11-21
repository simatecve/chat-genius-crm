import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Edit, Trash2, MoreVertical, Building, Mail, Phone, DollarSign, Users, MessageSquare, BotOff, Bot } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { TriggerActivationService } from '@/services/triggerActivationService';
import { useAuth } from '@/hooks/useAuth';
import { useBotBlock } from '@/hooks/useBotBlock';

type LeadColumn = Tables<'lead_columns'>;
type Lead = Tables<'leads'>;

interface LeadWithColumn extends Lead {
  lead_columns?: LeadColumn;
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
}

interface LeadCardProps {
  lead: Lead;
  index: number;
  onEdit?: (lead: Lead) => void;
  onDelete?: (leadId: string) => void;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, index, onEdit, onDelete }) => {
  const { isBlocked, isLoading: isBotToggling, toggleBotBlock } = useBotBlock(
    lead.phone || null,
    lead.name || null
  );

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`mb-3 ${snapshot.isDragging ? 'opacity-50' : ''}`}
        >
          <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm truncate flex-1">
                  {lead.name}
                </div>
                {(onEdit || onDelete || lead.phone) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
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
              
              {lead.company && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <Building className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{lead.company}</span>
                </div>
              )}
              
              {lead.email && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{lead.email}</span>
                </div>
              )}
              
              {lead.phone && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{lead.phone}</span>
                </div>
              )}
              
              {lead.value && (
                <div className="flex items-center text-xs font-medium text-green-600">
                  <DollarSign className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span>${lead.value.toLocaleString()}</span>
                </div>
              )}
              
              {lead.notes && (
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded text-ellipsis overflow-hidden">
                  {lead.notes.length > 50 ? `${lead.notes.substring(0, 50)}...` : lead.notes}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </Draggable>
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
  onManageMessageTriggers
}) => {
  const { user } = useAuth();
  
  const getLeadsByColumn = (columnId: string) => {
    return leads.filter(lead => lead.column_id === columnId);
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
      <div className="flex gap-6 overflow-x-auto pb-4">
        {columns.map((column) => {
          const columnLeads = getLeadsByColumn(column.id);
          
          return (
            <div 
              key={column.id} 
              className="flex-shrink-0 w-80"
            >
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: column.color }}
                      />
                      <CardTitle className="text-sm font-medium">
                        {column.name}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {columnLeads.length}
                      </Badge>
                      {column.is_default && (
                        <Badge variant="outline" className="text-xs">
                          Por defecto
                        </Badge>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
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
                <CardContent className="space-y-3">
                  {/* Add Lead Button */}
                  <Button 
                    variant="outline" 
                    className="w-full justify-start hover:bg-primary/10"
                    onClick={() => onCreateLead(column.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Lead
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
    </DragDropContext>
  );
};

export default KanbanBoard;