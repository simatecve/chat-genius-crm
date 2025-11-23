'use client';

import NotificationSettings from '../../components/NotificationSettings';

export default function NotificacionesTab() {
  return (
    <div className="space-y-6">
      <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg p-6">
        <h2 className="text-[var(--text-primary)] text-xl font-semibold mb-4">
          Configuración de Notificaciones
        </h2>
        <p className="text-[var(--text-secondary)] mb-6">
          Personaliza cómo recibes las notificaciones en tiempo real del sistema.
        </p>
        
        <NotificationSettings />
      </div>

      <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg p-6">
        <h3 className="text-[var(--text-primary)] text-lg font-semibold mb-4">
          Tipos de Notificaciones
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3 p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
            <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h4 className="text-[var(--text-primary)] font-medium">Éxito</h4>
              <p className="text-[var(--text-muted)] text-sm">Operaciones completadas exitosamente</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-[var(--text-primary)] font-medium">Información</h4>
              <p className="text-[var(--text-muted)] text-sm">Mensajes informativos y actualizaciones</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
            <div className="flex-shrink-0 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h4 className="text-[var(--text-primary)] font-medium">Advertencia</h4>
              <p className="text-[var(--text-muted)] text-sm">Situaciones que requieren atención</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
            <div className="flex-shrink-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <h4 className="text-[var(--text-primary)] font-medium">Error</h4>
              <p className="text-[var(--text-muted)] text-sm">Errores y problemas del sistema</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg p-6">
        <h3 className="text-[var(--text-primary)] text-lg font-semibold mb-4">
          Fuentes de Notificaciones
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">W</span>
              </div>
              <div>
                <h4 className="text-[var(--text-primary)] font-medium">WhatsApp</h4>
                <p className="text-[var(--text-muted)] text-sm">Nuevos mensajes y sesiones</p>
              </div>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>

          <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">C</span>
              </div>
              <div>
                <h4 className="text-[var(--text-primary)] font-medium">Chat Interno</h4>
                <p className="text-[var(--text-muted)] text-sm">Mensajes entre usuarios</p>
              </div>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>

          <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">S</span>
              </div>
              <div>
                <h4 className="text-[var(--text-primary)] font-medium">Sistema</h4>
                <p className="text-[var(--text-muted)] text-sm">Actualizaciones y mantenimiento</p>
              </div>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
