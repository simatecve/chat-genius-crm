import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Etiqueta {
  id: string;
  nombre: string;
  color: string;
  descripcion: string | null;
}

export const useTags = () => {
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEtiquetas();
  }, []);

  const loadEtiquetas = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('etiquetas')
        .select('id, nombre, color, descripcion')
        .order('nombre');

      if (error) throw error;
      setEtiquetas(data || []);
    } catch (error) {
      console.error('Error loading etiquetas:', error);
      setEtiquetas([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getTagColor = (tagName: string): string => {
    const tag = etiquetas.find(e => e.nombre === tagName);
    return tag?.color || '#6b7280'; // Default gray
  };

  const getTagByName = (tagName: string): Etiqueta | undefined => {
    return etiquetas.find(e => e.nombre === tagName);
  };

  return {
    etiquetas,
    isLoading,
    getTagColor,
    getTagByName,
    refresh: loadEtiquetas,
  };
};

// Servicio para sincronizar tags entre contacts y leads
export const syncTagsBetweenContactAndLead = async (
  phoneNumber: string,
  tags: string[]
): Promise<void> => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  try {
    // Actualizar en contacts
    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .or(`phone_number.eq.${cleanPhone},phone_number.eq.${phoneNumber}`)
      .maybeSingle();
    
    if (contact) {
      await supabase
        .from('contacts')
        .update({ tags: tags.length > 0 ? tags : null })
        .eq('id', contact.id);
    }

    // Actualizar en leads
    const { data: lead } = await supabase
      .from('leads')
      .select('id')
      .or(`phone.eq.${cleanPhone},phone.eq.${phoneNumber}`)
      .maybeSingle();
    
    if (lead) {
      await supabase
        .from('leads')
        .update({ tags: tags.length > 0 ? tags : null })
        .eq('id', lead.id);
    }
  } catch (error) {
    console.error('Error syncing tags:', error);
    throw error;
  }
};
