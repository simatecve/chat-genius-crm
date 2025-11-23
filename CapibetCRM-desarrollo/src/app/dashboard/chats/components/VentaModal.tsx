'use client';

import { useState, useEffect } from 'react';
import { ventasServices, VentaData } from '@/services/ventasServices';
import { productosServices, ProductResponse } from '@/services/productosServices';
import { userServices } from '@/services/userServices';
import { UsuarioResponse } from '@/app/api/usuarios/domain/usuario';
import { contactoServices, ContactResponse } from '@/services/contactoServices';

interface VentaModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingVenta?: any;
  onSave?: () => void;
  contactoActual?: ContactResponse; // Contacto actual para bloquear el selector
}

export default function VentaModal({ 
  isOpen, 
  onClose, 
  editingVenta,
  onSave,
  contactoActual
}: VentaModalProps) {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([]);
  const [contactos, setContactos] = useState<ContactResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state para venta
  const [ventaForm, setVentaForm] = useState({
    producto_id: '',
    cliente_id: '',
    vendedor_id: '',
    organizacion_id: '',
    cantidad: '',
    fecha: new Date().toISOString().split('T')[0]
  });

  // Cargar productos desde la API del proyecto
  const loadProducts = async () => {
    try {
      const response = await productosServices.getAllProductos();
      if (response.success && response.data) {
        setProducts(response.data);
      } else {
        setError(response.error || 'Error al cargar productos');
      }
    } catch (err) {
      setError('Error de conexión al cargar productos');
      console.error('Error loading products:', err);
    }
  };

  // Cargar usuarios desde Supabase
  const loadUsuarios = async () => {
    try {
      const response = await userServices.getAllUsuarios();
      if (response.success && response.data) {
        setUsuarios(response.data);
      }
    } catch (err) {
      console.error('Error loading usuarios:', err);
    }
  };

  // Cargar contactos desde la API
  const loadContactos = async () => {
    try {
      const response = await contactoServices.getAllContactos();
      if (response.success && response.data) {
        setContactos(response.data);
      }
    } catch (err) {
      console.error('Error loading contactos:', err);
    }
  };

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      loadProducts();
      loadUsuarios();
      loadContactos();
      
      // Si estamos editando una venta, cargar sus datos
      if (editingVenta) {
        setVentaForm({
          producto_id: editingVenta.producto_id,
          cliente_id: editingVenta.cliente_id,
          vendedor_id: editingVenta.vendedor_id,
          organizacion_id: editingVenta.organizacion_id,
          cantidad: editingVenta.cantidad.toString(),
          fecha: editingVenta.fecha
        });
      } else {
        // Resetear formulario para nueva venta
        setVentaForm({
          producto_id: '',
          cliente_id: contactoActual ? contactoActual.id : '',
          vendedor_id: '',
          organizacion_id: '',
          cantidad: '',
          fecha: new Date().toISOString().split('T')[0]
        });
      }
    }
  }, [isOpen, editingVenta, contactoActual]);

  // Filtrar usuarios por rol y ordenar alfabéticamente
  const vendedores = usuarios
    .filter(usuario => usuario.rol !== 'Cliente')
    .sort((a, b) => a.nombre_usuario.localeCompare(b.nombre_usuario));

  // Ordenar contactos alfabéticamente por nombre
  const contactosOrdenados = contactos
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  // Formatear precio con signo $
  const formatPrice = (price: number) => {
    return `$${price.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Calcular monto total
  const calcularMontoTotal = () => {
    const productoSeleccionado = products.find(p => p.id === ventaForm.producto_id);
    const cantidad = parseInt(ventaForm.cantidad) || 0;
    
    if (productoSeleccionado && cantidad > 0) {
      return productoSeleccionado.precio * cantidad;
    }
    return 0;
  };

  // Guardar venta
  const handleSaveVenta = async () => {
    if (!ventaForm.producto_id || !ventaForm.cliente_id || !ventaForm.vendedor_id || !ventaForm.organizacion_id || !ventaForm.cantidad) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ventaData: VentaData = {
        producto_id: ventaForm.producto_id,
        cliente_id: ventaForm.cliente_id,
        vendedor_id: ventaForm.vendedor_id,
        organizacion_id: ventaForm.organizacion_id,
        cantidad: parseInt(ventaForm.cantidad),
        fecha: ventaForm.fecha
      };

      let response;
      if (editingVenta) {
        // Actualizar venta existente
        response = await ventasServices.updateVentaById(editingVenta.id, ventaData);
      } else {
        // Crear nueva venta
        response = await ventasServices.createVenta(ventaData);
      }

      if (response.success) {
        // Llamar callback para refrescar datos
        if (onSave) {
          onSave();
        }
        onClose();
      } else {
        setError(response.error || (editingVenta ? 'Error al actualizar venta' : 'Error al crear venta'));
      }
    } catch (err) {
      setError('Error de conexión al crear venta');
      console.error('Error saving venta:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] w-full max-w-2xl mx-4">
        {/* Header del modal */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
          <h3 className="text-[var(--text-primary)] font-semibold">
            {editingVenta ? 'Editar Venta' : 'Nueva Venta'}
          </h3>
          <button 
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido del modal */}
        <div className="p-4">
          <div className="space-y-6">
            {/* Primera línea: Vendedor y Cliente */}
            <div className="grid grid-cols-2 gap-4">
              {/* Vendedor */}
              <div>
                <label className="block text-[var(--text-muted)] text-sm mb-2">Vendedor *</label>
                <select
                  value={ventaForm.vendedor_id}
                  onChange={(e) => setVentaForm({ ...ventaForm, vendedor_id: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-3 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] h-10"
                  required
                >
                  <option value="">Seleccionar Vendedor</option>
                  {vendedores.map((vendedor) => (
                    <option key={vendedor.id} value={vendedor.id}>
                      {vendedor.nombre_usuario} ({vendedor.rol})
                    </option>
                  ))}
                </select>
              </div>

              {/* Cliente */}
              <div>
                <label className="block text-[var(--text-muted)] text-sm mb-2">Cliente *</label>
                <select
                  value={ventaForm.cliente_id}
                  onChange={(e) => setVentaForm({ ...ventaForm, cliente_id: e.target.value })}
                  disabled={!!contactoActual}
                  className={`w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-3 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] h-10 ${contactoActual ? 'opacity-50 cursor-not-allowed' : ''}`}
                  required
                >
                  <option value="">Seleccionar Cliente</option>
                  {contactosOrdenados.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Segunda línea: Organización */}
            <div>
              <label className="block text-[var(--text-muted)] text-sm mb-2">Organización *</label>
              <input
                type="text"
                value={ventaForm.organizacion_id}
                onChange={(e) => setVentaForm({ ...ventaForm, organizacion_id: e.target.value })}
                placeholder="ID de la organización"
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-3 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] h-10"
                required
              />
            </div>

            {/* Segunda línea: Producto */}
            <div>
              <label className="block text-[var(--text-muted)] text-sm mb-2">Producto *</label>
              <select
                value={ventaForm.producto_id}
                onChange={(e) => setVentaForm({ ...ventaForm, producto_id: e.target.value })}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-3 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] h-10"
                required
              >
                <option value="">Seleccionar Producto</option>
                {products.map((producto) => (
                  <option key={producto.id} value={producto.id}>
                    {producto.nombre} - {formatPrice(producto.precio)}
                  </option>
                ))}
              </select>
            </div>

            {/* Tercera línea: Cantidad y Fecha */}
            <div className="grid grid-cols-2 gap-4">
              {/* Cantidad */}
              <div>
                <label className="block text-[var(--text-muted)] text-sm mb-2">Cantidad *</label>
                <input
                  type="number"
                  value={ventaForm.cantidad}
                  onChange={(e) => setVentaForm({ ...ventaForm, cantidad: e.target.value })}
                  placeholder="Cantidad vendida"
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-3 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] h-10"
                  required
                />
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-[var(--text-muted)] text-sm mb-2">Fecha de Venta *</label>
                <input
                  type="date"
                  value={ventaForm.fecha}
                  onChange={(e) => setVentaForm({ ...ventaForm, fecha: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-3 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] h-10"
                  required
                />
              </div>
            </div>

            {/* Cuarta línea: Monto a pagar */}
            <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-primary)] font-medium text-lg">Monto a pagar:</span>
                <span className="text-[var(--accent-primary)] font-bold text-xl">
                  {formatPrice(calcularMontoTotal())}
                </span>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Footer del modal */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t border-[var(--border-primary)]">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveVenta}
            disabled={loading}
            className="px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <span>{loading ? (editingVenta ? 'Actualizando...' : 'Creando...') : (editingVenta ? 'ACTUALIZAR VENTA' : '+ CREAR VENTA')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
