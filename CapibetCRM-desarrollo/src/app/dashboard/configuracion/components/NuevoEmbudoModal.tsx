'use client';

import { useState, useEffect } from 'react';
import { Settings, Lightbulb } from 'lucide-react';
import { embudoServices } from '@/services/embudoServices';
import { EmbudoData } from '@/app/api/embudos/domain/embudo';
import { getCurrentUserId } from '@/utils/auth';

interface NuevoEmbudoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmbudoCreated: () => void;
  espacioId: string;
  espacioNombre: string;
}

export default function NuevoEmbudoModal({ 
  isOpen, 
  onClose, 
  onEmbudoCreated, 
  espacioId, 
  espacioNombre 
}: NuevoEmbudoModalProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [color, setColor] = useState('#4a4d55');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const currentUserId = getCurrentUserId();
    if (currentUserId) {
      setUserId(currentUserId);
    } else {
      setError('No se encontró el ID del usuario logueado. Por favor, inicia sesión nuevamente.');
    }
  }, []);

  const resetForm = () => {
    setNombre('');
    setDescripcion('');
    setColor('#4a4d55');
    setError('');
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nombre.trim()) {
      setError('El nombre del embudo es obligatorio.');
      return;
    }
    if (nombre.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres.');
      return;
    }
    if (!userId) {
      setError('No se pudo obtener el ID del usuario. Por favor, recarga la página.');
      return;
    }

    setIsLoading(true);
    try {
      const newEmbudo: EmbudoData = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        creado_por: userId,
        espacio_id: espacioId,
        color: color,
      };

      console.log('Datos del embudo a crear:', newEmbudo);

      const result = await embudoServices.createEmbudo(newEmbudo);

      if (result.success) {
        console.log('Embudo creado exitosamente');
        onEmbudoCreated();
        onClose();
        resetForm();
      } else {
        setError(result.error || 'Error al crear el embudo.');
      }
    } catch (err) {
      console.error('Error creating embudo:', err);
      setError('Error de conexión al crear el embudo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#2a2d35] rounded-lg p-6 w-full max-w-md border border-[#3a3d45]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white text-xl font-semibold">Nuevo Embudo</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white text-2xl cursor-pointer"
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        {/* Info del espacio */}
        <div className="mb-4 p-3 bg-[#1a1d23] rounded-lg border border-[#3a3d45]">
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4 text-[#F29A1F]" />
            <span className="text-gray-300 text-sm font-medium">
              Se creará en: <span className="text-white">{espacioNombre}</span>
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-300 mb-2">
              Nombre del Embudo *
            </label>
            <input
              type="text"
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3 py-2 bg-[#1a1d23] border border-[#3a3d45] rounded-lg text-white focus:ring-2 focus:ring-[#F29A1F] focus:border-transparent"
              placeholder="Ej: Prospectos, Clientes, Ventas..."
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="descripcion" className="block text-sm font-medium text-gray-300 mb-2">
              Descripción
            </label>
            <textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3 py-2 bg-[#1a1d23] border border-[#3a3d45] rounded-lg text-white focus:ring-2 focus:ring-[#F29A1F] focus:border-transparent resize-none"
              placeholder="Descripción opcional del embudo..."
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="color" className="block text-sm font-medium text-gray-300 mb-2">
              Color del Borde
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                id="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-16 h-10 bg-[#1a1d23] border border-[#3a3d45] rounded-lg cursor-pointer"
                disabled={isLoading}
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#1a1d23] border border-[#3a3d45] rounded-lg text-white focus:ring-2 focus:ring-[#F29A1F] focus:border-transparent"
                placeholder="#4a4d55"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 bg-gray-600 rounded-lg hover:bg-gray-500 transition-colors cursor-pointer"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#F29A1F] text-white rounded-lg hover:bg-[#F29A1F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 cursor-pointer"
              disabled={isLoading}
            >
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{isLoading ? 'Creando...' : 'Crear Embudo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
