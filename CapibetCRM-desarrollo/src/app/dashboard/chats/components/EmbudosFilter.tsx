'use client';

import { EmbudoResponse } from '@/app/api/embudos/domain/embudo';
import { SesionResponse } from '@/app/api/sesiones/domain/sesion';

interface EmbudosFilterProps {
  embudos: EmbudoResponse[];
  selectedEmbudo: EmbudoResponse | null;
  sesiones: SesionResponse[];
  onEmbudoSelect: (embudo: EmbudoResponse | null) => void;
}

/**
 * Componente para filtrar chats por embudo
 * Muestra una lista horizontal de embudos con contadores de sesiones
 */
export default function EmbudosFilter({ 
  embudos, 
  selectedEmbudo, 
  sesiones,
  onEmbudoSelect 
}: EmbudosFilterProps) {
  
  return (
    <div className="border-b border-[var(--border-primary)] bg-[var(--bg-primary)]">
      <div className="px-4 py-3">
        <div 
          className="flex items-center space-x-2 overflow-x-auto pb-1" 
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none',
            WebkitScrollbar: { display: 'none' }
          }}
        >
          {/* Opción "Todos" */}
          <button
            onClick={() => onEmbudoSelect(null)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap shadow-sm ${
              selectedEmbudo === null
                ? 'bg-[var(--accent-primary)] text-white shadow-md scale-105'
                : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--accent-primary)] hover:bg-opacity-20 border border-[var(--border-primary)] hover:scale-105'
            }`}
          >
            <span className="flex items-center space-x-2">
              <span>Todos</span>
            </span>
          </button>

          {/* Lista de embudos */}
          {embudos.map((embudo) => {
            const isSelected = selectedEmbudo?.id === embudo.id;

            return (
              <button
                key={embudo.id}
                onClick={() => onEmbudoSelect(embudo)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap shadow-sm ${
                  isSelected
                    ? 'bg-[var(--accent-primary)] text-white shadow-md scale-105'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--accent-primary)] hover:bg-opacity-20 border border-[var(--border-primary)] hover:scale-105'
                }`}
                title={embudo.descripcion || embudo.nombre}
              >
                <span className="flex items-center space-x-2">
                  <span>{embudo.nombre}</span>
                </span>
              </button>
            );
          })}

          {/* Mensaje cuando no hay embudos */}
          {embudos.length === 0 && (
            <div className="text-[var(--text-muted)] text-sm py-2">
              No hay embudos configurados en este espacio de trabajo
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
