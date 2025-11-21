import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { KanbanService, LeadData } from '@/services/kanbanService';
import { Database } from '@/integrations/supabase/types';
import { Kanban, Plus, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type LeadColumn = Database['public']['Tables']['lead_columns']['Row'];
type Lead = Database['public']['Tables']['leads']['Row'];

interface AssignToKanbanProps {
  conversationPhone?: string;
  conversationName?: string;
  onLeadAssigned?: (lead: Lead) => void;
}

export const AssignToKanban: React.FC<AssignToKanbanProps> = ({
  conversationPhone,
  conversationName,
  onLeadAssigned
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [columns, setColumns] = useState<LeadColumn[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [existingLead, setExistingLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'assign' | 'create'>('assign');
  
  // Formulario para nuevo lead
  const [newLeadData, setNewLeadData] = useState<LeadData>({
    name: conversationName || '',
    phone: conversationPhone || '',
    email: '',
    company: '',
    value: undefined,
    notes: ''
  });

  const { user } = useAuth();
  const { toast } = useToast();

  // Cargar columnas y buscar lead existente
  useEffect(() => {
    if (isOpen && user?.id) {
      loadData();
    }
  }, [isOpen, user?.id, conversationPhone]);

  const loadData = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Cargar columnas
      const userColumns = await KanbanService.getUserColumns(user.id);
      setColumns(userColumns);
      
      // Buscar lead existente por teléfono
      if (conversationPhone) {
        const lead = await KanbanService.findLeadByPhone(conversationPhone, user.id);
        setExistingLead(lead);
        
        if (lead) {
          setActiveTab('assign');
          setSelectedColumn(lead.column_id);
        } else {
          setActiveTab('create');
          // Seleccionar columna por defecto
          if (userColumns.length > 0) {
            const defaultColumn = userColumns.find(col => col.is_default) || userColumns[0];
            setSelectedColumn(defaultColumn.id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar los datos del Kanban',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignExisting = async () => {
    if (!existingLead || !selectedColumn || !user?.id) return;
    
    setIsLoading(true);
    try {
      const updatedLead = await KanbanService.updateLeadColumn(
        existingLead.id,
        selectedColumn,
        user.id
      );
      
      toast({
        title: 'Lead asignado',
        description: `Lead movido a la columna seleccionada exitosamente`
      });
      
      onLeadAssigned?.(updatedLead);
      setIsOpen(false);
    } catch (error) {
      console.error('Error assigning lead:', error);
      toast({
        title: 'Error',
        description: 'Error al asignar el lead a la columna',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = async () => {
    if (!selectedColumn || !user?.id || !newLeadData.name.trim()) return;
    
    setIsLoading(true);
    try {
      const newLead = await KanbanService.createLead(
        newLeadData,
        selectedColumn,
        user.id
      );
      
      toast({
        title: 'Lead creado',
        description: `Nuevo lead "${newLead.name}" creado y asignado exitosamente`
      });
      
      onLeadAssigned?.(newLead);
      setIsOpen(false);
      
      // Resetear formulario
      setNewLeadData({
        name: conversationName || '',
        phone: conversationPhone || '',
        email: '',
        company: '',
        value: undefined,
        notes: ''
      });
    } catch (error) {
      console.error('Error creating lead:', error);
      toast({
        title: 'Error',
        description: 'Error al crear el nuevo lead',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedColumnName = columns.find(col => col.id === selectedColumn)?.name || '';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Kanban className="h-4 w-4" />
          Asignar a Kanban
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Kanban className="h-5 w-5" />
            Asignar a Kanban
          </DialogTitle>
          <DialogDescription>
            {conversationPhone ? 
              `Asignar conversación de ${conversationName || conversationPhone} al sistema Kanban` :
              'Asignar conversación al sistema Kanban'
            }
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'assign' | 'create')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="assign" disabled={!existingLead}>
                <User className="h-4 w-4 mr-2" />
                Lead Existente
              </TabsTrigger>
              <TabsTrigger value="create">
                <Plus className="h-4 w-4 mr-2" />
                Crear Nuevo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="assign" className="space-y-4">
              {existingLead ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Lead Encontrado</CardTitle>
                    <CardDescription>
                      Se encontró un lead existente para este contacto
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm">
                      <strong>Nombre:</strong> {existingLead.name}
                    </div>
                    {existingLead.phone && (
                      <div className="text-sm">
                        <strong>Teléfono:</strong> {existingLead.phone}
                      </div>
                    )}
                    {existingLead.company && (
                      <div className="text-sm">
                        <strong>Empresa:</strong> {existingLead.company}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground text-center">
                      No se encontró un lead existente para este contacto.
                      Usa la pestaña "Crear Nuevo" para crear uno.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="create" className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={newLeadData.name}
                    onChange={(e) => setNewLeadData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nombre del lead"
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={newLeadData.phone}
                    onChange={(e) => setNewLeadData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Número de teléfono"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newLeadData.email}
                    onChange={(e) => setNewLeadData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Correo electrónico"
                  />
                </div>
                
                <div>
                  <Label htmlFor="company">Empresa</Label>
                  <Input
                    id="company"
                    value={newLeadData.company}
                    onChange={(e) => setNewLeadData(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Nombre de la empresa"
                  />
                </div>
                
                <div>
                  <Label htmlFor="value">Valor Estimado</Label>
                  <Input
                    id="value"
                    type="number"
                    value={newLeadData.value || ''}
                    onChange={(e) => setNewLeadData(prev => ({ 
                      ...prev, 
                      value: e.target.value ? Number(e.target.value) : undefined 
                    }))}
                    placeholder="Valor en $"
                  />
                </div>
                
                <div>
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={newLeadData.notes}
                    onChange={(e) => setNewLeadData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Notas adicionales"
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {!isLoading && columns.length > 0 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="column">Columna de Destino *</Label>
              <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar columna" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((column) => (
                    <SelectItem key={column.id} value={column.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: column.color }}
                        />
                        {column.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                onClick={activeTab === 'assign' ? handleAssignExisting : handleCreateNew}
                disabled={!selectedColumn || (activeTab === 'create' && !newLeadData.name.trim())}
                className="flex-1"
              >
                {activeTab === 'assign' ? 
                  `Mover a ${selectedColumnName}` : 
                  `Crear en ${selectedColumnName}`
                }
              </Button>
            </div>
          </div>
        )}

        {!isLoading && columns.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground text-center">
                No tienes columnas en tu Kanban. Ve al módulo Kanban para crear columnas primero.
              </p>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
};