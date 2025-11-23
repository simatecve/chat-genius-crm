'use client';

import { useState } from 'react';
import { useToastNotifications } from '@/hooks/useToastNotifications';

interface ToastSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ToastSettings({ isOpen, onClose }: ToastSettingsProps) {
  const { settings, updateSettings, clearAllToasts } = useToastNotifications();
  const [tempSettings, setTempSettings] = useState(settings);

  if (!isOpen) return null;

  const handleSave = () => {
    updateSettings(tempSettings);
    onClose();
  };

  const handleTestSound = () => {
    try {
      const audio = new Audio('/52pj7t0b7w3-notification-sfx-10.mp3');
      audio.volume = 0.7;
      audio.play().catch(error => {
        console.warn('No se pudo reproducir el sonido de prueba:', error);
      });
    } catch (error) {
      console.warn('Error al reproducir sonido de prueba:', error);
    }
  };

  const handleReset = () => {
    const defaultSettings = {
      enabled: true,
      duration: 5000,
      maxToasts: 5,
      soundEnabled: true
    };
    setTempSettings(defaultSettings);
    updateSettings(defaultSettings);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)]">
          <h2 className="text-[var(--text-primary)] text-xl font-semibold">
            Configuración de Notificaciones
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Habilitar notificaciones */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[var(--text-primary)] font-medium">Habilitar notificaciones</h3>
              <p className="text-[var(--text-muted)] text-sm">Mostrar notificaciones en tiempo real</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={tempSettings.enabled}
                onChange={(e) => setTempSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--accent-primary)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
            </label>
          </div>

          {/* Duración */}
          <div>
            <label className="block text-[var(--text-primary)] font-medium mb-2">
              Duración de notificación (ms)
            </label>
            <input
              type="range"
              min="2000"
              max="10000"
              step="500"
              value={tempSettings.duration}
              onChange={(e) => setTempSettings(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-sm text-[var(--text-muted)] mt-1">
              <span>2s</span>
              <span className="font-medium text-[var(--text-primary)]">
                {tempSettings.duration / 1000}s
              </span>
              <span>10s</span>
            </div>
          </div>

          {/* Máximo de notificaciones */}
          <div>
            <label className="block text-[var(--text-primary)] font-medium mb-2">
              Máximo de notificaciones simultáneas
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={tempSettings.maxToasts}
              onChange={(e) => setTempSettings(prev => ({ ...prev, maxToasts: parseInt(e.target.value) }))}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-sm text-[var(--text-muted)] mt-1">
              <span>1</span>
              <span className="font-medium text-[var(--text-primary)]">
                {tempSettings.maxToasts}
              </span>
              <span>10</span>
            </div>
          </div>

          {/* Sonido */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[var(--text-primary)] font-medium">Sonido de notificación</h3>
              <p className="text-[var(--text-muted)] text-sm">Reproducir sonido al recibir notificación</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={tempSettings.soundEnabled}
                onChange={(e) => setTempSettings(prev => ({ ...prev, soundEnabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--accent-primary)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
            </label>
          </div>

          {/* Botón de prueba de sonido */}
          {tempSettings.soundEnabled && (
            <button
              onClick={handleTestSound}
              className="w-full bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] py-2 px-4 rounded-lg transition-colors border border-[var(--border-primary)]"
            >
              🔔 Probar sonido
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
          <button
            onClick={handleReset}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Restaurar valores por defecto
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 text-white rounded-lg transition-colors"
            >
              Guardar
            </button>
          </div>
        </div>

        <style jsx>{`
          .slider::-webkit-slider-thumb {
            appearance: none;
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: var(--accent-primary);
            cursor: pointer;
            border: 2px solid var(--bg-primary);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
          
          .slider::-moz-range-thumb {
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: var(--accent-primary);
            cursor: pointer;
            border: 2px solid var(--bg-primary);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
        `}</style>
      </div>
    </div>
  );
}
