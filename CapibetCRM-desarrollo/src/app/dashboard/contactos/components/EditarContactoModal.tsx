'use client';

import { useState, useEffect } from 'react';
import { Edit2 } from 'lucide-react';
import { ContactData, ContactResponse, contactoServices } from '@/services/contactoServices';

interface EditarContactoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContactUpdated: () => void;
  contact: ContactResponse | null;
}

export default function EditarContactoModal({ isOpen, onClose, onContactUpdated, contact }: EditarContactoModalProps) {
  const [formData, setFormData] = useState<ContactData>({
    nombre: '',
    apellido: '',
    correo: '',
    telefono: '',
    notas: '',
    direccion: '',
    cumpleaños: '',
    sitio_web: '',
    creado_por: '',
    agente: undefined,
    organizacion_id: undefined,
    etiquetas: [],
    genero: '',
    fecha_cumpleaños: '',
    origen: '',
    whatsapp_jid: ''
  });
  const [loading, setLoading] = useState(false);

  // Cargar datos del contacto cuando se abre el modal
  useEffect(() => {
    if (contact && isOpen) {
      setFormData({
        nombre: contact.nombre || '',
        apellido: contact.apellido || '',
        correo: contact.correo || '',
        telefono: contact.telefono || '',
        notas: contact.notas || '',
        direccion: contact.direccion || '',
        cumpleaños: contact.cumpleaños || '',
        sitio_web: contact.sitio_web || '',
        creado_por: contact.creado_por,
        agente: contact.agente || undefined,
        organizacion_id: contact.organizacion_id || undefined,
        etiquetas: contact.etiquetas || [],
        genero: contact.genero || '',
        fecha_cumpleaños: contact.fecha_cumpleaños || '',
        origen: contact.origen || '',
        whatsapp_jid: contact.whatsapp_jid || ''
      });
    }
  }, [contact, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contact?.id) {
      return;
    }

    setLoading(true);
    try {
      // Preparar datos para la API (sin campos internos)
      const updateData = {
        nombre: formData.nombre.trim(),
        apellido: formData.apellido?.trim() || '',
        correo: formData.correo.trim(),
        telefono: formData.telefono.trim(),
        notas: formData.notas?.trim() || '',
        direccion: formData.direccion?.trim() || '',
        cumpleaños: formData.cumpleaños,
        sitio_web: formData.sitio_web?.trim() || '',
        genero: formData.genero,
        fecha_cumpleaños: formData.fecha_cumpleaños,
        origen: formData.origen,
        whatsapp_jid: formData.whatsapp_jid?.trim() || '',
        agente: formData.agente,
        organizacion_id: formData.organizacion_id,
        etiquetas: formData.etiquetas
      };

      // Llamar al servicio de contactos
      const response = await contactoServices.updateContacto({
        id: contact.id,
        ...updateData
      });

      if (!response.success) {
        throw new Error(response.error || 'Error al actualizar el contacto');
      }

      // Cerrar modal y refrescar la tabla
      onContactUpdated();
      onClose();
    } catch (error) {
      console.error('Error al actualizar contacto:', error);
      alert('Error al actualizar el contacto. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !contact) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-[#1a1d23] rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#3a3d45]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#F29A1F] rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm"><Edit2 className="w-4 h-4" /></span>
            </div>
            <div>
              <h2 className="text-white text-lg font-semibold">Editar Contacto</h2>
              <p className="text-gray-400 text-sm">Modificar información del contacto</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                placeholder="Nombre del contacto"
                className="w-full pl-10 pr-4 py-3 bg-[#2a2d35] border border-[#3a3d45] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-[#F29A1F] text-sm"
              />
            </div>

            {/* Apellido */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                type="text"
                name="apellido"
                value={formData.apellido}
                onChange={handleInputChange}
                placeholder="Apellido del contacto"
                className="w-full pl-10 pr-4 py-3 bg-[#2a2d35] border border-[#3a3d45] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-[#F29A1F] text-sm"
              />
            </div>

            {/* Correo */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="email"
                name="correo"
                value={formData.correo}
                onChange={handleInputChange}
                placeholder="Correo electrónico"
                className="w-full pl-10 pr-4 py-3 bg-[#2a2d35] border border-[#3a3d45] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-[#F29A1F] text-sm"
              />
            </div>

            {/* Teléfono */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleInputChange}
                placeholder="Número de teléfono"
                className="w-full pl-10 pr-4 py-3 bg-[#2a2d35] border border-[#3a3d45] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-[#F29A1F] text-sm"
              />
            </div>

            {/* Dirección */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <input
                type="text"
                name="direccion"
                value={formData.direccion}
                onChange={handleInputChange}
                placeholder="Dirección"
                className="w-full pl-10 pr-4 py-3 bg-[#2a2d35] border border-[#3a3d45] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-[#F29A1F] text-sm"
              />
            </div>

            {/* Sitio Web */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                </svg>
              </div>
              <input
                type="url"
                name="sitio_web"
                value={formData.sitio_web}
                onChange={handleInputChange}
                placeholder="Sitio web"
                className="w-full pl-10 pr-4 py-3 bg-[#2a2d35] border border-[#3a3d45] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-[#F29A1F] text-sm"
              />
            </div>

            {/* Notas */}
            <div className="relative">
              <div className="absolute top-3 left-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <textarea
                name="notas"
                value={formData.notas}
                onChange={handleInputChange}
                placeholder="Notas adicionales"
                rows={3}
                className="w-full pl-10 pr-4 py-3 bg-[#2a2d35] border border-[#3a3d45] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-[#F29A1F] text-sm resize-none"
              />
            </div>

            {/* WhatsApp JID */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                </svg>
              </div>
              <input
                type="text"
                name="whatsapp_jid"
                value={formData.whatsapp_jid}
                onChange={handleInputChange}
                placeholder="WhatsApp JID"
                className="w-full pl-10 pr-4 py-3 bg-[#2a2d35] border border-[#3a3d45] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-[#F29A1F] text-sm"
              />
            </div>

            {/* Género */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <select
                name="genero"
                value={formData.genero}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 bg-[#2a2d35] border border-[#3a3d45] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-[#F29A1F] text-sm"
              >
                <option value="">Seleccionar género</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Otro">Otro</option>
                <option value="Prefiero no decir">Prefiero no decir</option>
              </select>
            </div>

            {/* Fecha de Cumpleaños */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="date"
                name="fecha_cumpleaños"
                value={formData.fecha_cumpleaños}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 bg-[#2a2d35] border border-[#3a3d45] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-[#F29A1F] text-sm"
              />
            </div>

            {/* Origen */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <select
                name="origen"
                value={formData.origen}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 bg-[#2a2d35] border border-[#3a3d45] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-[#F29A1F] text-sm"
              >
                <option value="">Seleccionar origen</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Facebook">Facebook</option>
                <option value="Instagram">Instagram</option>
                <option value="Email">Email</option>
                <option value="Web">Web</option>
                <option value="Referido">Referido</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            {/* Buttons */}
            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-[#F29A1F] hover:bg-[#F29A1F] disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors cursor-pointer"
              >
                {loading ? 'Actualizando...' : 'Actualizar Contacto'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
