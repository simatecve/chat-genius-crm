'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Package, Edit2, Trash2 } from 'lucide-react';
import { isUserAuthenticated } from '@/utils/auth';
import { ventasServices, VentaResponse } from '@/services/ventasServices';
import { productosServices, ProductData, ProductResponse } from '@/services/productosServices';
import { userServices } from '@/services/userServices';
import { UsuarioResponse } from '@/app/api/usuarios/domain/usuario';
import { contactoServices, ContactResponse } from '@/services/contactoServices';
import VentaModal from '../chats/components/VentaModal';

// Tipos para productos (adaptado para la UI)
interface Product {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  organizacion_id: string;
  fechaCreacion: string;
}

// Tipos para ventas (adaptado para la UI)
interface Sale {
  id: string;
  producto_id: string;
  cliente_id: string;
  cantidad: number;
  fecha: string;
  vendedor_id: string;
  organizacion_id: string;
  created_at: string;
}


// Función para convertir ProductResponse a Product
const convertProductResponseToProduct = (producto: ProductResponse): Product => {
  return {
    id: producto.id,
    nombre: producto.nombre,
    descripcion: producto.descripcion || '',
    precio: producto.precio,
    stock: producto.stock,
    organizacion_id: producto.organizacion_id,
    fechaCreacion: producto.created_at
  };
};

// Función para convertir VentaResponse a Sale
const convertVentaResponseToSale = (venta: VentaResponse): Sale => {
  return {
    id: venta.id,
    producto_id: venta.producto_id,
    cliente_id: venta.cliente_id,
    cantidad: venta.cantidad,
    fecha: venta.fecha,
    vendedor_id: venta.vendedor_id,
    organizacion_id: venta.organizacion_id,
    created_at: venta.created_at
  };
};


