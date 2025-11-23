'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Edit2, Trash2 } from 'lucide-react';
// import DashboardLayout from '../layout';
import AgregarContactoModal from './components/AgregarContactoModal';
import EditarContactoModal from './components/EditarContactoModal';
import ConfirmarEliminarModal from './components/ConfirmarEliminarModal';
import ConfirmarEliminacionMasivaModal from './components/ConfirmarEliminacionMasivaModal';
import { contactoServices, ContactResponse, ContactData } from '@/services/contactoServices';
import { isUserAuthenticated, getCurrentUserId } from '@/utils/auth';
import RoleProtection from '@/components/RoleProtection';

export default function ContactosPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [contacts, setContacts] = useState<ContactResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactResponse | null>(null);
  const [deletingContact, setDeletingContact] = useState<ContactResponse | null>(null);
  const [userId, setUserId] = useState<string>('');
  const router = useRouter();

  // Función para cargar contactos desde Supabase
  const fetchContacts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await contactoServices.getAllContactos();
      
      if (result.success && result.data) {
        setContacts(result.data);
      } else {
        setError(result.error || 'Error al cargar contactos');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar contactos');
    } finally {
      setLoading(false);
    }
  };

  // Función para agregar nuevo contacto
  const handleAddContact = async (contactData: ContactData) => {
    try {
      const result = await contactoServices.createContacto(contactData);
      
      if (result.success) {
        // Recargar contactos
        await fetchContacts();
        console.log('Contacto agregado exitosamente');
      } else {
        setError(result.error || 'Error al agregar contacto');
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar contacto');
      throw err; // Re-lanzar para que el modal maneje el error
    }
  };

  // Función para abrir modal de confirmación de eliminación
  const handleDeleteContact = (contact: ContactResponse) => {
    setDeletingContact(contact);
    setShowDeleteModal(true);
  };

  // Función para confirmar eliminación de contacto
  const handleConfirmDelete = async () => {
    if (!deletingContact) return;

    try {
      // Usar el servicio seguro para eliminar
      const result = await contactoServices.deleteContacto(deletingContact.id);
      
      if (result.success) {
        // Recargar contactos
        await fetchContacts();
        console.log('Contacto eliminado exitosamente');
        
        // Cerrar modal
        setShowDeleteModal(false);
        setDeletingContact(null);
      } else {
        setError(result.error || 'Error al eliminar el contacto');
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Error al eliminar contacto:', err);
      setError(err instanceof Error ? err.message : 'Error al eliminar contacto');
      throw err; // Re-lanzar para que el modal maneje el error
    }
  };

  // Función para cerrar modal de eliminación
  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletingContact(null);
  };



  // Función para abrir modal de confirmación de eliminación masiva
  const handleBulkDelete = () => {
    if (selectedContacts.length === 0) return;
    setShowBulkDeleteModal(true);
  };

  // Función para confirmar eliminación masiva de contactos
  const handleConfirmBulkDelete = async () => {
    if (selectedContacts.length === 0) return;
    
    console.log('Iniciando eliminación masiva de contactos:', selectedContacts);
    
    try {
      const failedDeletions: string[] = [];
      const successfulDeletions: string[] = [];
      
      // Eliminar cada contacto seleccionado usando el servicio seguro
      for (const contactId of selectedContacts) {
        console.log(`Procesando eliminación del contacto ID: ${contactId}`);
        try {
          const result = await contactoServices.deleteContacto(contactId);
          
          if (result.success) {
            successfulDeletions.push(contactId);
          } else {
            console.error(`Error al eliminar contacto ${contactId}:`, result.error);
            failedDeletions.push(contactId);
          }
        } catch (error) {
          console.error(`Error de red al eliminar contacto ${contactId}:`, error);
          failedDeletions.push(contactId);
        }
      }
      
      // Mostrar resultados
      if (successfulDeletions.length > 0) {
        console.log(`${successfulDeletions.length} contacto(s) eliminado(s) exitosamente`);
        
        if (failedDeletions.length > 0) {
          console.warn(`${failedDeletions.length} contacto(s) no se pudieron eliminar:`, failedDeletions);
          setError(`Se eliminaron ${successfulDeletions.length} contacto(s), pero ${failedDeletions.length} fallaron. Solo puedes eliminar tus propios contactos.`);
        } else {
          // Todos exitosos
          setError(null);
        }
        
        // Recargar contactos
        await fetchContacts();
      }
      
      if (failedDeletions.length === 0) {
        // Solo cerrar modal si todos fueron exitosos
        setSelectedContacts([]);
        setShowBulkDeleteModal(false);
      } else {
        // Si hay fallos, mantener el modal abierto y mostrar error
        setError(`Error al eliminar algunos contactos. ${successfulDeletions.length} eliminado(s), ${failedDeletions.length} fallido(s). Solo puedes eliminar tus propios contactos.`);
      }
    } catch (err) {
      console.error('Error general al eliminar contactos:', err);
      setError('Error inesperado al eliminar contactos. Revisa la consola para más detalles.');
    }
  };

  // Función para cerrar modal de eliminación masiva
  const handleCloseBulkDeleteModal = () => {
    setShowBulkDeleteModal(false);
    // Limpiar selección al cerrar el modal
    setSelectedContacts([]);
  };

  // Función para enviar mensaje a contactos seleccionados
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const sendMessageToSelected = async () => {
    if (selectedContacts.length === 0) return;
    
    try {
      // TODO: Implementar envío de mensajes
      // Lógica para enviar mensajes a los contactos seleccionados
      console.log('Enviando mensaje a:', selectedContacts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar mensajes');
    }
  };

  // Función para editar contacto
  const handleEditContact = (contact: ContactResponse) => {
    setEditingContact(contact);
    setShowEditModal(true);
  };

  // Función para cerrar modal de edición
  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingContact(null);
  };

  // Función para manejar contacto actualizado
  const handleContactUpdated = async () => {
    await fetchContacts(); // Recargar contactos
  };

  const handleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contacts.map(contact => contact.id));
    }
  };

  const handleSelectContact = (contactId: string) => {
    if (selectedContacts.includes(contactId)) {
      setSelectedContacts(selectedContacts.filter(id => id !== contactId));
    } else {
      setSelectedContacts([...selectedContacts, contactId]);
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (contact.apellido && contact.apellido.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (contact.nombre_completo && contact.nombre_completo.toLowerCase().includes(searchQuery.toLowerCase())) ||
    contact.telefono.includes(searchQuery) ||
    (contact.direccion && contact.direccion.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (contact.etiquetas && contact.etiquetas.some(etiqueta => etiqueta.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  // Cargar datos del usuario y contactos al montar el componente
  useEffect(() => {
    // Verificar autenticación usando la utilidad centralizada
    if (!isUserAuthenticated()) {
      router.push('/login');
      return;
    }
    
    // Cargar datos del usuario usando la utilidad centralizada
    const currentUserId = getCurrentUserId();
    setUserId(currentUserId || '');
    
    // Cargar contactos
    fetchContacts();
  }, [router]);

  // Función para formatear fecha
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES');
    } catch {
      return '-';
    }
  };

  // Función para obtener el nombre completo
  const getFullName = (contact: ContactResponse) => {
    if (contact.nombre_completo) return contact.nombre_completo;
    if (contact.apellido) return `${contact.nombre} ${contact.apellido}`;
    return contact.nombre;
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-[var(--text-primary)]">Cargando...</div>
      </div>
    );
  }

  return (
    <RoleProtection requiredRoles={['admin']}>
      <div className="flex-1 flex flex-col">
      {/* Header de Contactos */}
      <div className="bg-[var(--bg-primary)] border-b border-[var(--border-primary)] px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center space-x-4">
            {/* Page Title */}
            <h1 className="text-[var(--text-primary)] font-semibold text-2xl">Contactos</h1>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Action Buttons */}
            <button className="flex items-center space-x-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded text-sm font-medium transition-colors cursor-pointer">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span>Importar</span>
            </button>

            <button className="flex items-center space-x-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded text-sm font-medium transition-colors cursor-pointer">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span>Exportar</span>
            </button>

            {/* Botón Agregar Contacto */}
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded text-sm font-medium transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Agregar Contacto</span>
            </button>

            {/* Filter */}
            <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded cursor-pointer">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
              </svg>
            </button>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-3 py-2 pl-9 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] w-48"
              />
              <svg className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

             {/* Main Content */}
       <div className={`flex-1 bg-[var(--bg-primary)] p-6 ${selectedContacts.length > 0 ? 'mb-24' : ''}`}>
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-600 text-white rounded-lg">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
          {/* Table Header */}
          <div className="grid grid-cols-10 gap-4 p-4 border-b border-[var(--border-primary)] text-[var(--text-muted)] text-sm font-medium">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 text-[var(--accent-primary)] bg-[var(--bg-primary)] border-[var(--border-primary)] rounded focus:ring-[var(--accent-primary)] focus:ring-2"
              />
            </div>
            <div>Nombre</div>
            <div>Dirección</div>
            <div>Teléfono</div>
            <div>Email</div>
            <div>Género</div>
            <div>Origen</div>
            <div>Etiquetas</div>
            <div>Fecha Creación</div>
            <div>Acciones</div>
          </div>

          {/* Table Body */}
          {loading ? (
            <div className="p-12 text-center">
              <div className="text-[var(--text-muted)] text-lg mb-2">Cargando...</div>
            </div>
          ) : filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="grid grid-cols-10 gap-4 p-4 border-b border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedContacts.includes(contact.id)}
                    onChange={() => handleSelectContact(contact.id)}
                    className="w-4 h-4 text-[var(--accent-primary)] bg-[var(--bg-primary)] border-[var(--border-primary)] rounded focus:ring-[var(--accent-primary)] focus:ring-2"
                  />
                </div>
                <div className="text-[var(--text-primary)] font-medium">{getFullName(contact)}</div>
                <div className="text-[var(--text-secondary)]">{contact.direccion || '-'}</div>
                <div className="text-[var(--text-secondary)]">{contact.telefono}</div>
                <div className="text-[var(--text-secondary)]">{contact.correo}</div>
                <div className="text-[var(--text-secondary)]">{contact.genero || '-'}</div>
                <div className="text-[var(--text-secondary)]">{contact.origen || '-'}</div>
                <div>
                  {contact.etiquetas && contact.etiquetas.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {contact.etiquetas.map((etiqueta, index) => (
                        <span key={index} className="px-2 py-1 bg-[var(--accent-primary)] text-white text-xs rounded-full">
                          {etiqueta}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[var(--text-secondary)]">-</span>
                  )}
                </div>
                <div className="text-[var(--text-secondary)] text-sm">
                  {formatDate(contact.creado_en)}
                </div>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => handleEditContact(contact)}
                    className="text-[var(--text-muted)] hover:text-blue-400 text-sm transition-colors cursor-pointer"
                    title="Editar contacto"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteContact(contact)}
                    className="text-[var(--text-muted)] hover:text-red-400 text-sm transition-colors cursor-pointer"
                    title="Eliminar contacto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            /* Empty State */
            <div className="p-12 text-center">
              <div className="text-[var(--text-muted)] text-lg mb-2">Sin datos</div>
              <div className="text-[var(--text-muted)] text-sm">Página 1 de 0</div>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex justify-center mt-6 space-x-4">
          <button className="px-4 py-2 text-[var(--text-muted)] bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded cursor-pointer">
            ANTERIOR
          </button>
          <button className="px-4 py-2 text-[var(--text-muted)] bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded cursor-pointer">
            SIGUIENTE
          </button>
        </div>

                 {/* Selected Contacts Info */}
         {selectedContacts.length > 0 && (
           <div className="fixed bottom-0 left-0 right-0 bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] p-4 z-40">
             <div className="flex items-center justify-between max-w-7xl mx-auto">
               <div className="flex items-center space-x-3">
                 <div className="flex items-center space-x-2 bg-[var(--accent-primary)] text-white px-3 py-2 rounded-full">
                   <span className="text-sm font-medium">{selectedContacts.length}</span>
                   <span className="text-xs">Seleccionado{selectedContacts.length !== 1 ? 's' : ''}</span>
                 </div>
                 <span className="text-[var(--text-secondary)] text-sm">
                   {selectedContacts.length} contacto{selectedContacts.length !== 1 ? 's' : ''} seleccionado{selectedContacts.length !== 1 ? 's' : ''}
                 </span>
               </div>
               <div className="flex items-center space-x-3">
                                   <button 
                    onClick={() => setSelectedContacts([])}
                    className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Limpiar</span>
                  </button>
                  <button 
                    onClick={handleBulkDelete}
                    className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Eliminar</span>
                  </button>
               </div>
             </div>
           </div>
         )}
      </div>

      {/* Modal Agregar Contacto */}
      <AgregarContactoModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddContact}
        userId={userId}
      />

      {/* Modal Editar Contacto */}
      <EditarContactoModal
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        onContactUpdated={handleContactUpdated}
        contact={editingContact}
      />

      {/* Modal Confirmar Eliminación */}
      <ConfirmarEliminarModal
        isOpen={showDeleteModal}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        contactName={deletingContact ? getFullName(deletingContact) : ''}
      />

      {/* Modal Confirmar Eliminación Masiva */}
      <ConfirmarEliminacionMasivaModal
        isOpen={showBulkDeleteModal}
        onClose={handleCloseBulkDeleteModal}
        onConfirm={handleConfirmBulkDelete}
        contactCount={selectedContacts.length}
      />
      </div>
    </RoleProtection>
  );
}
