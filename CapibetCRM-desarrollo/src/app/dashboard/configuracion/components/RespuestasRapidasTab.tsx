'use client';
import { useState, useEffect } from 'react';
import { RefreshCw, Plus, MessageCircle, Edit2, Trash2 } from 'lucide-react';
import { respuestasRapidasServices, RespuestaRapida, RespuestaRapidaFormData } from '@/services/respuestasRapidasServices';

// Datos de prueba
const respuestasPrueba: RespuestaRapida[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    titulo: 'Bienvenida',
    contenido: '¡Hola! Bienvenido a CAPIBET Casino. ¿En qué puedo ayudarte hoy?',
    categoria: 'General',
    activa: true,
    created_at: '2024-12-28T10:00:00Z'
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    titulo: 'Problema de Pago',
    contenido: 'Entiendo que tienes un problema con el pago. Te ayudo a resolverlo paso a paso.',
    categoria: 'Soporte',
    activa: true,
    created_at: '2024-12-28T10:00:00Z'
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    titulo: 'Promociones',
    contenido: 'Tenemos excelentes promociones disponibles. Te envío el enlace con todos los detalles.',
    categoria: 'Marketing',
    activa: true,
    created_at: '2024-12-28T10:00:00Z'
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    titulo: 'Cierre de Sesión',
    contenido: 'Para cerrar sesión, haz clic en tu nombre en la esquina superior derecha y selecciona "Cerrar Sesión".',
    categoria: 'Cuenta',
    activa: false,
    created_at: '2024-12-28T10:00:00Z'
  }
];

const categoriasPredefinidas = [
  'General',
  'Soporte',
  'Marketing',
  'Cuenta',
  'Pagos',
  'Juegos',
  'Promociones',
  'Técnico'
];

