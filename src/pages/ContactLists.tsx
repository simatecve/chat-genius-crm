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
import { Trash2, Edit, Plus, Users, Calendar } from 'lucide-react';
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
  const [editingList, setEditingList] = useState<ContactList | null>(null);
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
    setEditingList(null);
    resetForm();
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
    
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Listas de Contactos</h1>
            <p className="text-muted-foreground mt-2">Gestiona tus listas de contactos para campañas y comunicaciones</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Lista
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Crear Nueva Lista de Contactos</DialogTitle>
              <DialogDescription>
                Crea una nueva lista para organizar tus contactos
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nombre *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="col-span-3"
                  placeholder="Ej: Clientes VIP"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Descripción
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="col-span-3"
                  placeholder="Descripción opcional de la lista"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button onClick={handleCreateList} className="bg-primary hover:bg-primary/90">
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
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Primera Lista
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contactLists.map((list) => (
              <Card key={list.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle 
                        className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
                        onClick={() => navigate(`/contactos/${list.id}`)}
                      >
                        {list.name}
                      </CardTitle>
                      {list.description && (
                        <CardDescription className="mt-2">
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
                <CardContent>
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Lista de Contactos</DialogTitle>
            <DialogDescription>
              Modifica los detalles de tu lista de contactos
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Nombre *
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3"
                placeholder="Ej: Clientes VIP"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">
                Descripción
              </Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="col-span-3"
                placeholder="Descripción opcional de la lista"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button onClick={handleEditList} className="bg-primary hover:bg-primary/90">
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    
  );
};

export default ContactLists;