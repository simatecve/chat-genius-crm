'use client';

import { useState, useEffect } from 'react';
import { Smartphone, Mail, Camera, MessageCircle, Send, Bot, Link, Trash2, X } from 'lucide-react';
import { sesionesServices } from '@/services/sesionesServices';
import { SesionResponse } from '@/app/api/sesiones/domain/sesion';
// Tipos locales para canales (sin dependencias externas)
type CanalTipo = 'whatsapp' | 'whatsappApi' | 'email' | 'instagram' | 'messenger' | 'telegram' | 'telegramBot' | 'webChat';

interface Canal {
  id: number;
  tipo: CanalTipo;
  descripcion: string;
  usuario_id: number;
  espacio_id: number;
  creado_en?: string;
}
import { embudoServices } from '@/services/embudoServices';
import { userServices } from '@/services/userServices';
import { contactoServices } from '@/services/contactoServices';
import CanalSelector from './CanalSelector';
import SesionesList from './SesionesList';
import ConfirmDeleteCanalModal from './ConfirmDeleteCanalModal';
import VincularSesionModal from './VincularSesionModal';

interface CanalOption {
  id: Canal['tipo'];
  nombre: string;
  icon: React.ReactNode;
  color: string;
  tipo: Canal['tipo'];
}

const canalOptions: CanalOption[] = [
  { id: 'whatsapp', nombre: 'WhatsApp', icon: <Smartphone className="w-4 h-4" />, color: '#25D366', tipo: 'whatsapp' },

  { id: 'whatsappApi', nombre: 'WhatsApp API', icon: <Smartphone className="w-4 h-4" />, color: '#25D366', tipo: 'whatsappApi' },
  { id: 'email', nombre: 'Email', icon: <Mail className="w-4 h-4" />, color: '#EA4335', tipo: 'email' },
  { id: 'instagram', nombre: 'Instagram', icon: <Camera className="w-4 h-4" />, color: '#E4405F', tipo: 'instagram' },
  { id: 'messenger', nombre: 'Messenger', icon: <MessageCircle className="w-4 h-4" />, color: '#0084FF', tipo: 'messenger' },
  { id: 'telegram', nombre: 'Telegram', icon: <Send className="w-4 h-4" />, color: '#0088CC', tipo: 'telegram' },
  { id: 'telegramBot', nombre: 'Telegram Bot', icon: <Bot className="w-4 h-4" />, color: '#0088CC', tipo: 'telegramBot' },
  { id: 'webChat', nombre: 'Web Chat', icon: <MessageCircle className="w-4 h-4" />, color: '#F29A1F', tipo: 'webChat' },
];

