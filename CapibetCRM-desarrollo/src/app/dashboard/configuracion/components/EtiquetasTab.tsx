'use client';

import { useState, useEffect } from 'react';
import { Tag, Search, Edit2, Trash2, X, AlertTriangle } from 'lucide-react';
import { etiquetasServices } from '@/services/etiquetasServices';
import { getUserData } from '@/utils/auth';

// Importar la interfaz del servicio
import type { EtiquetaResponse } from '@/app/api/etiquetas/domain/etiqueta';

interface EtiquetaFormData {
  nombre: string;
  color: string;
  descripcion: string;
}

// Datos de prueba
const etiquetasPrueba: EtiquetaResponse[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    nombre: 'Cliente VIP',
    color: '#F29A1F',
    descripcion: 'Clientes de alto valor',
    creado_por: '00000000-0000-0000-0000-000000000000',
    organizacion_id: '00000000-0000-0000-0000-000000000000',
    creado_en: '2024-12-28T10:00:00Z'
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    nombre: 'Urgente',
    color: '#d63031',
    descripcion: 'Tareas prioritarias',
    creado_por: '00000000-0000-0000-0000-000000000000',
    organizacion_id: '00000000-0000-0000-0000-000000000000',
    creado_en: '2024-12-28T10:00:00Z'
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    nombre: 'Nuevo',
    color: '#0984e3',
    descripcion: 'Elementos recientes',
    creado_por: '00000000-0000-0000-0000-000000000000',
    organizacion_id: '00000000-0000-0000-0000-000000000000',
    creado_en: '2024-12-28T10:00:00Z'
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    nombre: 'Oferta',
    color: '#fd79a8',
    descripcion: 'Promociones activas',
    creado_por: '00000000-0000-0000-0000-000000000000',
    organizacion_id: '00000000-0000-0000-0000-000000000000',
    creado_en: '2024-12-28T10:00:00Z'
  }
];

