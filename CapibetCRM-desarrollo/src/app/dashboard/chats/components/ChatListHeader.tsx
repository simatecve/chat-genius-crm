/**
 * Header de la lista de chats con selector de espacio de trabajo
 */

import { EspacioTrabajoResponse } from '@/app/api/espacio_trabajos/domain/espacio_trabajo';

interface ChatListHeaderProps {
  espaciosTrabajo: EspacioTrabajoResponse[];
  selectedEspacio: EspacioTrabajoResponse | null;
  onEspacioChange: (espacio: EspacioTrabajoResponse | null) => void;
  chatCount: number;
}

export default function ChatListHeader({ 
  espaciosTrabajo, 
  selectedEspacio, 
  onEspacioChange,
  chatCount 
}: ChatListHeaderProps) {
  return (
    <div className="bg-[var(--bg-primary)] border-b border-[var(--border-primary)] px-6 py-4 flex-shrink-0">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-[var(--text-primary)] font-semibold text-2xl">Chats</h1>
        </div>

        {/* Center Section - Selector de Espacio */}
        <div className="flex items-center space-x-4">
          {espaciosTrabajo.length > 0 && (
            <div className="relative">
              <select
                value={selectedEspacio?.id || ''}
                onChange={(e) => {
                  const espacioId = e.target.value;
                  const espacio = espaciosTrabajo.find(e => e.id === espacioId);
                  onEspacioChange(espacio || null);
                }}
                className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg px-4 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] appearance-none cursor-pointer min-w-[200px]"
              >
                <option value="">Seleccionar espacio...</option>
                {espaciosTrabajo.map(espacio => (
                  <option key={espacio.id} value={espacio.id}>
                    {espacio.nombre}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}
          {selectedEspacio && (
            <div className="text-[var(--text-muted)] text-sm">
              {chatCount} conversación{chatCount !== 1 ? 'es' : ''}
            </div>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

