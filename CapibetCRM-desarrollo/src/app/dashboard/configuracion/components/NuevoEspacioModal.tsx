'use client';

import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { espacioTrabajoServices, EspacioTrabajoData } from '@/services/espacioTrabajoServices';
import { getCurrentUserId, getUserData } from '@/utils/auth';

interface NuevoEspacioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEspacioCreated: () => void;
}

export default function NuevoEspacioModal({ isOpen, onClose, onEspacioCreated }: NuevoEspacioModalProps) {
  const [formData, setFormData] = useState({
    nombre: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!formData.nombre.trim()) {
      setError('El nombre del espacio de trabajo es obligatorio');
      return;
    }

    if (formData.nombre.trim().length < 3) {
      setError('El nombre debe tener al menos 3 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      // Obtener datos del usuario logueado
      const userData = getUserData();

      // Intentar obtener ID de organización de userData o de organizationData (fallback)
      let orgId = userData?.organizacion_id;

      if (!orgId) {
        const orgDataString = localStorage.getItem('organizationData');
        if (orgDataString) {
          try {
            const orgData = JSON.parse(orgDataString);
            orgId = orgData.id;
          } catch (e) {
            console.error('Error parsing organizationData:', e);
          }
        }
      }

      if (!userData || !orgId) {
        setError('No se pudo obtener la información del usuario o organización. Inicia sesión nuevamente.');
        setIsLoading(false);
        return;
      }

      // Preparar datos para enviar
      const espacioData: EspacioTrabajoData = {
        nombre: formData.nombre.trim(),
        creado_por: userData.id,
        organizacion_id: orgId
      };

      console.log('Creando espacio de trabajo:', espacioData);

      // Llamar al servicio
      const result = await espacioTrabajoServices.createEspacioTrabajo(espacioData);

      if (result.success) {
        console.log('Espacio de trabajo creado exitosamente');

        // Limpiar formulario
        setFormData({ nombre: '' });

        // Cerrar modal
        onClose();

        // Notificar al componente padre para recargar datos
        onEspacioCreated();
      } else {
        setError(result.error || 'Error al crear el espacio de trabajo');
      }
    } catch (error) {
      console.error('Error creating espacio:', error);
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({ nombre: '' });
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#2a2d35] rounded-lg p-6 w-full max-w-md border border-[#3a3d45]">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-white">Nuevo Espacio de Trabajo</h3>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-white text-2xl disabled:opacity-50 cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nombre del Espacio *
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-3 py-2 bg-[#1a1d23] border border-[#3a3d45] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#F29A1F] focus:border-transparent"
              placeholder="Ej: Ventas, Marketing, Soporte..."
              disabled={isLoading}
              required
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-400 bg-transparent border border-[#3a3d45] rounded-lg hover:bg-[#3a3d45] transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.nombre.trim()}
              className="px-4 py-2 bg-[#F29A1F] text-white rounded-lg hover:bg-[#F29A1F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 cursor-pointer"
            >
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{isLoading ? 'Creando...' : 'Crear Espacio'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
