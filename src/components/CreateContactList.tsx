import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CreateContactListProps {
  onContactListCreated?: () => void;
  triggerButton?: React.ReactNode;
}

const CreateContactList: React.FC<CreateContactListProps> = ({ 
  onContactListCreated,
  triggerButton 
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre de la lista es requerido',
        variant: 'destructive'
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Error',
        description: 'Debes estar autenticado para crear una lista',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('contact_lists')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: 'Éxito',
        description: 'Lista de contactos creada exitosamente'
      });

      // Reset form
      setFormData({ name: '', description: '' });
      setIsOpen(false);
      
      // Notify parent component
      if (onContactListCreated) {
        onContactListCreated();
      }
    } catch (error: any) {
      console.error('Error creating contact list:', error);
      
      let errorMessage = 'No se pudo crear la lista de contactos';
      
      if (error.code === '23505') {
        errorMessage = 'Ya existe una lista con ese nombre';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', description: '' });
    setIsOpen(false);
  };

  const defaultTrigger = (
    <Button className="bg-blue-600 hover:bg-blue-700">
      <Plus className="w-4 h-4 mr-2" />
      Nueva Lista
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear Nueva Lista de Contactos</DialogTitle>
          <DialogDescription>
            Crea una nueva lista para organizar tus contactos
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
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
                placeholder="Ej: Clientes VIP, Familia, Trabajo..."
                maxLength={100}
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                Descripción
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="col-span-3"
                placeholder="Descripción opcional de la lista..."
                rows={3}
                maxLength={500}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={loading || !formData.name.trim()}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Lista
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateContactList;