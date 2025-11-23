'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Edit2, Trash2 } from 'lucide-react';
import { EmbudoResponse } from '@/app/api/embudos/domain/embudo';

interface DraggableEmbudoProps {
  embudo: EmbudoResponse;
  onEdit: (embudo: EmbudoResponse) => void;
  onDelete: (embudo: EmbudoResponse) => void;
  formatDate: (dateString: string) => string;
}

export default function DraggableEmbudo({ embudo, onEdit, onDelete, formatDate }: DraggableEmbudoProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: embudo.id });

  const borderColor = embudo.color || '#4a4d55';

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : 'auto',
    borderColor: isDragging ? 'var(--accent-primary)' : borderColor,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-[var(--bg-secondary)] border-2 rounded-lg p-4 transition-colors group cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50 shadow-2xl rotate-2 scale-105' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {/* Indicador de drag */}
          <div className="flex flex-col space-y-1 text-[var(--text-muted)] mr-2">
            <div className="w-1 h-1 bg-current rounded-full"></div>
            <div className="w-1 h-1 bg-current rounded-full"></div>
            <div className="w-1 h-1 bg-current rounded-full"></div>
            <div className="w-1 h-1 bg-current rounded-full"></div>
            <div className="w-1 h-1 bg-current rounded-full"></div>
            <div className="w-1 h-1 bg-current rounded-full"></div>
          </div>
          <span className="text-[var(--text-muted)] text-sm font-medium">
            {embudo.orden || 0}
          </span>
          <span className="text-[var(--text-primary)] text-sm font-medium">
            {embudo.nombre.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(embudo);
            }}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs p-1 cursor-pointer" 
            title="Editar embudo"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(embudo);
            }}
            className="text-[var(--text-muted)] hover:text-red-400 text-xs p-1 cursor-pointer" 
            title="Eliminar embudo"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      {embudo.descripcion && (
        <p className="text-[var(--text-muted)] text-xs mb-2">{embudo.descripcion}</p>
      )}
    </div>
  );
}
