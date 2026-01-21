import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SessionInfo } from '@/services/reportsService';
import { Badge } from '@/components/ui/badge';

interface SessionSelectorProps {
  sessions: SessionInfo[];
  selectedSessionId: string | null;
  onSelect: (sessionId: string) => void;
  isLoading?: boolean;
}

export const SessionSelector: React.FC<SessionSelectorProps> = ({
  sessions,
  selectedSessionId,
  onSelect,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="h-10 w-full max-w-xs bg-muted animate-pulse rounded-md" />
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-muted-foreground text-sm py-2">
        No hay sesiones disponibles para este canal
      </div>
    );
  }

  return (
    <Select value={selectedSessionId || undefined} onValueChange={onSelect}>
      <SelectTrigger className="w-full max-w-md">
        <SelectValue placeholder="Seleccionar sesión..." />
      </SelectTrigger>
      <SelectContent>
        {sessions.map(session => (
          <SelectItem key={session.id} value={session.id}>
            <div className="flex items-center gap-2">
              <span className="font-medium">{session.name}</span>
              {session.phoneNumber && (
                <span className="text-muted-foreground text-sm">
                  ({session.phoneNumber})
                </span>
              )}
              <Badge 
                variant={session.status === 'active' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {session.status === 'active' ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