export default function EtiquetasTab() {
  const [etiquetas, setEtiquetas] = useState<EtiquetaResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingEtiqueta, setEditingEtiqueta] = useState<EtiquetaResponse | null>(null);
  const [etiquetaToDelete, setEtiquetaToDelete] = useState<EtiquetaResponse | null>(null);
  const [formData, setFormData] = useState<EtiquetaFormData>({
    nombre: '',
    color: '#F29A1F',
    descripcion: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Colores predefinidos para las etiquetas
  const coloresPredefinidos = [
    '#F29A1F', '#00cec9', '#0984e3', '#6c5ce7', '#fd79a8',
    '#fdcb6e', '#e17055', '#d63031', '#2d3436', '#636e72'
  ];

  // Función para recargar etiquetas desde la base de datos
  const recargarEtiquetas = async () => {
    try {
      const response = await etiquetasServices.getAllEtiquetas();
      
      if (response.success && response.data) {
        console.log('Etiquetas recargadas exitosamente:', response.data);
        setEtiquetas(response.data);
      } else {
        console.error('Error al recargar etiquetas:', response.error);
        // En caso de error, usar datos de prueba como fallback
        setEtiquetas(etiquetasPrueba);
      }
    } catch (error) {
      console.error('Error al recargar etiquetas:', error);
      // En caso de error, usar datos de prueba como fallback
      setEtiquetas(etiquetasPrueba);
    }
  };

  useEffect(() => {
    const cargarEtiquetasIniciales = async () => {
      console.log('EtiquetasTab: Componente montado, cargando etiquetas desde Supabase...');
      setLoading(true);
      
      await recargarEtiquetas();
      
      setLoading(false);
    };

    cargarEtiquetasIniciales();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre.trim()) {
      alert('El nombre de la etiqueta es obligatorio');
      return;
    }

    try {
      if (editingEtiqueta && editingEtiqueta.id) {
        // Actualizar etiqueta existente - NO enviar creado_por ni organizacion_id
        const response = await etiquetasServices.updateEtiqueta(editingEtiqueta.id, {
          nombre: formData.nombre,
          color: formData.color,
          descripcion: formData.descripcion
        });

        if (response.success && response.data) {
          cerrarModal();
          // Recargar todas las etiquetas desde la base de datos
          await recargarEtiquetas();
        } else {
          throw new Error(response.error || 'Error al actualizar etiqueta');
        }
      } else {
        // Crear nueva etiqueta - Incluir organizacion_id y creado_por
        const userData = getUserData();
        
        if (!userData?.id || !userData?.organizacion_id) {
          alert('No se pudo obtener la información del usuario. Por favor, recarga la página.');
          return;
        }

        const response = await etiquetasServices.createEtiqueta({
          nombre: formData.nombre,
          color: formData.color,
          descripcion: formData.descripcion,
          creado_por: userData.id,
          organizacion_id: userData.organizacion_id
        });

        if (response.success && response.data) {
          cerrarModal();
          // Recargar todas las etiquetas desde la base de datos
          await recargarEtiquetas();
        } else {
          throw new Error(response.error || 'Error al crear etiqueta');
        }
      }
    } catch (error) {
      console.error('Error al guardar etiqueta:', error);
      alert(`Error al guardar la etiqueta: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const handleDelete = (etiqueta: EtiquetaResponse) => {
    setEtiquetaToDelete(etiqueta);
    setShowDeleteModal(true);
  };

  const confirmarEliminacion = async () => {
    if (!etiquetaToDelete?.id) return;
    
    try {
      const response = await etiquetasServices.deleteEtiqueta(etiquetaToDelete.id);
      
      if (response.success) {
        setShowDeleteModal(false);
        setEtiquetaToDelete(null);
        // Recargar todas las etiquetas desde la base de datos
        await recargarEtiquetas();
      } else {
        throw new Error(response.error || 'Error al eliminar etiqueta');
      }
    } catch (error) {
      console.error('Error al eliminar etiqueta:', error);
      alert(`Error al eliminar la etiqueta: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const cancelarEliminacion = () => {
    setShowDeleteModal(false);
    setEtiquetaToDelete(null);
  };


  const abrirModal = (etiqueta?: EtiquetaResponse) => {
    if (etiqueta) {
      setEditingEtiqueta(etiqueta);
      setFormData({
        nombre: etiqueta.nombre,
        color: etiqueta.color,
        descripcion: etiqueta.descripcion || ''
      });
    } else {
      setEditingEtiqueta(null);
      setFormData({
        nombre: '',
        color: '#F29A1F',
        descripcion: ''
      });
    }
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setEditingEtiqueta(null);
    setFormData({
      nombre: '',
      color: '#F29A1F',
      descripcion: ''
    });
  };

  const etiquetasFiltradas = etiquetas.filter(etiqueta => {
    // Validar que la etiqueta tenga nombre antes de filtrar
    if (!etiqueta || !etiqueta.nombre) {
      console.warn('Etiqueta sin nombre encontrada:', etiqueta);
      return false;
    }
    
    const nombreMatch = etiqueta.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const descripcionMatch = etiqueta.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    
    return nombreMatch || descripcionMatch;
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F29A1F]"></div>
          <span className="ml-3 text-gray-400">Cargando etiquetas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <Tag className="w-8 h-8" />
          <div>
            <h2 className="text-white text-2xl font-semibold">Etiquetas</h2>
            <p className="text-gray-400 text-sm">Crear, editar y eliminar tus etiquetas personalizadas.</p>
          </div>
        </div>
        <button
          onClick={() => abrirModal()}
          className="bg-[#F29A1F] hover:bg-[#F29A1F] text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 cursor-pointer"
        >
          <Tag className="w-5 h-5" />
          <span>Nueva Etiqueta</span>
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar etiquetas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#2a2d35] border border-[#3a3d45] rounded-lg px-4 py-3 pl-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-transparent"
          />
          <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
        </div>
      </div>

      {/* Lista de etiquetas */}
      <div className="grid gap-4">
        {etiquetasFiltradas.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">
              {searchTerm ? 'No se encontraron etiquetas' : 'No hay etiquetas creadas'}
            </p>
            <p className="text-gray-500">
              {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Crea tu primera etiqueta para empezar'}
            </p>
          </div>
        ) : (
          etiquetasFiltradas.map((etiqueta) => (
            <div
              key={etiqueta.id}
              className="bg-[#2a2d35] border border-[#3a3d45] rounded-lg p-4 transition-all hover:border-[#F29A1F]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white"
                    style={{ backgroundColor: etiqueta.color }}
                  ></div>
                  <div>
                    <h4 className="text-white font-medium">
                      {etiqueta.nombre}
                    </h4>
                    {etiqueta.descripcion && (
                      <p className="text-gray-400 text-sm mt-1">{etiqueta.descripcion}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>Color: {etiqueta.color}</span>
                      {etiqueta.creado_en && (
                        <span>Creada: {new Date(etiqueta.creado_en).toLocaleDateString('es-ES')}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => abrirModal(etiqueta)}
                    className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors cursor-pointer p-2"
                    title="Editar etiqueta"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDelete(etiqueta)}
                    className="text-[var(--text-muted)] hover:text-red-500 transition-colors cursor-pointer p-2"
                    title="Eliminar etiqueta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal para crear/editar etiqueta */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#2a2d35] border border-[#3a3d45] rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white text-lg font-semibold">
                {editingEtiqueta ? 'Editar Etiqueta' : 'Nueva Etiqueta'}
              </h3>
              <button
                onClick={cerrarModal}
                className="text-gray-400 hover:text-white text-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Nombre de la etiqueta *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full bg-[#1a1d23] border border-[#3a3d45] rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-transparent"
                  placeholder="Ej: Cliente VIP, Urgente, etc."
                  required
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Color de la etiqueta
                </label>
                <div className="flex space-x-2 mb-2">
                  {coloresPredefinidos.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer ${
                        formData.color === color ? 'border-white scale-110' : 'border-gray-600'
                      }`}
                      style={{ backgroundColor: color }}
                    ></button>
                  ))}
                </div>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full h-10 bg-[#1a1d23] border border-[#3a3d45] rounded-lg cursor-pointer"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full bg-[#1a1d23] border border-[#3a3d45] rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-transparent"
                  placeholder="Describe el propósito de esta etiqueta..."
                  rows={3}
                />
              </div>

              {/* Botones */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#F29A1F] hover:bg-[#F29A1F] text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  {editingEtiqueta ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && etiquetaToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1a1d23] rounded-lg p-6 w-full max-w-md mx-4 border border-[#3a3d45]">
            <div className="text-center">
              {/* Icono de advertencia */}
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              
              {/* Título */}
              <h3 className="text-lg font-medium text-white mb-2">
                ¿Eliminar etiqueta?
              </h3>
              
              {/* Mensaje */}
              <p className="text-gray-400 mb-2">
                ¿Estás seguro de que quieres eliminar la etiqueta &quot;{etiquetaToDelete.nombre}&quot;?
              </p>
              <p className="text-gray-500 text-sm mb-6">
                Esta acción no se puede deshacer.
              </p>
              
              {/* Botones */}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={cancelarEliminacion}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarEliminacion}
                  className="flex-1 bg-[#d63031] hover:bg-[#c0392b] text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
