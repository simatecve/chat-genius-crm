'use client';

import { useState } from 'react';
import { useToastNotifications } from '@/hooks/useToastNotifications';
import ToastSettings from '@/components/ToastSettings';

export default function NotificationSettings() {
  const [showSettings, setShowSettings] = useState(false);
  const { settings, clearAllToasts } = useToastNotifications();

  return (
    <>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[var(--text-primary)] font-semibold">
            Notificaciones en Tiempo Real
          </h3>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${settings.enabled ? 'bg-green-500' : 'bg-gray-500'}`}></div>
            <span className="text-sm text-[var(--text-muted)]">
              {settings.enabled ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Duración:</span>
            <span className="text-[var(--text-primary)]">{settings.duration / 1000}s</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Máximo simultáneas:</span>
            <span className="text-[var(--text-primary)]">{settings.maxToasts}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Sonido:</span>
            <span className="text-[var(--text-primary)]">
              {settings.soundEnabled ? '✅' : '❌'}
            </span>
          </div>
        </div>

        <div className="flex space-x-2 mt-4">
          <button
            onClick={() => setShowSettings(true)}
            className="flex-1 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
          >
            ⚙️ Configurar
          </button>
          
          <button
            onClick={clearAllToasts}
            className="bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] text-[var(--text-primary)] py-2 px-3 rounded-lg text-sm font-medium transition-colors border border-[var(--border-primary)]"
            title="Limpiar todas las notificaciones"
          >
            🗑️ Limpiar
          </button>
        </div>

        {!settings.enabled && (
          <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-yellow-400 text-xs">
              ⚠️ Las notificaciones están deshabilitadas. Actívalas para recibir notificaciones en tiempo real.
            </p>
          </div>
        )}
      </div>

      <ToastSettings 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </>
  );
}
