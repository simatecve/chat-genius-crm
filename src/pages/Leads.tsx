import React, { useState, useEffect } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, MoreVertical, Building, Mail, Phone, DollarSign, Users, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

import type { Tables } from '@/integrations/supabase/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import KanbanBoard from '@/components/KanbanBoard';
import { MessageTriggersDialog } from '@/components/MessageTriggersDialog';

type LeadColumn = Tables<'lead_columns'>;
type Lead = Tables<'leads'>;

interface LeadWithColumn extends Lead {
  lead_columns?: LeadColumn;
}

const Leads = () => {
  const { user } = useAuth();
  const [columns, setColumns] = useState<LeadColumn[]>([]);
  const [leads, setLeads] = useState<LeadWithColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#3b82f6');
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

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Filtrar leads en tiempo real
  useEffect(() => {
    if (!searchFilter.trim()) {
      setFilteredLeads(leads);
    } else {
      const filtered = leads.filter(lead => {
        const searchTerm = searchFilter.toLowerCase();
        const nameMatch = lead.name?.toLowerCase().includes(searchTerm);
        const phoneMatch = lead.phone?.toLowerCase().includes(searchTerm);
        return nameMatch || phoneMatch;
      });
      setFilteredLeads(filtered);
    }
  }, [leads, searchFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadColumns(), loadLeads()]);
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

  const loadColumns = async () => {
    const { data, error } = await supabase
      .from('lead_columns')
      .select('*')
      .eq('user_id', user?.id)
      .order('position');

    if (error) {
      console.error('Error loading columns:', error);
      return;
    }

    if (data.length === 0) {
      // Crear columna inicial por defecto
      await createDefaultColumn();
    } else {
      setColumns(data);
    }
  };

  const createDefaultColumn = async () => {
    const { data, error } = await supabase
      .from('lead_columns')
      .insert({
        name: 'Nuevos Leads',
        color: '#3b82f6',
        position: 0,
        is_default: true,
        user_id: user?.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating default column:', error);
      return;
    }

    setColumns([data]);
  };

  const loadLeads = async () => {
    // Las políticas RLS se encargan del filtrado automáticamente
    // Solo se mostrarán leads con user_id del usuario o instancias que le pertenecen
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        lead_columns(*)
      `)
      .order('position');

    if (error) {
      console.error('Error loading leads:', error);
      return;
    }

    setLeads(data || []);
  };

  const handleCreateColumn = async () => {
    if (!newColumnName.trim()) return;

    const { data, error } = await supabase
      .from('lead_columns')
      .insert({
        name: newColumnName,
        color: newColumnColor,
        position: columns.length,
        is_default: false,
        user_id: user?.id
      })
      .select()
      .single();

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
    setNewColumnColor('#3b82f6');
    setShowColumnDialog(false);
    toast({
      title: "Éxito",
      description: "Columna creada correctamente"
    });
  };

  const handleUpdateColumn = async () => {
    if (!editingColumn || !newColumnName.trim()) return;

    const { error } = await supabase
      .from('lead_columns')
      .update({
        name: newColumnName,
        color: newColumnColor
      })
      .eq('id', editingColumn.id);

    if (error) {
      console.error('Error updating column:', error);
      toast({
        title: "Error",
        description: "Error al actualizar la columna",
        variant: "destructive"
      });
      return;
    }

    setColumns(columns.map(col => 
      col.id === editingColumn.id 
        ? { ...col, name: newColumnName, color: newColumnColor }
        : col
    ));
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

    const { error } = await supabase
      .from('lead_columns')
      .delete()
      .eq('id', columnId);

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

    const { data, error } = await supabase
      .from('leads')
      .insert({
        name: newLead.name,
        email: newLead.email || null,
        phone: newLead.phone || null,
        company: newLead.company || null,
        value: newLead.value ? parseFloat(newLead.value) : null,
        notes: newLead.notes || null,
        column_id: targetColumnId,
        user_id: user?.id,
        position: leads.filter(l => l.column_id === targetColumnId).length
      })
      .select(`
        *,
        lead_columns(*)
      `)
      .single();

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
    const { error } = await supabase
      .from('leads')
      .update({ 
        column_id: targetColumnId,
        position: leads.filter(l => l.column_id === targetColumnId).length
      })
      .eq('id', leadId);

    if (error) {
      console.error('Error moving lead:', error);
      toast({
        title: "Error",
        description: "Error al mover el lead",
        variant: "destructive"
      });
      return;
    }

    // Update local state
    setLeads(leads.map(lead => 
      lead.id === leadId 
        ? { ...lead, column_id: targetColumnId }
        : lead
    ));
    
    toast({
      title: "Éxito",
      description: "Lead movido correctamente"
    });
  };

  const handleDeleteLead = async (leadId: string) => {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId);

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
    setEditingColumn(null);
    setNewColumnName('');
    setNewColumnColor('#3b82f6');
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
      const { data: contactList, error: listError } = await supabase
        .from('contact_lists')
        .insert({
          name: contactListName,
          description: `Lista creada desde la columna: ${convertingColumn.name}`,
          user_id: user?.id
        })
        .select()
        .single();

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
        if (lead.phone) { // Solo convertir leads que tengan teléfono
          // Crear contacto
          const { data: contact, error: contactError } = await supabase
            .from('contacts')
            .insert({
              name: lead.name,
              phone_number: lead.phone,
              email: lead.email,
              user_id: user?.id
            })
            .select()
            .single();

          if (contactError) {
            console.error('Error creating contact:', contactError);
            continue; // Continuar con el siguiente lead
          }

          // Agregar a la lista de contactos
          const { error: memberError } = await supabase
            .from('contact_list_members')
            .insert({
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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">
            Gestiona tus leads en un tablero Kanban
          </p>
        </div>
        <Button onClick={openCreateColumnDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Columna
        </Button>
      </div>

        {/* Search Filter */}
        <div className="flex items-center space-x-2 bg-white p-4 rounded-lg border">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="🔍 Filtrar por nombre o número de teléfono..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="flex-1"
          />
          {searchFilter && (
             <Button
               variant="ghost"
               size="sm"
               onClick={() => setSearchFilter('')}
               className="text-muted-foreground hover:text-foreground"
             >
               Limpiar
             </Button>
           )}
         </div>

         {/* Filter Results Info */}
         {searchFilter && (
           <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200">
             <div className="flex items-center space-x-2">
               <Search className="h-4 w-4 text-blue-600" />
               <span className="text-sm text-blue-700">
                 Mostrando {filteredLeads.length} de {leads.length} leads que coinciden con "{searchFilter}"
               </span>
             </div>
             {filteredLeads.length === 0 && (
               <span className="text-sm text-blue-600">No se encontraron resultados</span>
             )}
           </div>
         )}

        {/* Kanban Board */}
        <KanbanBoard
          columns={columns}
          leads={filteredLeads}
          onEditColumn={openEditColumnDialog}
          onDeleteColumn={handleDeleteColumn}
          onCreateLead={openCreateLeadDialog}
          onEditLead={undefined}
          onDeleteLead={handleDeleteLead}
          onMoveLeadToColumn={handleMoveLeadToColumn}
          onConvertToContactList={openConvertDialog}
          onManageMessageTriggers={openMessageTriggersDialog}
        />

        {/* Column Dialog */}
        <Dialog open={showColumnDialog} onOpenChange={setShowColumnDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingColumn ? 'Editar Columna' : 'Nueva Columna'}
              </DialogTitle>
              <DialogDescription>
                {editingColumn ? 'Modifica los datos de la columna' : 'Crea una nueva columna para organizar tus leads'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="column-name" className="text-right">
                  Nombre *
                </Label>
                <Input
                  id="column-name"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  className="col-span-3"
                  placeholder="Ej: Contactados, Calificados..."
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="column-color" className="text-right">
                  Color
                </Label>
                <Input
                  id="column-color"
                  type="color"
                  value={newColumnColor}
                  onChange={(e) => setNewColumnColor(e.target.value)}
                  className="col-span-3 h-10"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowColumnDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={editingColumn ? handleUpdateColumn : handleCreateColumn}>
                {editingColumn ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Lead Dialog */}
        <Dialog open={showLeadDialog} onOpenChange={setShowLeadDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nuevo Lead</DialogTitle>
              <DialogDescription>
                Agrega un nuevo lead a la columna
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="lead-name">Nombre *</Label>
                <Input
                  id="lead-name"
                  value={newLead.name}
                  onChange={(e) => setNewLead({...newLead, name: e.target.value})}
                  placeholder="Nombre del lead"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lead-email">Email</Label>
                <Input
                  id="lead-email"
                  type="email"
                  value={newLead.email}
                  onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                  placeholder="email@ejemplo.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lead-phone">Teléfono</Label>
                <Input
                  id="lead-phone"
                  value={newLead.phone}
                  onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                  placeholder="+54 9 11 1234-5678"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lead-company">Empresa</Label>
                <Input
                  id="lead-company"
                  value={newLead.company}
                  onChange={(e) => setNewLead({...newLead, company: e.target.value})}
                  placeholder="Nombre de la empresa"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lead-value">Valor Estimado</Label>
                <Input
                  id="lead-value"
                  type="number"
                  value={newLead.value}
                  onChange={(e) => setNewLead({...newLead, value: e.target.value})}
                  placeholder="1000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lead-notes">Notas</Label>
                <Textarea
                  id="lead-notes"
                  value={newLead.notes}
                  onChange={(e) => setNewLead({...newLead, notes: e.target.value})}
                  placeholder="Notas adicionales..."
                  rows={3}
                />
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
                Convertir todos los leads de la columna "{convertingColumn?.name}" en una lista de contactos.
                Solo se convertirán los leads que tengan número de teléfono.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="contact-list-name" className="text-right">
                  Nombre de la lista
                </Label>
                <Input
                  id="contact-list-name"
                  value={contactListName}
                  onChange={(e) => setContactListName(e.target.value)}
                  className="col-span-3"
                  placeholder="Nombre para la lista de contactos"
                />
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
        <MessageTriggersDialog
          isOpen={showMessageTriggersDialog}
          onClose={closeMessageTriggersDialog}
          column={selectedColumnForTriggers}
        />
      </div>
    
  );
};

export default Leads;