export default function RespuestasRapidasTab() {
  const [respuestas, setRespuestas] = useState<RespuestaRapida[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [respuestaToDelete, setRespuestaToDelete] = useState<RespuestaRapida | null>(null);
  const [editingRespuesta, setEditingRespuesta] = useState<RespuestaRapida | null>(null);
  const [formData, setFormData] = useState<RespuestaRapidaFormData>({
    titulo: '',
    contenido: '',
    categoria: 'General'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showCategoriaInput, setShowCategoriaInput] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [error, setError] = useState<string | null>(null);

  const cargarRespuestas = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('RespuestasRapidasTab: Cargando respuestas desde Supabase...');
      
      const response = await respuestasRapidasServices.getAllRespuestasRapidas();
      
      if (response.success && response.data) {
        setRespuestas(response.data);
        console.log('Respuestas cargadas exitosamente:', response.data);
      } else {
        console.error('Error al cargar respuestas:', response.error);
        setError(response.error || 'Error al cargar las respuestas');
        // Fallback a datos de prueba si hay error
        setRespuestas(respuestasPrueba);
      }
    } catch (error) {
      console.error('Error inesperado al cargar respuestas:', error);
      setError('Error inesperado al cargar las respuestas');
      // Fallback a datos de prueba
      setRespuestas(respuestasPrueba);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarRespuestas();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo.trim() || !formData.contenido.trim() || !formData.categoria.trim()) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    try {
      if (editingRespuesta && editingRespuesta.id) {
        // Actualizar respuesta existente
        const response = await respuestasRapidasServices.updateRespuestaRapida(editingRespuesta.id, formData);
        
        if (response.success) {
          // Recargar las respuestas desde la base de datos
          await cargarRespuestas();
          console.log('Respuesta actualizada exitosamente');
        } else {
          console.error('Error al actualizar respuesta:', response.error);
          alert(`Error al actualizar la respuesta: ${response.error}`);
          return;
        }
      } else {
        // Crear nueva respuesta
        const response = await respuestasRapidasServices.createRespuestaRapida(formData);
        
        if (response.success) {
          // Recargar las respuestas desde la base de datos
          await cargarRespuestas();
          console.log('Nueva respuesta creada exitosamente');
        } else {
          console.error('Error al crear respuesta:', response.error);
          alert(`Error al crear la respuesta: ${response.error}`);
          return;
        }
      }

      cerrarModal();
    } catch (error) {
      console.error('Error al guardar respuesta:', error);
      alert('Error al guardar la respuesta');
    }
  };

  const abrirModalEliminar = (respuesta: RespuestaRapida) => {
    setRespuestaToDelete(respuesta);
    setShowDeleteModal(true);
  };

  const cerrarModalEliminar = () => {
    setShowDeleteModal(false);
    setRespuestaToDelete(null);
  };

  const confirmarEliminar = async () => {
    if (!respuestaToDelete?.id) {
      console.error('No se puede eliminar: ID no disponible');
      return;
    }

    try {
      const response = await respuestasRapidasServices.deleteRespuestaRapida(respuestaToDelete.id);
      
      if (response.success) {
        // Recargar las respuestas desde la base de datos
        await cargarRespuestas();
        console.log('Respuesta eliminada exitosamente');
        cerrarModalEliminar();
      } else {
        console.error('Error al eliminar respuesta:', response.error);
        alert(`Error al eliminar la respuesta: ${response.error}`);
      }
    } catch (error) {
      console.error('Error al eliminar respuesta:', error);
      alert('Error al eliminar la respuesta');
    }
  };

  const handleToggleStatus = async (respuesta: RespuestaRapida) => {
    if (!respuesta.id) {
      console.error('No se puede cambiar el estado: ID no disponible');
      return;
    }

    try {
      const response = await respuestasRapidasServices.toggleRespuestaRapidaStatus(respuesta.id, !respuesta.activa);
      
      if (response.success) {
        // Recargar las respuestas desde la base de datos
        await cargarRespuestas();
        console.log('Estado cambiado exitosamente para respuesta:', respuesta.id);
      } else {
        console.error('Error al cambiar estado:', response.error);
        alert(`Error al cambiar el estado: ${response.error}`);
      }
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      alert('Error al cambiar el estado');
    }
  };

  const abrirModal = (respuesta?: RespuestaRapida) => {
    if (respuesta) {
      setEditingRespuesta(respuesta);
      setFormData({
        titulo: respuesta.titulo,
        contenido: respuesta.contenido,
        categoria: respuesta.categoria
      });
    } else {
      setEditingRespuesta(null);
      setFormData({
        titulo: '',
        contenido: '',
        categoria: 'General'
      });
    }
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setEditingRespuesta(null);
    setFormData({
      titulo: '',
      contenido: '',
      categoria: 'General'
    });
    setShowCategoriaInput(false);
    setNuevaCategoria('');
  };

  const agregarCategoria = () => {
    if (nuevaCategoria.trim() && !categoriasPredefinidas.includes(nuevaCategoria.trim())) {
      categoriasPredefinidas.push(nuevaCategoria.trim());
      setFormData({ ...formData, categoria: nuevaCategoria.trim() });
      setNuevaCategoria('');
      setShowCategoriaInput(false);
    }
  };

  const respuestasFiltradas = respuestas.filter(respuesta =>
    respuesta.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    respuesta.contenido.toLowerCase().includes(searchTerm.toLowerCase()) ||
    respuesta.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Cargando respuestas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <MessageCircle className="w-8 h-8" />
          <div>
            <h2 className="text-white text-2xl font-semibold">Respuestas Rápidas</h2>
            <p className="text-gray-400 text-sm">Crear, editar y eliminar respuestas predefinidas.</p>
          </div>
        </div>
        <div className="flex space-x-3">
                     <button
             onClick={cargarRespuestas}
             className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
           >
             <span><RefreshCw className="w-5 h-5" /></span>
             <span>Actualizar</span>
           </button>
                     <button
             onClick={() => abrirModal()}
             className="flex items-center space-x-2 bg-[#F29A1F] hover:bg-[#F29A1F] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
           >
             <span><Plus className="w-5 h-5" /></span>
             <span>Nueva Respuesta</span>
           </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-gray-800 border border-rose-500 rounded-lg p-4 shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-rose-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-rose-300">
                Error al cargar datos
              </h3>
              <div className="mt-2 text-sm text-rose-200">
                <p>{error}</p>
                <p className="mt-1">Mostrando datos de prueba como respaldo.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Búsqueda */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar respuestas por título, contenido o categoría..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
        />
        <div className="absolute right-3 top-2.5 text-gray-400">
          🔍
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-sm">
          <div className="text-2xl font-bold text-indigo-400">{respuestas.length}</div>
          <div className="text-sm text-gray-300">Total</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-sm">
          <div className="text-2xl font-bold text-emerald-400">
            {respuestas.filter(r => r.activa).length}
          </div>
          <div className="text-sm text-gray-300">Activas</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-sm">
          <div className="text-2xl font-bold text-amber-400">
            {respuestas.filter(r => !r.activa).length}
          </div>
          <div className="text-sm text-gray-300">Inactivas</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-sm">
          <div className="text-2xl font-bold text-rose-400">
            {new Set(respuestas.map(r => r.categoria)).size}
          </div>
          <div className="text-sm text-gray-300">Categorías</div>
        </div>
      </div>

      {/* Lista de respuestas */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden shadow-sm">
        {respuestasFiltradas.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {searchTerm ? (
              <div>
                <div className="text-4xl mb-4">🔍</div>
                <p>No se encontraron respuestas para &quot;{searchTerm}&quot;</p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-indigo-400 hover:underline mt-2"
                >
                  Limpiar búsqueda
                </button>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-4"><MessageCircle className="w-5 h-5" /></div>
                <p>No hay respuestas rápidas configuradas</p>
                <button
                  onClick={() => abrirModal()}
                  className="text-indigo-400 hover:underline mt-2"
                >
                  Crear la primera respuesta
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {respuestasFiltradas.map((respuesta) => (
              <div key={respuesta.id} className="p-6 hover:bg-gray-700 transition-colors duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-white">
                        {respuesta.titulo}
                      </h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        respuesta.activa 
                          ? 'bg-emerald-900 text-emerald-200' 
                          : 'bg-amber-900 text-amber-200'
                      }`}>
                        {respuesta.activa ? 'Activa' : 'Inactiva'}
                      </span>
                      <span className="px-2 py-1 text-xs bg-indigo-900 text-indigo-200 rounded-full">
                        {respuesta.categoria}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mb-3 line-clamp-3">
                      {respuesta.contenido}
                    </p>
                    <div className="text-xs text-gray-500">
                      Creada: {new Date(respuesta.created_at || '').toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleToggleStatus(respuesta)}
                      className={`p-2 rounded-lg transition-colors duration-200 ${
                        respuesta.activa
                          ? 'text-emerald-400 hover:bg-emerald-900'
                          : 'text-amber-400 hover:bg-amber-900'
                      }`}
                      title={respuesta.activa ? 'Desactivar' : 'Activar'}
                    >
                      {respuesta.activa ? '✅' : '⭕'}
                    </button>
                    <button
                      onClick={() => abrirModal(respuesta)}
                      className="p-2 text-indigo-400 hover:bg-indigo-900 rounded-lg transition-colors duration-200"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => abrirModalEliminar(respuesta)}
                      className="p-2 text-rose-400 hover:bg-rose-900 rounded-lg transition-colors duration-200"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#1a1d23] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#3a3d45]">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-[#F29A1F] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm"><MessageCircle className="w-5 h-5" /></span>
                </div>
                <div>
                  <h2 className="text-white text-lg font-semibold">
                    {editingRespuesta ? 'Editar Respuesta' : 'Nueva Respuesta'}
                  </h2>
                  <p className="text-gray-400 text-sm">
                    Gestiona respuestas predefinidas para el soporte
                  </p>
                </div>
              </div>
              <button
                onClick={cerrarModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Título */}
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Título *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-[#2a2d35] border border-[#3a3d45] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-[#F29A1F] text-sm"
                      placeholder="Ej: Bienvenida, Problema de Pago..."
                      required
                    />
                  </div>
                </div>

                {/* Categoría */}
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Categoría *</label>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <select
                        value={formData.categoria}
                        onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-[#2a2d35] border border-[#3a3d45] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-[#F29A1F] text-sm"
                        required
                      >
                        {categoriasPredefinidas.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCategoriaInput(!showCategoriaInput)}
                      className="px-4 py-3 text-[#F29A1F] border border-[#F29A1F] rounded-lg hover:bg-[#F29A1F]/10 transition-colors"
                    >
                      +
                    </button>
                  </div>
                  
                  {showCategoriaInput && (
                    <div className="mt-3 flex space-x-2">
                      <input
                        type="text"
                        value={nuevaCategoria}
                        onChange={(e) => setNuevaCategoria(e.target.value)}
                        placeholder="Nueva categoría"
                        className="flex-1 px-4 py-3 bg-[#2a2d35] border border-[#3a3d45] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-[#F29A1F] text-sm"
                      />
                      <button
                        type="button"
                        onClick={agregarCategoria}
                        className="px-4 py-3 bg-[#F29A1F] text-white rounded-lg hover:bg-[#F29A1F] transition-colors"
                      >
                        Agregar
                      </button>
                    </div>
                  )}
                </div>

                {/* Contenido */}
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Contenido *</label>
                  <div className="relative">
                    <textarea
                      value={formData.contenido}
                      onChange={(e) => setFormData({ ...formData, contenido: e.target.value })}
                      rows={6}
                      className="w-full px-4 py-3 bg-[#2a2d35] border border-[#3a3d45] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-[#F29A1F] text-sm resize-none"
                      placeholder="Escribe la respuesta predefinida..."
                      required
                    />
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    Puedes usar variables como {'{nombre}'}, {'{email}'}, etc.
                  </div>
                </div>

                {/* Botones */}
                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={cerrarModal}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-[#F29A1F] hover:bg-[#F29A1F] text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    {editingRespuesta ? 'Actualizar' : 'Crear Respuesta'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteModal && respuestaToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#1a1d23] rounded-lg w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#3a3d45]">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-white text-lg font-semibold">Confirmar Eliminación</h2>
                  <p className="text-gray-400 text-sm">Eliminar respuesta rápida</p>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <div className="mb-6">
                <p className="text-gray-300 text-sm">
                  ¿Estás seguro de que quieres eliminar la respuesta rápida &quot;{respuestaToDelete.titulo}&quot;?
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Esta acción no se puede deshacer.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex justify-between">
                <button
                  onClick={cerrarModalEliminar}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEliminar}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
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