export default function SesionesTab() {
  const [canales, setCanales] = useState<Canal[]>([]);
  const [sesiones, setSesiones] = useState<SesionResponse[]>([]);
  const [showAddCanal, setShowAddCanal] = useState(false);
  const [showAddSesion, setShowAddSesion] = useState(false);
  const [showVincularSesion, setShowVincularSesion] = useState(false);
  const [selectedCanalForSesion, setSelectedCanalForSesion] = useState<Canal | null>(null);
  const [tipoSesionSeleccionado, setTipoSesionSeleccionado] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tipo: '' as Canal['tipo'] | '',
    descripcion: '',
    usuario_id: '',
    espacio_id: '',
    nombre: '',
    embudo_id: '',
  });
  const [sesionFormData, setSesionFormData] = useState({
    nombre: '',
    usuario_id: '',
    embudo_id: '',
    type: '' as 'whatsapp_qr' | 'whatsapp_api' | 'messenger' | 'instagram' | 'telegram' | 'telegram_bot' | 'gmail' | 'outlook' | '',
    description: '',
    email: '',
    given_name: '',
    picture: '',
    whatsapp_session: '',
    estado: 'activo' as 'activo' | 'desconectado' | 'expirado',
  });
  const [usuarios, setUsuarios] = useState<{id: string, nombre: string}[]>([]);
  const [embudos, setEmbudos] = useState<{id: number, nombre: string}[]>([]);
  const [contactos, setContactos] = useState<{id: number, nombre: string, apellido?: string, nombre_completo?: string}[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [canalToDelete, setCanalToDelete] = useState<Canal | null>(null);
  const [canalSesiones, setCanalSesiones] = useState<Record<string, SesionResponse[]>>({});

  useEffect(() => {
    loadCanales();
    loadSesiones();
    loadUsuarios();
    loadEmbudos();
    loadContactos();
  }, []);

  const loadCanales = async () => {
    setLoading(true);
    try {
      // Canales eliminados - mantener lista vacía
      setCanales([]);
    } catch (error) {
      console.error('Error loading canales:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSesiones = async () => {
    try {
      const result = await sesionesServices.getAllSesiones();
      if (result.success) {
        setSesiones(result.data || []);
        
        // Agrupar sesiones por tipo
        const sesionesGrouped: Record<string, SesionResponse[]> = {};
        (result.data || []).forEach((sesion: SesionResponse) => {
          if (sesion.type) {
            if (!sesionesGrouped[sesion.type]) {
              sesionesGrouped[sesion.type] = [];
            }
            sesionesGrouped[sesion.type].push(sesion);
          }
        });
        
        setCanalSesiones(sesionesGrouped);
        
        if (result.error) {
          console.warn('Sesiones:', result.error);
        }
      } else {
        console.error('Error loading sesiones:', result.error);
        setSesiones([]); // Fallback a lista vacía
        setCanalSesiones({}); // Limpiar sesiones agrupadas
      }
    } catch (error) {
      console.error('Error loading sesiones:', error);
      setSesiones([]); // Fallback a lista vacía
      setCanalSesiones({}); // Limpiar sesiones agrupadas
    }
  };

  const loadUsuarios = async () => {
    try {
      const result = await userServices.getAllUsuarios();
      if (result.success && result.data) {
        setUsuarios(result.data);
      }
    } catch (error) {
      console.error('Error loading usuarios:', error);
    }
  };

  const loadEmbudos = async () => {
    try {
      const result = await embudoServices.getAllEmbudos();
      if (result.success && result.data) {
        setEmbudos(result.data);
      }
    } catch (error) {
      console.error('Error loading embudos:', error);
    }
  };

  const loadContactos = async () => {
    try {
      const result = await contactoServices.getAllContactos();
      if (result.success && result.data) {
        setContactos(result.data);
      }
    } catch (error) {
      console.error('Error loading contactos:', error);
    }
  };

  const handleCreateCanal = async () => {
    alert('Funcionalidad de canales deshabilitada');
  };

  const handleToggleSesionStatus = async (sesionId: string, estado: 'activo' | 'desconectado' | 'expirado') => {
    setLoading(true);
    try {
      const result = await sesionesServices.updateSesion(sesionId, { estado });
      if (result.success) {
        loadSesiones();
      } else {
        console.error('Error updating sesion status:', result.error);
        alert(`Error al actualizar estado de sesión: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating sesion status:', error);
      alert('Error de conexión al actualizar estado de sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSesion = async (sesionId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta sesión?')) return;
    
    setLoading(true);
    try {
      const result = await sesionesServices.deleteSesion(sesionId);
      if (result.success) {
        loadSesiones();
      } else {
        console.error('Error deleting sesion:', result.error);
        alert(`Error al eliminar sesión: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting sesion:', error);
      alert('Error de conexión al eliminar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCanal = (canal: Canal) => {
    setCanalToDelete(canal);
    setShowDeleteModal(true);
  };

  const confirmDeleteCanal = async () => {
    alert('Funcionalidad de canales deshabilitada');
  };

  const cancelDeleteCanal = () => {
    setShowDeleteModal(false);
    setCanalToDelete(null);
  };

  const getCanalIcon = (tipo: Canal['tipo']) => {
    const option = canalOptions.find(opt => opt.tipo === tipo);
    return option?.icon || <Smartphone className="w-4 h-4" />;
  };

  const getCanalColor = (tipo: Canal['tipo']) => {
    const option = canalOptions.find(opt => opt.tipo === tipo);
    return option?.color || '#F29A1F';
  };

  const handleAddSesionToCanal = (canal: Canal) => {
    setSelectedCanalForSesion(canal);
    setSesionFormData({
      nombre: '',
      usuario_id: '',
      embudo_id: '',
      type: '',
      description: '',
      email: '',
      given_name: '',
      picture: '',
      whatsapp_session: '',
      estado: 'activo',
    });
    setShowAddSesion(true);
  };

  const handleCreateSesion = async () => {
    if (!selectedCanalForSesion) return;

    // Validar campos requeridos
    if (!sesionFormData.nombre.trim()) {
      alert('El nombre de la sesión es requerido');
      return;
    }

    if (!sesionFormData.usuario_id) {
      alert('Debe seleccionar un usuario');
      return;
    }

    if (!sesionFormData.embudo_id) {
      alert('Debe seleccionar un embudo');
      return;
    }

    if (!sesionFormData.type) {
      alert('Debe seleccionar un tipo de sesión');
      return;
    }

    setLoading(true);
    try {
      const sesionData = {
        usuario_id: sesionFormData.usuario_id,
        nombre: sesionFormData.nombre,
        type: sesionFormData.type,
        embudo_id: sesionFormData.embudo_id,
        description: sesionFormData.description || undefined,
        email: sesionFormData.email || undefined,
        given_name: sesionFormData.given_name || undefined,
        picture: sesionFormData.picture || undefined,
        whatsapp_session: sesionFormData.whatsapp_session || undefined,
        estado: sesionFormData.estado,
      };

      const result = await sesionesServices.createSesion(sesionData);
      
      if (result.success) {
        setShowAddSesion(false);
        setSelectedCanalForSesion(null);
        setSesionFormData({
          nombre: '',
          usuario_id: '',
          embudo_id: '',
          type: '',
          description: '',
          email: '',
          given_name: '',
          picture: '',
          whatsapp_session: '',
          estado: 'activo',
        });
        // Recargar todas las sesiones
        loadSesiones();
      } else {
        console.error('Error creating sesion:', result.error);
        alert(`Error al crear sesión: ${result.error}\n\nDetalles: ${result.details || 'Sin detalles adicionales'}`);
      }
    } catch (error) {
      console.error('Error creating sesion:', error);
      alert('Error de conexión al crear sesión');
    } finally {
      setLoading(false);
    }
  };

  // Mapeo de tipos de canal a tipos de sesión válidos
  const mapearTipoCanalASesion = (tipoCanal: string): string => {
    const mapeo: Record<string, string> = {
      'whatsapp': 'whatsapp_qr',
      'whatsappApi': 'whatsapp_api',
      'email': 'gmail', // Por defecto Gmail, el usuario puede cambiar a Outlook si es necesario
      'instagram': 'instagram',
      'messenger': 'messenger',
      'telegram': 'telegram',
      'telegramBot': 'telegram_bot',
      'webChat': 'messenger', // WebChat se mapea a messenger por similitud
    };
    
    return mapeo[tipoCanal] || 'whatsapp_qr'; // Fallback por defecto
  };

  const handleVincularSesion = (tipo: string) => {
    const tipoSesion = mapearTipoCanalASesion(tipo);
    setTipoSesionSeleccionado(tipoSesion);
    setShowVincularSesion(true);
  };

  const handleConfirmarVinculacion = (data: {
    nombre: string;
    descripcion: string;
    embudo_id: number;
    type: string;
    sesionId?: number;
  }) => {
    console.log('Vinculación completada para sesión:', {
      nombre: data.nombre,
      descripcion: data.descripcion,
      embudo_id: data.embudo_id,
      type: data.type,
      sesionId: data.sesionId
    });
    
    // Para WhatsApp QR, solo cerrar cuando se ha completado la conexión (sesionId presente)
    // Para otros tipos, cerrar inmediatamente
    if (data.type === 'whatsapp_qr') {
      if (data.sesionId) {
        // Conexión exitosa de WhatsApp, cerrar modal y actualizar lista
        console.log('✅ Conexión WhatsApp exitosa, cerrando modal');
        setShowVincularSesion(false);
        setTipoSesionSeleccionado('');
        // Actualizar la lista de sesiones
        loadSesiones();
      } else {
        // WhatsApp QR iniciado pero aún no conectado, mantener modal abierto
        console.log('🔄 WhatsApp QR iniciado, manteniendo modal abierto para escaneo');
      }
    } else {
      // Para otros tipos de sesión, cerrar inmediatamente y actualizar lista
      setShowVincularSesion(false);
      setTipoSesionSeleccionado('');
      loadSesiones();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header de Sesiones */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link className="w-8 h-8" />
          <div>
            <h2 className="text-white text-2xl font-semibold">Sesiones</h2>
            <p className="text-gray-400 text-sm">Crear, editar y eliminar tus sesiones vinculadas.</p>
          </div>
        </div>
      </div>

      {/* Sección de Canales */}
      <div className="bg-[#2a2d35] rounded-lg p-6">

        {/* Grid de opciones de canales */}
        <div>
          <CanalSelector 
            onSelectCanal={handleVincularSesion}
            showDescriptions={true}
          />
        </div>

        {/* Lista de canales existentes */}
        {canales.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-white font-medium">Canales configurados:</h4>
            {canales.map((canal) => (
              <div
                key={canal.id}
                className="flex items-center justify-between bg-[#1a1d23] rounded-lg p-3 hover:bg-[#2a2d35] transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="text-xl"
                    style={{ color: getCanalColor(canal.tipo) }}
                  >
                    {getCanalIcon(canal.tipo)}
                  </div>
                  <div>
                    <div className="text-white font-medium">{canal.descripcion}</div>
                    <div className="text-gray-400 text-sm">
                      {canal.tipo} • ID: {canal.id}
                      {canal.creado_en && (
                        <span className="ml-2">
                          • {new Date(canal.creado_en).toLocaleDateString('es-ES')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    Configurado
                  </span>
                  <button
                    onClick={() => handleAddSesionToCanal(canal)}
                    className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                    title="Agregar sesión"
                    disabled={loading}
                  >
                    + Sesión
                  </button>
                  <button
                    onClick={() => handleDeleteCanal(canal)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900 hover:bg-opacity-20 rounded-lg transition-colors"
                    title="Eliminar canal"
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Sesiones del canal */}
                {canal.id && canalSesiones[canal.tipo] && canalSesiones[canal.tipo].length > 0 && (
                  <div className="mt-4 pl-4 border-l-2 border-gray-600">
                    <h4 className="text-white text-sm font-medium mb-2">
                      Sesiones asociadas ({canalSesiones[canal.tipo].length})
                    </h4>
                    <div className="space-y-2">
                      {canalSesiones[canal.tipo].map((sesion) => (
                        <div
                          key={sesion.id}
                          className="bg-[#1a1d23] rounded-lg p-3 flex items-center justify-between"
                        >
                          <div>
                            <div className="text-white text-sm font-medium">
                              {sesion.nombre}
                            </div>
                            <div className="text-gray-400 text-xs">
                              Estado: {sesion.estado} • ID: {sesion.id}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              sesion.estado === 'activo' 
                                ? 'bg-green-100 text-green-800' 
                                : sesion.estado === 'desconectado'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {sesion.estado}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lista de Sesiones */}
      <div className="bg-[#2a2d35] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-lg font-medium">Sesiones activas</h3>
        </div>
        
        {sesiones.length === 0 ? (
          <div className="text-center py-8">
            <Link className="text-gray-400 w-24 h-24 mx-auto mb-4" />
            <h4 className="text-white text-lg font-medium mb-2">No hay sesiones configuradas</h4>
            <p className="text-gray-400 text-sm mb-4">
              Crea tu primera sesión para comenzar a gestionar tus canales.
            </p>
          </div>
        ) : (
          <SesionesList 
            sesiones={sesiones}
            canales={canales}
            contactos={contactos}
            embudos={embudos}
            onToggleStatus={handleToggleSesionStatus}
            onDeleteSesion={handleDeleteSesion}
          />
        )}
      </div>

      {/* Modal para agregar canal */}
      {showAddCanal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#2a2d35] rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-medium">
                Agregar Canal
              </h3>
              <button
                onClick={() => setShowAddCanal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Tipo de canal */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Tipo de canal <span className="text-red-400">*</span>
                </label>
                                 <select
                   value={formData.tipo}
                   onChange={(e) => setFormData({ ...formData, tipo: e.target.value as Canal['tipo'] })}
                   className="w-full bg-[#1a1d23] border border-[#3a3d45] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#F29A1F]"
                 >
                   <option value="">Seleccionar tipo</option>
                   {canalOptions.map((option) => (
                     <option key={option.id} value={option.id}>
                       {option.icon} {option.nombre}
                     </option>
                   ))}
                 </select>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Descripción del canal <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full bg-[#1a1d23] border border-[#3a3d45] rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-[#F29A1F]"
                  placeholder="Ej: WhatsApp Principal"
                />
              </div>

              {/* Usuario */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Usuario <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.usuario_id}
                  onChange={(e) => setFormData({ ...formData, usuario_id: e.target.value })}
                  className="w-full bg-[#1a1d23] border border-[#3a3d45] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#F29A1F]"
                >
                  <option value="">Seleccionar usuario</option>
                  {usuarios.map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Embudo */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Embudo <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.espacio_id}
                  onChange={(e) => setFormData({ ...formData, espacio_id: e.target.value })}
                  className="w-full bg-[#1a1d23] border border-[#3a3d45] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#F29A1F]"
                >
                  <option value="">Seleccionar embudo</option>
                  {embudos.map((embudo) => (
                    <option key={embudo.id} value={embudo.id}>
                      {embudo.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botones */}
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowAddCanal(false)}
                  className="flex-1 bg-[#3a3d45] hover:bg-[#4a4d55] text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateCanal}
                  disabled={!formData.tipo || !formData.descripcion || !formData.usuario_id || !formData.espacio_id || loading}
                  className="flex-1 bg-[#F29A1F] hover:bg-[#F29A1F] disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {loading ? 'Creando...' : 'Crear Canal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para agregar sesión */}
      {showAddSesion && selectedCanalForSesion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#2a2d35] rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-medium">
                Agregar Sesión - {selectedCanalForSesion.descripcion}
              </h3>
              <button
                onClick={() => setShowAddSesion(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Nombre de la sesión *
                </label>
                <input
                  type="text"
                  value={sesionFormData.nombre}
                  onChange={(e) => setSesionFormData({ ...sesionFormData, nombre: e.target.value })}
                  className="w-full bg-[#1a1d23] border border-[#3a3d45] rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-[#F29A1F]"
                  placeholder="Ej: Ventas por WhatsApp"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Usuario *
                </label>
                <select
                  value={sesionFormData.usuario_id}
                  onChange={(e) => setSesionFormData({ ...sesionFormData, usuario_id: e.target.value })}
                  className="w-full bg-[#1a1d23] border border-[#3a3d45] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#F29A1F]"
                >
                  <option value="">Seleccionar usuario</option>
                  {usuarios.map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Embudo *
                </label>
                <select
                  value={sesionFormData.embudo_id}
                  onChange={(e) => setSesionFormData({ ...sesionFormData, embudo_id: e.target.value })}
                  className="w-full bg-[#1a1d23] border border-[#3a3d45] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#F29A1F]"
                >
                  <option value="">Seleccionar embudo</option>
                  {embudos.map((embudo) => (
                    <option key={embudo.id} value={embudo.id}>
                      {embudo.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Tipo de sesión *
                </label>
                <select
                  value={sesionFormData.type}
                  onChange={(e) => setSesionFormData({ ...sesionFormData, type: e.target.value as 'whatsapp_qr' | 'whatsapp_api' | 'messenger' | 'instagram' | 'telegram' | 'telegram_bot' | 'gmail' | 'outlook' })}
                  className="w-full bg-[#1a1d23] border border-[#3a3d45] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#F29A1F]"
                >
                  <option value="">Seleccionar tipo</option>
                  <option value="whatsapp_qr">WhatsApp QR</option>
                  <option value="whatsapp_api">WhatsApp API</option>
                  <option value="messenger">Messenger</option>
                  <option value="instagram">Instagram</option>
                  <option value="telegram">Telegram</option>
                  <option value="telegram_bot">Telegram Bot</option>
                  <option value="gmail">Gmail</option>
                  <option value="outlook">Outlook</option>
                </select>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Descripción
                </label>
                <textarea
                  value={sesionFormData.description}
                  onChange={(e) => setSesionFormData({ ...sesionFormData, description: e.target.value })}
                  className="w-full bg-[#1a1d23] border border-[#3a3d45] rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-[#F29A1F]"
                  placeholder="Descripción de la sesión..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Estado
                </label>
                <select
                  value={sesionFormData.estado}
                  onChange={(e) => setSesionFormData({ ...sesionFormData, estado: e.target.value as 'activo' | 'desconectado' | 'expirado' })}
                  className="w-full bg-[#1a1d23] border border-[#3a3d45] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#F29A1F]"
                >
                  <option value="activo">Activo</option>
                  <option value="desconectado">Desconectado</option>
                  <option value="expirado">Expirado</option>
                </select>
              </div>

              {/* Configuración específica por tipo de sesión */}
              {(sesionFormData.type === 'gmail' || sesionFormData.type === 'outlook') && (
                <>
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={sesionFormData.email}
                      onChange={(e) => setSesionFormData({ ...sesionFormData, email: e.target.value })}
                      className="w-full bg-[#1a1d23] border border-[#3a3d45] rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-[#F29A1F]"
                      placeholder="usuario@gmail.com"
                    />
                  </div>
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={sesionFormData.given_name}
                      onChange={(e) => setSesionFormData({ ...sesionFormData, given_name: e.target.value })}
                      className="w-full bg-[#1a1d23] border border-[#3a3d45] rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-[#F29A1F]"
                      placeholder="Nombre del usuario"
                    />
                  </div>
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      URL de la imagen de perfil
                    </label>
                    <input
                      type="url"
                      value={sesionFormData.picture}
                      onChange={(e) => setSesionFormData({ ...sesionFormData, picture: e.target.value })}
                      className="w-full bg-[#1a1d23] border border-[#3a3d45] rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-[#F29A1F]"
                      placeholder="https://example.com/profile.jpg"
                    />
                  </div>
                </>
              )}

              {(sesionFormData.type === 'whatsapp_qr' || sesionFormData.type === 'whatsapp_api') && (
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    WhatsApp Session UUID
                  </label>
                  <input
                    type="text"
                    value={sesionFormData.whatsapp_session}
                    onChange={(e) => setSesionFormData({ ...sesionFormData, whatsapp_session: e.target.value })}
                    className="w-full bg-[#1a1d23] border border-[#3a3d45] rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-[#F29A1F]"
                    placeholder="UUID de la sesión de WhatsApp"
                  />
                </div>
              )}

              {(sesionFormData.type === 'instagram' || sesionFormData.type === 'messenger') && (
                <>
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={sesionFormData.email}
                      onChange={(e) => setSesionFormData({ ...sesionFormData, email: e.target.value })}
                      className="w-full bg-[#1a1d23] border border-[#3a3d45] rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-[#F29A1F]"
                      placeholder="usuario@facebook.com"
                    />
                  </div>
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={sesionFormData.given_name}
                      onChange={(e) => setSesionFormData({ ...sesionFormData, given_name: e.target.value })}
                      className="w-full bg-[#1a1d23] border border-[#3a3d45] rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-[#F29A1F]"
                      placeholder="Nombre del usuario"
                    />
                  </div>
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      URL de la imagen de perfil
                    </label>
                    <input
                      type="url"
                      value={sesionFormData.picture}
                      onChange={(e) => setSesionFormData({ ...sesionFormData, picture: e.target.value })}
                      className="w-full bg-[#1a1d23] border border-[#3a3d45] rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-[#F29A1F]"
                      placeholder="https://example.com/profile.jpg"
                    />
                  </div>
                </>
              )}
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAddSesion(false)}
                  className="flex-1 bg-[#3a3d45] hover:bg-[#4a4d55] text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateSesion}
                  disabled={!sesionFormData.nombre || !sesionFormData.usuario_id || !sesionFormData.embudo_id || !sesionFormData.type || loading}
                  className="flex-1 bg-[#F29A1F] hover:bg-[#F29A1F] disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {loading ? 'Creando...' : 'Crear Sesión'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar canal */}
      <ConfirmDeleteCanalModal
        isOpen={showDeleteModal}
        canal={canalToDelete}
        onConfirm={confirmDeleteCanal}
        onCancel={cancelDeleteCanal}
        isLoading={loading}
      />

      {/* Modal para vincular sesión */}
      <VincularSesionModal
        isOpen={showVincularSesion}
        onClose={() => {
          setShowVincularSesion(false);
          setTipoSesionSeleccionado('');
        }}
        onVincular={handleConfirmarVinculacion}
        tipoSesion={tipoSesionSeleccionado}
      />
    </div>
  );
}
