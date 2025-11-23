'use client';

import { MessageSquareOff } from 'lucide-react';

const ChatInternoPage = () => {
  return (
    <div className="flex h-full bg-[var(--bg-primary)] text-[var(--text-primary)] items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="mb-6 flex justify-center">
          <div className="w-24 h-24 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center">
            <MessageSquareOff size={48} className="text-[var(--text-muted)]" />
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-3">Chat Interno No Disponible</h2>
        <p className="text-[var(--text-muted)] mb-6">
          La funcionalidad de chat interno ha sido deshabilitada temporalmente. 
          Por favor, contactá con el administrador del sistema para más información.
        </p>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
          <p className="text-sm text-[var(--text-secondary)]">
            💡 <strong>Nota:</strong> Esta funcionalidad está en mantenimiento. 
            Utilizá otros canales de comunicación mientras tanto.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatInternoPage;