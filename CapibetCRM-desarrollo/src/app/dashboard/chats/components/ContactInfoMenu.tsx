'use client';

import { useState, useEffect } from 'react';
import { ContactResponse } from '@/services/contactoServices';
import { SesionResponse } from '@/app/api/sesiones/domain/sesion';
import { ChatResponse } from '@/app/api/chats/domain/chat';
import { UsuarioResponse } from '@/app/api/usuarios/domain/usuario';
import { EmbudoResponse } from '@/app/api/embudos/domain/embudo';
import { EspacioTrabajoResponse } from '@/app/api/espacio_trabajos/domain/espacio_trabajo';
import { userServices } from '@/services/userServices';
import { embudoServices } from '@/services/embudoServices';
import { espacioTrabajoServices } from '@/services/espacioTrabajoServices';
import { contactoServices } from '@/services/contactoServices';
import { chatServices } from '@/services/chatServices';
import { ventasServices, VentaResponse } from '@/services/ventasServices';
import { productosServices, ProductResponse } from '@/services/productosServices';
import VentaModal from './VentaModal';
import { 
  Phone, 
  Mail, 
  MapPin, 
  X,
  Edit,
  Tag,
  User,
  ChevronDown,
  DollarSign,
  MessageCircle,
  Plus,
  Calendar,
  Users,
  Filter,
  Save,
  UserCircle2
} from 'lucide-react';

interface ContactInfoMenuProps {
  isOpen: boolean;
  onClose: () => void;
  contacto: ContactResponse;
  sesion: SesionResponse;
  chatData: ChatResponse;
  onContactUpdate?: (updatedContact: ContactResponse, updatedChat?: ChatResponse) => void;
}

export default function ContactInfoMenu({ 
  isOpen, 
  onClose, 
  contacto, 
  sesion, 
  chatData,
  onContactUpdate
}: ContactInfoMenuProps) {
  const [genero, setGenero] = useState<string>('');
  const [origen, setOrigen] = useState<string>('');
  const [fechaNacimiento, setFechaNacimiento] = useState<string>('');
  const [notas, setNotas] = useState<string>('');
  const [nombre, setNombre] = useState<string>('');
  const [telefono, setTelefono] = useState<string>('');
  const [isContactInfoExpanded, setIsContactInfoExpanded] = useState<boolean>(true);
  const [isPersonalDataExpanded, setIsPersonalDataExpanded] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Estados para los dropdowns
  const [agentes, setAgentes] = useState<UsuarioResponse[]>([]);
  const [espaciosTrabajo, setEspaciosTrabajo] = useState<EspacioTrabajoResponse[]>([]);
  const [embudos, setEmbudos] = useState<EmbudoResponse[]>([]);
  const [agenteSeleccionado, setAgenteSeleccionado] = useState<string | null>(null);
  const [embudoSeleccionado, setEmbudoSeleccionado] = useState<string | null>(null);
  
  // Estados para el modal de ventas
  const [isVentaModalOpen, setIsVentaModalOpen] = useState<boolean>(false);
  
  // Estados para ventas del contacto
  const [ventas, setVentas] = useState<VentaResponse[]>([]);
  const [productos, setProductos] = useState<ProductResponse[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([]);
  const [loadingVentas, setLoadingVentas] = useState<boolean>(false);

  // Cargar datos al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadAgentes();
      loadEspaciosTrabajo();
      loadVentas();
      loadProductos();
      loadUsuarios();
      // Establecer el embudo actual del chat como seleccionado por defecto
      setEmbudoSeleccionado(chatData.embudo_id);
      // Cargar datos del contacto
      setNombre(contacto.nombre || '');
      setTelefono(contacto.telefono || '');
      setGenero(contacto.genero || '');
      setOrigen(contacto.origen || '');
      setFechaNacimiento(contacto.fecha_cumpleaños || '');
      setAgenteSeleccionado(contacto.agente || null);
    }
  }, [isOpen, chatData.embudo_id, contacto]);

  // Cargar embudos cuando cambie el espacio de trabajo seleccionado
  useEffect(() => {
    if (espaciosTrabajo.length > 0) {
      loadEmbudos();
    }
  }, [espaciosTrabajo]);

  const loadAgentes = async () => {
    try {
      const response = await userServices.getAllUsuarios();
      if (response.success && response.data) {
        setAgentes(response.data);
      }
    } catch (error) {
      console.error('Error loading agentes:', error);
    }
  };

  const loadEspaciosTrabajo = async () => {
    try {
      const response = await espacioTrabajoServices.getAllEspaciosTrabajo();
      if (response.success && response.data) {
        setEspaciosTrabajo(response.data);
      }
    } catch (error) {
      console.error('Error loading espacios de trabajo:', error);
    }
  };

  const loadEmbudos = async () => {
    try {
      const response = await embudoServices.getAllEmbudos();
      if (response.success && response.data) {
        setEmbudos(response.data);
      }
    } catch (error) {
      console.error('Error loading embudos:', error);
    }
  };

  const loadVentas = async () => {
    if (!contacto.id) return;
    
    setLoadingVentas(true);
    try {
      const response = await ventasServices.getVentasByCliente(contacto.id);
      if (response.success && response.data) {
        setVentas(response.data);
      }
    } catch (error) {
      console.error('Error loading ventas:', error);
    } finally {
      setLoadingVentas(false);
    }
  };

  const loadProductos = async () => {
    try {
      const response = await productosServices.getAllProductos();
      if (response.success && response.data) {
        setProductos(response.data);
      }
    } catch (error) {
      console.error('Error loading productos:', error);
    }
  };

  const loadUsuarios = async () => {
    try {
      const response = await userServices.getAllUsuarios();
      if (response.success && response.data) {
        setUsuarios(response.data);
      }
    } catch (error) {
      console.error('Error loading usuarios:', error);
    }
  };

  // Funciones auxiliares para obtener información de ventas
  const getProductoInfo = (productoId: string) => {
    return productos.find(p => p.id === productoId);
  };

  const getVendedorInfo = (vendedorId: string) => {
    return usuarios.find(u => u.id === vendedorId);
  };

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleSaveContact = async () => {
    if (!contacto.id) {
      console.error('No se puede actualizar: ID de contacto no disponible');
      return;
    }

    setIsLoading(true);
    try {
      const updateData = {
        id: contacto.id,
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        genero: genero,
        origen: origen,
        fecha_cumpleaños: fechaNacimiento,
        agente: agenteSeleccionado || undefined,
        notas: notas
      };

      const response = await contactoServices.updateContacto(updateData);
      
      if (!response.success) {
        throw new Error(response.error || 'Error al actualizar el contacto');
      }

      let chatActualizado = chatData;

      // Si se cambió el embudo, actualizar el chat
      if (embudoSeleccionado !== chatData.embudo_id) {
        try {
          const chatUpdateResponse = await chatServices.updateChat({
            id: chatData.id,
            embudo_id: embudoSeleccionado || undefined
          });
          
          if (chatUpdateResponse.success && chatUpdateResponse.data) {
            chatActualizado = chatUpdateResponse.data;
          } else {
            console.warn('Contacto actualizado pero no se pudo actualizar el embudo del chat:', chatUpdateResponse.error);
          }
        } catch (chatError) {
          console.warn('Error al actualizar embudo del chat:', chatError);
        }
      }

      // Salir del modo edición
      setIsEditing(false);
      
      // Notificar al componente padre sobre la actualización del contacto y chat
      if (onContactUpdate && response.data) {
        // Crear un objeto de contacto actualizado con todos los cambios
        const contactoActualizado = {
          ...contacto,
          ...response.data,
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          genero: genero,
          origen: origen,
          fecha_cumpleaños: fechaNacimiento,
          agente: agenteSeleccionado || undefined,
          notas: notas
        };
        
        onContactUpdate(contactoActualizado, chatActualizado);
      }
      
      alert('Contacto actualizado exitosamente');
    } catch (error) {
      console.error('Error al actualizar contacto:', error);
      alert('Error al actualizar el contacto. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-0 h-full w-96 bg-[var(--bg-primary)] border-l border-[var(--border-primary)] shadow-2xl z-[80] flex flex-col rounded-r-lg overflow-hidden backdrop-blur-sm">
      {/* Header Mejorado */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-primary)] bg-gradient-to-r from-[var(--bg-secondary)] to-[var(--bg-primary)] flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-hover)] flex items-center justify-center">
            <UserCircle2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Información
            </h2>
            <p className="text-xs text-[var(--text-muted)]">Detalles del contacto</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-all duration-200 cursor-pointer group"
        >
          <X className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
        </button>
      </div>

      {/* Content con scroll personalizado */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 min-h-0 custom-scrollbar">
        <style jsx>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: var(--border-primary);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: var(--text-muted);
          }
          
          .accordion-wrapper {
            display: grid;
            grid-template-rows: 0fr;
            transition: grid-template-rows 0.3s ease-out;
          }
          
          .accordion-wrapper.expanded {
            grid-template-rows: 1fr;
          }
          
          .accordion-content {
            overflow: hidden;
          }
          
          .accordion-inner {
            opacity: 0;
            transform: translateY(-10px);
            transition: opacity 0.3s ease-out, transform 0.3s ease-out;
          }
          
          .accordion-wrapper.expanded .accordion-inner {
            opacity: 1;
            transform: translateY(0);
          }
        `}</style>

        {/* Botón editar mejorado */}
        <button 
          onClick={isEditing ? handleSaveContact : () => setIsEditing(true)}
          disabled={isLoading}
          className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-medium transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            isEditing 
              ? 'bg-green-600 text-white hover:bg-green-700' 
              : 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)]'
          }`}
        >
          {isEditing ? <Save className="w-5 h-5" /> : <Edit className="w-5 h-5" />}
          <span className="text-sm">
            {isLoading ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Editar Contacto'}
          </span>
        </button>

        {/* Información de contacto mejorada */}
        <div className="space-y-3">
          <button
            onClick={() => setIsContactInfoExpanded(!isContactInfoExpanded)}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[var(--bg-secondary)] to-transparent rounded-xl hover:from-[var(--bg-secondary)] hover:to-[var(--bg-secondary)] transition-all duration-200 group"
          >
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-[var(--accent-primary)]" />
              <h4 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
                Información
              </h4>
            </div>
            <ChevronDown className={`w-5 h-5 text-[var(--text-muted)] transition-transform duration-200 ${isContactInfoExpanded ? 'rotate-180' : ''}`} />
          </button>
          
          <div className={`accordion-wrapper ${isContactInfoExpanded ? 'expanded' : ''}`}>
            <div className="accordion-content">
              <div className="accordion-inner space-y-3 p-4 bg-gray-500/10 rounded-xl">
                <div className="group p-4 bg-[var(--bg-secondary)] rounded-xl hover:bg-opacity-80 transition-all duration-200 border border-transparent hover:border-[var(--accent-primary)]">
                  <div className="flex items-start space-x-3">
                  <div className="p-2 bg-[var(--bg-primary)] rounded-lg">
                    <User className="w-4 h-4 text-[var(--accent-primary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--text-muted)] mb-1">Nombre</p>
                    {isEditing ? (
                      <input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-all"
                        placeholder="Nombre del contacto"
                      />
                    ) : (
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{nombre || 'Sin nombre'}</p>
                    )}
                  </div>
                  </div>
                </div>

                <div className="group p-4 bg-[var(--bg-secondary)] rounded-xl hover:bg-opacity-80 transition-all duration-200 border border-transparent hover:border-[var(--accent-primary)]">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-[var(--bg-primary)] rounded-lg">
                      <MessageCircle className="w-4 h-4 text-[var(--accent-primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--text-muted)] mb-1">Sesión</p>
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{sesion.nombre}</p>
                    </div>
                  </div>
                </div>

                {contacto.correo && (
                  <div className="group p-4 bg-[var(--bg-secondary)] rounded-xl hover:bg-opacity-80 transition-all duration-200 border border-transparent hover:border-[var(--accent-primary)]">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-[var(--bg-primary)] rounded-lg">
                        <Mail className="w-4 h-4 text-[var(--accent-primary)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text-muted)] mb-1">Email</p>
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{contacto.correo}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="group p-4 bg-[var(--bg-secondary)] rounded-xl hover:bg-opacity-80 transition-all duration-200 border border-transparent hover:border-[var(--accent-primary)]">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-[var(--bg-primary)] rounded-lg">
                      <Phone className="w-4 h-4 text-[var(--accent-primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--text-muted)] mb-1">Teléfono</p>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={telefono}
                          onChange={(e) => setTelefono(e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-all"
                          placeholder="Número de teléfono"
                        />
                      ) : (
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{telefono || 'Sin teléfono'}</p>
                      )}
                    </div>
                  </div>
                </div>

                {contacto.direccion && (
                  <div className="group p-4 bg-[var(--bg-secondary)] rounded-xl hover:bg-opacity-80 transition-all duration-200 border border-transparent hover:border-[var(--accent-primary)]">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-[var(--bg-primary)] rounded-lg">
                        <MapPin className="w-4 h-4 text-[var(--accent-primary)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text-muted)] mb-1">Dirección</p>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{contacto.direccion}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Datos personales mejorados */}
        <div className="space-y-3">
          <button
            onClick={() => setIsPersonalDataExpanded(!isPersonalDataExpanded)}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[var(--bg-secondary)] to-transparent rounded-xl hover:from-[var(--bg-secondary)] hover:to-[var(--bg-secondary)] transition-all duration-200 group"
          >
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-[var(--accent-primary)]" />
              <h4 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
                Datos Personales
              </h4>
            </div>
            <ChevronDown className={`w-5 h-5 text-[var(--text-muted)] transition-transform duration-200 ${isPersonalDataExpanded ? 'rotate-180' : ''}`} />
          </button>
          
          <div className={`accordion-wrapper ${isPersonalDataExpanded ? 'expanded' : ''}`}>
            <div className="accordion-content">
              <div className="accordion-inner space-y-4 p-4 bg-gray-500/10 rounded-xl">
                {/* Género */}
                <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-3">Género</label>
                <div className="flex space-x-3">
                  <label className={`flex-1 flex items-center justify-center space-x-2 p-3 rounded-lg border-2 transition-all ${
                    genero === 'masculino' 
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white' 
                      : 'border-[var(--border-primary)] text-[var(--text-primary)]'
                  } ${isEditing ? 'cursor-pointer hover:border-[var(--accent-primary)]' : 'opacity-50 cursor-not-allowed pointer-events-none'}`}>
                    <input
                      type="radio"
                      name="genero"
                      value="masculino"
                      checked={genero === 'masculino'}
                      onChange={(e) => setGenero(e.target.value)}
                      disabled={!isEditing}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">Masculino</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center space-x-2 p-3 rounded-lg border-2 transition-all ${
                    genero === 'femenino' 
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white' 
                      : 'border-[var(--border-primary)] text-[var(--text-primary)]'
                  } ${isEditing ? 'cursor-pointer hover:border-[var(--accent-primary)]' : 'opacity-50 cursor-not-allowed pointer-events-none'}`}>
                    <input
                      type="radio"
                      name="genero"
                      value="femenino"
                      checked={genero === 'femenino'}
                      onChange={(e) => setGenero(e.target.value)}
                      disabled={!isEditing}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">Femenino</span>
                  </label>
                </div>
                </div>

                {/* Origen */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-2">Origen</label>
                  <textarea
                    value={origen}
                    onChange={(e) => setOrigen(e.target.value)}
                    placeholder="Describe el origen del contacto..."
                    disabled={!isEditing}
                    className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    rows={3}
                  />
                </div>

                {/* Fecha de nacimiento */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-2">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    value={fechaNacimiento}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                    disabled={!isEditing}
                    className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Agente mejorado */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="w-4 h-4 text-[var(--accent-primary)]" />
            <h4 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
              Agente
            </h4>
          </div>
          <select
            value={agenteSeleccionado || ''}
            onChange={(e) => setAgenteSeleccionado(e.target.value || null)}
            disabled={!isEditing}
            className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all appearance-none cursor-pointer"
          >
            <option value="">Seleccionar agente...</option>
            {agentes.map((agente) => (
              <option key={agente.id} value={agente.id}>
                {agente.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Funnel mejorado */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 mb-2">
            <Filter className="w-4 h-4 text-[var(--accent-primary)]" />
            <h4 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
              Embudo
            </h4>
          </div>
          <select
            value={embudoSeleccionado || ''}
            onChange={(e) => setEmbudoSeleccionado(e.target.value || null)}
            disabled={!isEditing}
            className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all appearance-none cursor-pointer"
          >
            <option value="">Seleccionar embudo...</option>
            {espaciosTrabajo.map((espacio) => {
              const embudosDelEspacio = embudos.filter(embudo => embudo.espacio_id === espacio.id);
              if (embudosDelEspacio.length === 0) return null;
              
              return (
                <optgroup key={espacio.id} label={espacio.nombre}>
                  {embudosDelEspacio.map((embudo) => (
                    <option key={embudo.id} value={embudo.id}>
                      {embudo.nombre}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>

        {/* Notas mejoradas */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
            Notas
          </h4>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Añade notas sobre este contacto..."
            disabled={!isEditing}
            className="w-full p-4 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            rows={4}
          />
        </div>

        {/* Ventas mejoradas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
                  Ventas
                </h4>
                <p className="text-xs text-[var(--text-muted)]">{ventas.length} {ventas.length === 1 ? 'venta' : 'ventas'} registradas</p>
              </div>
            </div>
            <button
              onClick={() => setIsVentaModalOpen(true)}
              className="flex items-center space-x-1 px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 text-sm font-medium cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva</span>
            </button>
          </div>
          <div className="space-y-2">
            {loadingVentas ? (
              <div className="p-6 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)]">
                <div className="flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)] mb-2"></div>
                  <p className="text-sm text-[var(--text-muted)]">Cargando ventas...</p>
                </div>
              </div>
            ) : ventas.length === 0 ? (
              <div className="p-6 bg-[var(--bg-secondary)] rounded-xl border border-dashed border-[var(--border-primary)]">
                <div className="flex flex-col items-center justify-center">
                  <DollarSign className="w-12 h-12 text-[var(--text-muted)] mb-2 opacity-50" />
                  <p className="text-sm text-[var(--text-muted)] text-center">
                    No hay ventas registradas
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {ventas.map((venta) => {
                  const producto = getProductoInfo(venta.producto_id);
                  const vendedor = getVendedorInfo(venta.vendedor_id);
                  const montoTotal = producto ? producto.precio * venta.cantidad : 0;
                  
                  return (
                    <div key={venta.id} className="p-4 bg-gradient-to-r from-[var(--bg-secondary)] to-transparent rounded-xl border border-[var(--border-primary)] hover:border-green-500 transition-all duration-200 group">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0 mr-3">
                          <p className="text-sm font-semibold text-[var(--text-primary)] truncate mb-1">
                            {producto?.nombre || 'Producto no encontrado'}
                          </p>
                          <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)]">
                            <span>Cantidad: {venta.cantidad}</span>
                            <span>•</span>
                            <span>{formatDate(venta.fecha)}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <span className="inline-block px-3 py-1 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-bold rounded-lg">
                            {formatPrice(montoTotal)}
                          </span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-[var(--border-primary)]">
                        <p className="text-xs text-[var(--text-muted)]">
                          Vendedor: <span className="text-[var(--text-primary)] font-medium">{vendedor?.nombre || 'No encontrado'}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Etiquetas mejoradas */}
        {contacto.etiquetas && contacto.etiquetas.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 text-[var(--accent-primary)]" />
              <h4 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
                Etiquetas
              </h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {contacto.etiquetas.map((etiqueta, index) => (
                <span key={index} className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-hover)] text-white shadow-md">
                  <Tag className="w-3 h-3 mr-2" />
                  {etiqueta}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Modal de Venta */}
      <VentaModal
        isOpen={isVentaModalOpen}
        onClose={() => setIsVentaModalOpen(false)}
        onSave={() => {
          loadVentas();
          console.log('Venta guardada exitosamente');
        }}
        contactoActual={contacto}
      />
    </div>
  );
}
