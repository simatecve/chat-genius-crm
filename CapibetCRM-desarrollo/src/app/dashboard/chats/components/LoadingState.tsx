/**
 * Componente reutilizable para estados de carga
 */

interface LoadingStateProps {
  title?: string;
  subtitle?: string;
}

export default function LoadingState({ 
  title = 'Cargando...', 
  subtitle = 'Por favor espera un momento' 
}: LoadingStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center overflow-hidden">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)] mx-auto mb-4"></div>
        <h3 className="text-[var(--text-primary)] text-lg font-medium mb-2">
          {title}
        </h3>
        <p className="text-[var(--text-muted)] text-sm">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