export default function VentasPage() {
  const [activeTab, setActiveTab] = useState<'ventas' | 'productos'>('ventas');
  const [products, setProducts] = useState<Product[]>([]);
  const [ventas, setVentas] = useState<Sale[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([]);
  const [contactos, setContactos] = useState<ContactResponse[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteVentaModal, setShowDeleteVentaModal] = useState(false);
  const [editingVenta, setEditingVenta] = useState<Sale | null>(null);
  const [ventaToDelete, setVentaToDelete] = useState<Sale | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Form state para producto
  const [productForm, setProductForm] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    stock: ''
  });


  // Cargar productos desde la API del proyecto
  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await productosServices.getAllProductos();
      if (response.success && response.data) {
        const convertedProducts = response.data.map(convertProductResponseToProduct);
        setProducts(convertedProducts);
      } else {
        setError(response.error || 'Error al cargar productos');
      }
    } catch (err) {
      setError('Error de conexión al cargar productos');
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar ventas desde la API del proyecto
  const loadVentas = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ventasServices.getAllVentas();
      if (response.success && response.data) {
        const convertedVentas = response.data.map(convertVentaResponseToSale);
        setVentas(convertedVentas);
      } else {
        setError(response.error || 'Error al cargar ventas');
      }
    } catch (err) {
      setError('Error de conexión al cargar ventas');
      console.error('Error loading ventas:', err);
    } finally {
      setLoading(false);
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

  useEffect(() => {
    if (!isUserAuthenticated()) {
      router.push('/login');
      return;
    }
    
    loadProducts();
    loadVentas();
    loadUsuarios();
    loadContactos();
  }, [router]);

  // Filtrar productos
  const filteredProducts = products.filter(product =>
    product.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.descripcion.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filtrar ventas
  const filteredVentas = ventas.filter(venta => {
    const producto = products.find(p => p.id === venta.producto_id);
    const cliente = contactos.find(c => c.id === venta.cliente_id);
    return (
      (producto?.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (cliente?.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      venta.cantidad.toString().includes(searchQuery) ||
      venta.fecha.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });


  const openNewVentaModal = () => {
    setEditingVenta(null);
    setShowSaleModal(true);
  };

  const openNewProductModal = () => {
    setEditingProduct(null);
    setProductForm({
      nombre: '',
      descripcion: '',
      precio: '',
      stock: ''
    });
    setShowProductModal(true);
  };

  const openEditProductModal = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      nombre: product.nombre,
      descripcion: product.descripcion,
      precio: product.precio.toString(),
      stock: product.stock.toString()
    });
    setShowProductModal(true);
  };

  const handleEditVenta = (venta: Sale) => {
    setEditingVenta(venta);
    setShowSaleModal(true);
  };

  const handleDeleteVenta = (venta: Sale) => {
    setVentaToDelete(venta);
    setShowDeleteVentaModal(true);
  };

  const confirmDeleteVenta = async () => {
    if (!ventaToDelete) return;

    setLoading(true);
    setError(null);

    try {
      const response = await ventasServices.deleteVenta(ventaToDelete.id);
      if (response.success) {
        await loadVentas();
        setShowDeleteVentaModal(false);
        setVentaToDelete(null);
      } else {
        setError(response.error || 'Error al eliminar venta');
      }
    } catch (err) {
      setError('Error de conexión al eliminar venta');
      console.error('Error deleting venta:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVentaSaved = () => {
    loadVentas();
    setShowSaleModal(false);
    setEditingVenta(null);
  };

  const handleSaveProduct = async () => {
    if (!productForm.nombre || !productForm.precio) {
      alert('Por favor completa los campos requeridos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const productData: ProductData = {
        nombre: productForm.nombre,
        descripcion: productForm.descripcion,
        precio: parseFloat(productForm.precio),
        stock: parseInt(productForm.stock) || 0
      };

      let response;
      if (editingProduct) {
        response = await productosServices.updateProducto({ ...productData, id: editingProduct.id });
      } else {
        response = await productosServices.createProducto(productData);
      }

      if (response.success) {
        await loadProducts();
        setShowProductModal(false);
        setProductForm({
          nombre: '',
          descripcion: '',
          precio: '',
          stock: ''
        });
        setEditingProduct(null);
      } else {
        setError(response.error || 'Error al guardar producto');
      }
    } catch (err) {
      setError('Error de conexión al guardar producto');
      console.error('Error saving product:', err);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (product: Product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    setLoading(true);
    setError(null);
    
    try {
      const response = await productosServices.deleteProducto(productToDelete.id);
      if (response.success) {
        await loadProducts();
        setShowDeleteModal(false);
        setProductToDelete(null);
      } else {
        setError(response.error || 'Error al eliminar producto');
      }
    } catch (err) {
      setError('Error de conexión al eliminar producto');
      console.error('Error deleting product:', err);
    } finally {
      setLoading(false);
    }
  };


  const formatPrice = (price: number) => {
    return `$${price.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES');
    } catch {
      return '-';
    }
  };


  const getProductoNombre = (productoId: string) => {
    const producto = products.find(p => p.id === productoId);
    return producto ? producto.nombre : `Producto #${productoId}`;
  };

  const getClienteNombre = (clienteId: string) => {
    const cliente = contactos.find(contacto => contacto.id === clienteId);
    return cliente ? cliente.nombre : `Cliente #${clienteId}`;
  };

  const getVendedorNombre = (vendedorId: string) => {
    const vendedor = usuarios.find(user => user.id === vendedorId);
    return vendedor ? vendedor.nombre : `Vendedor #${vendedorId}`;
  };


  return (
    <div className="flex-1 flex flex-col">
      {/* Header de Ventas */}
      <div className="bg-[var(--bg-primary)] border-b border-[var(--border-primary)] px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center space-x-4">
            <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-[var(--text-primary)] font-semibold text-2xl">Ventas</h1>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Espacio vacío para mantener el layout */}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-[var(--bg-primary)] border-b border-[var(--border-primary)] px-6">
        <div className="flex items-center space-x-8">
          <button
            onClick={() => setActiveTab('ventas')}
            className={`flex items-center space-x-2 py-3 border-b-2 transition-colors ${
              activeTab === 'ventas'
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="font-medium">Ventas</span>
          </button>

          <button
            onClick={() => setActiveTab('productos')}
            className={`flex items-center space-x-2 py-3 border-b-2 transition-colors ${
              activeTab === 'productos'
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="font-medium">Productos</span>
            <span className="bg-[var(--bg-secondary)] text-[var(--text-primary)] px-2 py-0.5 rounded text-xs">
              {products.length}
            </span>
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 bg-[var(--bg-primary)] p-6">
        {/* Sección de Ventas */}
        {activeTab === 'ventas' && (
          <div>
            {/* Header de sección */}
            <div className="mb-6">
              <h2 className="text-[var(--text-primary)] font-semibold text-xl mb-2">Lista de Ventas</h2>
              <p className="text-[var(--text-muted)] text-sm">Gestiona todas tus ventas realizadas</p>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={openNewVentaModal}
                  className="flex items-center space-x-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Nueva Venta</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar ventas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-3 py-2 pl-9 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] w-64"
                />
                <svg className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Lista de ventas */}
            <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="text-[var(--text-muted)] mb-4">Cargando ventas...</div>
                </div>
              ) : filteredVentas.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-[var(--text-muted)] text-lg mb-2">No hay ventas registradas</div>
                  <div className="text-[var(--text-muted)] text-sm">Comienza creando tu primera venta</div>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-primary)]">
                  {/* Header de tabla */}
                  <div className="grid grid-cols-6 gap-4 p-4 text-[var(--text-muted)] text-sm font-medium">
                    <div>Producto</div>
                    <div>Cliente</div>
                    <div>Cantidad</div>
                    <div>Vendedor</div>
                    <div>Fecha</div>
                    <div>Acciones</div>
                  </div>
                  
                  {/* Ventas */}
                  {filteredVentas.map((venta) => (
                    <div key={venta.id} className="grid grid-cols-6 gap-4 p-4 hover:bg-[var(--bg-tertiary)] transition-colors">
                      <div className="text-[var(--text-primary)] font-medium">{getProductoNombre(venta.producto_id)}</div>
                      <div className="text-[var(--text-secondary)]">{getClienteNombre(venta.cliente_id)}</div>
                      <div className="text-[var(--text-primary)] font-medium">{venta.cantidad}</div>
                      <div className="text-[var(--text-secondary)]">{getVendedorNombre(venta.vendedor_id)}</div>
                      <div className="text-[var(--text-secondary)] text-sm">
                        {formatDate(venta.fecha)}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditVenta(venta)}
                          className="text-[var(--accent-primary)] hover:text-[var(--accent-hover)] p-1 rounded transition-colors"
                          title="Editar venta"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteVenta(venta)}
                          className="text-red-400 hover:text-red-300 p-1 rounded transition-colors"
                          title="Eliminar venta"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sección de Productos */}
        {activeTab === 'productos' && (
          <div>
            {/* Header de sección */}
            <div className="mb-6">
              <div>
                <h2 className="text-[var(--text-primary)] font-semibold text-xl mb-2">Productos ({products.length})</h2>
                <p className="text-[var(--text-muted)] text-sm">Crear, editar y eliminar sus productos.</p>
              </div>
            </div>

            {/* Barra de acciones */}
            <div className="flex items-center justify-between mb-6">
              <button 
                onClick={openNewProductModal}
                className="flex items-center space-x-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                <span>+ Nuevo Producto</span>
              </button>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-3 py-2 pl-9 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] w-64"
                />
                <svg className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Tabla de productos */}
            <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
              {/* Header de tabla */}
              <div className="grid grid-cols-5 gap-4 p-4 border-b border-[var(--border-primary)] text-[var(--text-muted)] text-sm font-medium">
                <div>Nombre</div>
                <div>Descripción</div>
                <div>Stock</div>
                <div>Precio</div>
                <div>Acciones</div>
              </div>

              {/* Contenido de tabla */}
              {loading ? (
                <div className="p-12 text-center">
                  <div className="text-[var(--text-muted)] mb-4">Cargando productos...</div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-[var(--text-muted)] text-lg text-center mb-4">No hay productos disponibles</div>
                  <div className="flex items-center justify-between text-[var(--text-muted)] text-sm">
                    <div className="flex items-center space-x-2">
                      <span>Items per page:</span>
                      <select className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-2 py-1">
                        <option>10</option>
                      </select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>0-0 of 0</span>
                      <div className="flex space-x-1">
                        <button className="p-1 text-[var(--text-muted)]">⟨⟨</button>
                        <button className="p-1 text-[var(--text-muted)]">⟨</button>
                        <button className="p-1 text-[var(--text-muted)]">⟩</button>
                        <button className="p-1 text-[var(--text-muted)]">⟩⟩</button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-primary)]">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="grid grid-cols-5 gap-4 p-4 hover:bg-[var(--bg-tertiary)] transition-colors">
                      <div className="text-[var(--text-primary)] font-medium">{product.nombre}</div>
                      <div className="text-[var(--text-secondary)] text-sm truncate">{product.descripcion || '-'}</div>
                      <div className="text-[var(--text-secondary)] text-sm">
                        {product.stock}
                      </div>
                      <div className="text-[var(--text-primary)] font-medium">{formatPrice(product.precio)}</div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openEditProductModal(product)}
                          disabled={loading}
                          className="text-[var(--text-muted)] hover:text-blue-400 text-sm transition-colors disabled:opacity-50"
                          title="Editar producto"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(product)}
                          disabled={loading}
                          className="text-[var(--text-muted)] hover:text-red-400 text-sm transition-colors disabled:opacity-50"
                          title="Eliminar producto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Crear/Editar Producto */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] w-full max-w-2xl mx-4">
            {/* Header del modal */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
              <h3 className="text-[var(--text-primary)] font-semibold">
                {editingProduct ? 'Editar Producto' : 'Crear Producto'}
              </h3>
              <button 
                onClick={() => setShowProductModal(false)}
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
                {/* Campos principales en 2 columnas */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Columna izquierda */}
                  <div className="space-y-4">
                    {/* Nombre */}
                    <div>
                      <label className="block text-[var(--text-muted)] text-sm mb-2">Nombre</label>
                      <input
                        type="text"
                        value={productForm.nombre}
                        onChange={(e) => setProductForm({ ...productForm, nombre: e.target.value })}
                        placeholder="Nombre del producto"
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                      />
                    </div>

                    {/* Precio */}
                    <div>
                      <label className="block text-[var(--text-muted)] text-sm mb-2">Precio</label>
                      <input
                        type="number"
                        step="0.01"
                        value={productForm.precio}
                        onChange={(e) => setProductForm({ ...productForm, precio: e.target.value })}
                        placeholder="Precio en ARS"
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                      />
                    </div>
                  </div>

                  {/* Columna derecha */}
                  <div className="space-y-4">
                    {/* Stock */}
                    <div>
                      <label className="block text-[var(--text-muted)] text-sm mb-2">Stock</label>
                      <input
                        type="number"
                        value={productForm.stock}
                        onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                        placeholder="Cantidad disponible"
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                      />
                    </div>
                  </div>
                </div>

                {/* Descripción - ancho completo */}
                <div>
                  <label className="block text-[var(--text-muted)] text-sm mb-2">Descripción</label>
                  <textarea
                    value={productForm.descripcion}
                    onChange={(e) => setProductForm({ ...productForm, descripcion: e.target.value })}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] resize-none"
                    rows={3}
                    placeholder="Descripción del producto"
                  />
                </div>
              </div>
            </div>

            {/* Footer del modal */}
            <div className="flex items-center justify-end space-x-3 p-4 border-t border-[var(--border-primary)]">
              <button
                onClick={() => setShowProductModal(false)}
                disabled={loading}
                className="px-4 py-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProduct}
                disabled={loading}
                className="px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{loading ? 'Guardando...' : (editingProduct ? 'ACTUALIZAR PRODUCTO' : '+ CREAR PRODUCTO')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteModal && productToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] w-full max-w-md mx-4">
            {/* Header del modal */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
              <h3 className="text-[var(--text-primary)] font-semibold">
                Confirmar Eliminación
              </h3>
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-4">
              <p className="text-[var(--text-primary)] mb-4">
                ¿Estás seguro de que quieres eliminar el producto <strong>&quot;{productToDelete.nombre}&quot;</strong>?
              </p>
              <p className="text-[var(--text-muted)] text-sm">
                Esta acción no se puede deshacer.
              </p>
            </div>

            {/* Footer del modal */}
            <div className="flex items-center justify-end space-x-3 p-4 border-t border-[var(--border-primary)]">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={loading}
                className="px-4 py-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteProduct}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{loading ? 'Eliminando...' : 'Eliminar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nueva Venta */}
      <VentaModal
        isOpen={showSaleModal}
        onClose={() => setShowSaleModal(false)}
        editingVenta={editingVenta}
        onSave={handleVentaSaved}
      />

      {/* Modal Confirmar Eliminación de Venta */}
      {showDeleteVentaModal && ventaToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[var(--text-primary)] font-semibold">Confirmar Eliminación</h3>
                  <p className="text-[var(--text-muted)] text-sm">Esta acción no se puede deshacer</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-[var(--text-secondary)] mb-2">
                  ¿Estás seguro de que deseas eliminar esta venta?
                </p>
                <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-[var(--text-muted)]">Producto:</span>
                    <span className="text-[var(--text-secondary)]">{getProductoNombre(ventaToDelete.producto_id)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[var(--text-muted)]">Cliente:</span>
                    <span className="text-[var(--text-secondary)]">{getClienteNombre(ventaToDelete.cliente_id)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[var(--text-muted)]">Cantidad:</span>
                    <span className="text-[var(--text-secondary)]">{ventaToDelete.cantidad}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Fecha:</span>
                    <span className="text-[var(--text-secondary)]">{formatDate(ventaToDelete.fecha)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteVentaModal(false)}
                  className="flex-1 px-4 py-2 text-[var(--text-secondary)] border border-[var(--border-primary)] rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteVenta}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white rounded transition-colors"
                >
                  {loading ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
