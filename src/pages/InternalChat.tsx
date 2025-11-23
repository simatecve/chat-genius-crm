import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import { UserList } from '@/components/internal-chat/UserList';
import { ChatArea } from '@/components/internal-chat/ChatArea';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

const InternalChat = () => {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <AppLayout>
      <div className="absolute inset-0 flex bg-background -m-6">
        {/* Lista de usuarios - ocultar en móvil cuando hay usuario seleccionado */}
        {(!isMobileView || !selectedUser) && (
          <UserList
            currentUserId={user?.id || ''}
            selectedUser={selectedUser}
            onSelectUser={setSelectedUser}
            isMobile={isMobileView}
          />
        )}

        {/* Área de chat */}
        <ChatArea
          currentUserId={user?.id || ''}
          selectedUser={selectedUser}
          onBack={() => setSelectedUser(null)}
          isMobile={isMobileView}
        />
      </div>
    </AppLayout>
  );
};

export default InternalChat;
