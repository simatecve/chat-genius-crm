import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Edit, Plus, Users, Calendar, UserPlus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';

import type { Tables } from '@/integrations/supabase/types';

type ContactList = Tables<'contact_lists'>;

interface ContactListWithCount extends ContactList {
  contact_count?: number;
}

const ContactLists = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contactLists, setContactLists] = useState<ContactListWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddContactsDialogOpen, setIsAddContactsDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<ContactList | null>(null);
  const [addingToList, setAddingToList] = useState<ContactList | null>(null);
  const [availableContacts, setAvailableContacts] = useState<any[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    if (user) {
      fetchContactLists();
    }
  }, [user]);

  const fetchContactLists = async () => {
    try {
      setLoading(true);
      
      // Fetch contact lists with contact count
      const { data: lists, error } = await supabase
        .from('contact_lists')
        .select(`
          *,
          contact_list_members(count)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include contact count
      const listsWithCount = lists?.map(list => ({
        ...list,
        contact_count: list.contact_list_members?.[0]?.count || 0
      })) || [];

      setContactLists(listsWithCount);
    } catch (error) {
      console.error('Error fetching contact lists:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las listas de contactos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre de la lista es requerido',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('contact_lists')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          user_id: user?.id!
        });

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Lista de contactos creada exitosamente'
      });

      setIsCreateDialogOpen(false);
      resetForm();
      fetchContactLists();
    } catch (error) {
      console.error('Error creating contact list:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la lista de contactos',
        variant: 'destructive'
      });
    }
  };

  const handleEditList = async () => {
    if (!formData.name.trim() || !editingList) {
      toast({
        title: 'Error',
        description: 'El nombre de la lista es requerido',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('contact_lists')
        .update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingList.id);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Lista de contactos actualizada exitosamente'
      });

      setIsEditDialogOpen(false);
      setEditingList(null);
      resetForm();
      fetchContactLists();
    } catch (error) {
      console.error('Error updating contact list:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la lista de contactos',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteList = async (listId: string, listName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la lista "${listName}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      // First delete all contact list members
      await supabase
        .from('contact_list_members')
        .delete()
        .eq('contact_list_id', listId);

      // Then delete the contact list
      const { error } = await supabase
        .from('contact_lists')
        .delete()
        .eq('id', listId);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Lista de contactos eliminada exitosamente'
      });

      fetchContactLists();
    } catch (error) {
      console.error('Error deleting contact list:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la lista de contactos',
        variant: 'destructive'
      });
    }
  };

  const openEditDialog = (list: ContactList) => {
    setEditingList(list);
    setFormData({
      name: list.name,
      description: list.description || ''
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: ''
    });
  };

  const handleCancel = () => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setIsAddContactsDialogOpen(false);
    setEditingList(null);
    setAddingToList(null);
    setSelectedContacts([]);
    resetForm();
  };

  const openAddContactsDialog = async (list: ContactList) => {
    setAddingToList(list);
    
    // Fetch contacts that are NOT in this list
    try {
      const { data: existingMembers } = await supabase
        .from('contact_list_members')
        .select('contact_id')
        .eq('contact_list_id', list.id);
      
      const existingContactIds = existingMembers?.map(m => m.contact_id) || [];
      
      const { data: allContacts, error } = await supabase
        .from('contacts')
        .select('id, name, phone_number, email')
        .eq('user_id', user?.id)
        .order('name');
      
      if (error) throw error;
      
      // Filter out contacts already in the list
      const available = allContacts?.filter(c => !existingContactIds.includes(c.id)) || [];
      setAvailableContacts(available);
      setIsAddContactsDialogOpen(true);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los contactos',
        variant: 'destructive'
      });
    }
  };

  const handleAddContactsToList = async () => {
    if (!addingToList || selectedContacts.length === 0) return;

    try {
      const members = selectedContacts.map(contactId => ({
        contact_list_id: addingToList.id,
        contact_id: contactId
      }));

      const { error } = await supabase
        .from('contact_list_members')
        .insert(members);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: `${selectedContacts.length} contacto(s) agregado(s) a la lista`
      });

      setIsAddContactsDialogOpen(false);
      setAddingToList(null);
      setSelectedContacts([]);
      fetchContactLists();
    } catch (error) {
      console.error('Error adding contacts to list:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron agregar los contactos',
        variant: 'destructive'
      });
    }
  };

  const toggleContactSelection = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando listas de contactos...</p>
          </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Listas de Contactos</h1>
            <p className="text-muted-foreground mt-2">Gestiona tus listas de contactos para campañas y comunicaciones</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Lista
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Crear Nueva Lista de Contactos</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Crea una nueva lista para organizar tus contactos
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right text-foreground">
                  Nombre *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="col-span-3 bg-background border-border text-foreground"
                  placeholder="Ej: Clientes VIP"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right text-foreground">
                  Descripción
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="col-span-3 bg-background border-border text-foreground"
                  placeholder="Descripción opcional de la lista"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancel} className="border-border hover:bg-muted">
                Cancelar
              </Button>
              <Button onClick={handleCreateList} className="bg-gradient-to-r from-primary to-primary/90">
                Crear Lista
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

        {contactLists.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No tienes listas de contactos</h3>
            <p className="text-muted-foreground mb-6">Crea tu primera lista para comenzar a organizar tus contactos</p>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-primary to-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Primera Lista
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contactLists.map((list) => (
              <Card key={list.id} className="bg-gradient-to-br from-card to-card/80 border-l-4 border-l-primary hover:shadow-lg transition-shadow rounded-xl">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle 
                        className="text-lg font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
                        onClick={() => navigate(`/contactos/${list.id}`)}
                      >
                        {list.name}
                      </CardTitle>
                      {list.description && (
                        <CardDescription className="mt-2 text-muted-foreground">
                          {list.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(list)}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteList(list.id, list.name)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      <span>{list.contact_count || 0} contactos</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>{formatDate(list.created_at)}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAddContactsDialog(list)}
                    className="w-full border-border hover:bg-muted"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Agregar Contactos
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Lista de Contactos</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Modifica los detalles de tu lista de contactos
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right text-foreground">
                Nombre *
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3 bg-background border-border text-foreground"
                placeholder="Ej: Clientes VIP"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right text-foreground">
                Descripción
              </Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="col-span-3 bg-background border-border text-foreground"
                placeholder="Descripción opcional de la lista"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} className="border-border hover:bg-muted">
              Cancelar
            </Button>
            <Button onClick={handleEditList} className="bg-gradient-to-r from-primary to-primary/90">
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Contacts Dialog */}
      <Dialog open={isAddContactsDialogOpen} onOpenChange={setIsAddContactsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Agregar Contactos a "{addingToList?.name}"</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Selecciona los contactos que deseas agregar a esta lista
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {availableContacts.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No hay contactos disponibles para agregar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableContacts.map((contact) => (
                  <div 
                    key={contact.id} 
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => toggleContactSelection(contact.id)}
                  >
                    <Checkbox 
                      checked={selectedContacts.includes(contact.id)}
                      onCheckedChange={() => toggleContactSelection(contact.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{contact.name}</p>
                      <p className="text-sm text-muted-foreground">{contact.phone_number}</p>
                      {contact.email && (
                        <p className="text-xs text-muted-foreground">{contact.email}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} className="border-border hover:bg-muted">
              Cancelar
            </Button>
            <Button 
              onClick={handleAddContactsToList} 
              disabled={selectedContacts.length === 0}
              className="bg-gradient-to-r from-primary to-primary/90"
            >
              Agregar {selectedContacts.length > 0 && `(${selectedContacts.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default ContactLists;