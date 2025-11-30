import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUserId } from './useEffectiveUserId';

export interface WhatsAppConnection {
  id: string;
  name: string | null;
  phone_number: string;
  status: string | null;
  created_at: string | null;
}

export const useWhatsAppConnections = () => {
  const { effectiveUserId } = useEffectiveUserId();

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['whatsapp-connections', effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];

      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('id, name, phone_number, status, created_at')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching WhatsApp connections:', error);
        throw error;
      }

      return data as WhatsAppConnection[];
    },
    enabled: !!effectiveUserId,
  });

  const activeConnections = connections.filter(
    conn => conn.status === 'WORKING'
  );

  const getConnectionByName = (name: string | null) => {
    if (!name) return null;
    return connections.find(conn => conn.name === name);
  };

  const isSessionActive = (sessionName: string | null) => {
    if (!sessionName) return false;
    const connection = getConnectionByName(sessionName);
    return connection?.status === 'WORKING';
  };

  return {
    connections,
    activeConnections,
    isLoading,
    getConnectionByName,
    isSessionActive,
  };
};
