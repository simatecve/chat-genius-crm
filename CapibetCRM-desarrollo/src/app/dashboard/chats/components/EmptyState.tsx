/**
 * Componente reutilizable para estados vacíos
 */

import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
}

export default function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center overflow-hidden">
      <div className="text-center">
        <div className="text-[var(--text-muted)] w-16 h-16 mb-4 mx-auto flex items-center justify-center">
          {icon}
        </div>
        <h3 className="text-[var(--text-primary)] text-lg font-medium mb-2">{title}</h3>
        <p className="text-[var(--text-muted)] text-sm">{subtitle}</p>
      </div>
    </div>
  );
}

