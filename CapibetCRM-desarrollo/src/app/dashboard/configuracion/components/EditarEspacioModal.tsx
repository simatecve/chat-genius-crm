'use client';

import { useState, useEffect } from 'react';
import { Edit2, Lightbulb } from 'lucide-react';
import { espacioTrabajoServices, EspacioTrabajoResponse } from '@/services/espacioTrabajoServices';

interface EditarEspacioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEspacioUpdated: () => void;
  espacio: EspacioTrabajoResponse | null;
}

export default function EditarEspacioModal({ isOpen, onClose, onEspacioUpdated, espacio }: EditarEspacioModalProps) {
  const [formData, setFormData] = useState({
    nombre: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Llenar formulario cuando se abre el modal
  useEffect(() => {
    if (isOpen && espacio) {
      setFormData({
        nombre: espacio.nombre
      });
      setError('');
    }
  }, [isOpen, espacio]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!espacio) {
      setError('No se ha seleccionado un espacio para editar');
      return;
    }

    // Validaciones
    if (!formData.nombre.trim()) {
      setError('El nombre del espacio de trabajo es obligatorio');
      return;
    }

    if (formData.nombre.trim().length < 3) {
      setError('El nombre debe tener al menos 3 caracteres');
      return;
    }

    // Verificar si hay cambios
    if (formData.nombre.trim() === espacio.nombre) {
      setError('No se han realizado cambios');
      return;
    }

    setIsLoading(true);

    try {
      // Preparar datos para actualizar (solo el nombre)
      const updateData = {
        nombre: formData.nombre.trim()
      };

      console.log('Actualizando espacio de trabajo:', espacio.id, updateData);

      // Llamar al servicio de actualización
      const result = await espacioTrabajoServices.updateEspacioTrabajo(espacio.id, updateData);

      if (result.success) {
        console.log('Espacio de trabajo actualizado exitosamente');
        
        // Cerrar modal
        onClose();
        
        // Notificar al componente padre para recargar datos
        onEspacioUpdated();
      } else {
        setError(result.error || 'Error al actualizar el espacio de trabajo');
      }
    } catch (error) {
      console.error('Error updating espacio:', error);
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
          <h3 className="text-xl font-semibold text-white">Editar Espacio de Trabajo</h3>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-white text-2xl disabled:opacity-50 cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Info del espacio */}
        {espacio && (
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-blue-400 text-sm">
              <Edit2 className="w-4 h-4 inline mr-1" /> Editando: <span className="font-medium">#{espacio.id}</span>
            </p>
            <p className="text-blue-300 text-xs mt-1">
              Creado: {new Date(espacio.creado_en).toLocaleDateString('es-ES')}
            </p>
          </div>
        )}

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
              disabled={isLoading || !formData.nombre.trim() || (espacio ? formData.nombre.trim() === espacio.nombre : false)}
              className="px-4 py-2 bg-[#F29A1F] text-white rounded-lg hover:bg-[#F29A1F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 cursor-pointer"
            >
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{isLoading ? 'Actualizando...' : 'Actualizar'}</span>
            </button>
          </div>
        </form>

        {/* Info adicional */}
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-yellow-400 text-xs">
            <Lightbulb className="w-4 h-4 inline mr-1" /> Solo se puede editar el nombre del espacio de trabajo.
          </p>
        </div>
      </div>
    </div>
  );
}
