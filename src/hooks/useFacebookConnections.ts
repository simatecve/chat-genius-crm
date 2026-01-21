import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FacebookConnection {
  id: string;
  user_id: string;
  page_id: string;
  page_name: string;
  page_access_token: string;
  instagram_account_id?: string;
  instagram_username?: string;
  workspace_id?: string;
  default_column_id?: string;
  ai_enabled: boolean;
  n8n_webhook_url?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  instagram_account_id?: string;
  instagram_username?: string;
}

export function useFacebookConnections(userId?: string) {
  const [connections, setConnections] = useState<FacebookConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchConnections = useCallback(async () => {
    if (!userId) {
      setConnections([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('facebook_connections')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConnections(data || []);
    } catch (error: any) {
      console.error('Error fetching Facebook connections:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las conexiones de Facebook',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const createConnection = async (
    page: FacebookPage,
    workspaceId?: string,
    defaultColumnId?: string,
    aiEnabled?: boolean,
    n8nWebhookUrl?: string
  ) => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('facebook_connections')
        .insert({
          user_id: userId,
          page_id: page.id,
          page_name: page.name,
          page_access_token: page.access_token,
          instagram_account_id: page.instagram_account_id,
          instagram_username: page.instagram_username,
          workspace_id: workspaceId,
          default_column_id: defaultColumnId,
          ai_enabled: aiEnabled || false,
          n8n_webhook_url: n8nWebhookUrl,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      setConnections((prev) => [data, ...prev]);
      toast({
        title: 'Conexión creada',
        description: `Página "${page.name}" conectada exitosamente`,
      });

      return data;
    } catch (error: any) {
      console.error('Error creating Facebook connection:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear la conexión',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateConnection = async (
    connectionId: string,
    updates: Partial<FacebookConnection>
  ) => {
    try {
      const { data, error } = await supabase
        .from('facebook_connections')
        .update(updates)
        .eq('id', connectionId)
        .select()
        .single();

      if (error) throw error;

      setConnections((prev) =>
        prev.map((conn) => (conn.id === connectionId ? data : conn))
      );

      toast({
        title: 'Conexión actualizada',
        description: 'Los cambios se guardaron correctamente',
      });

      return data;
    } catch (error: any) {
      console.error('Error updating Facebook connection:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar la conexión',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteConnection = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('facebook_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      setConnections((prev) => prev.filter((conn) => conn.id !== connectionId));
      toast({
        title: 'Conexión eliminada',
        description: 'La conexión se eliminó correctamente',
      });

      return true;
    } catch (error: any) {
      console.error('Error deleting Facebook connection:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar la conexión',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    connections,
    loading,
    fetchConnections,
    createConnection,
    updateConnection,
    deleteConnection,
  };
}
