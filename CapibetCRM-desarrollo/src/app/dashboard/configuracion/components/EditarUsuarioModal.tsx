'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import { Edit2 } from 'lucide-react';
import { userServices } from '@/services/userServices';
import { UsuarioResponse, UsuarioData } from '@/app/api/usuarios/domain/usuario';

interface EditarUsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
  usuario: UsuarioResponse | null;
}

export default function EditarUsuarioModal({ isOpen, onClose, onUserUpdated, usuario }: EditarUsuarioModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    rol: ''
  });
  const [selectedCountry, setSelectedCountry] = useState({
    code: '+54',
    country: 'Argentina',
    countryCode: 'ar',
    flag: 'https://flagcdn.com/w20/ar.png'
  });
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Países de América del Norte y del Sur
  const americanCountries = useMemo(() => [
    { code: '+1', country: 'United States', countryCode: 'us', flag: 'https://flagcdn.com/w20/us.png' },
    { code: '+1', country: 'Canada', countryCode: 'ca', flag: 'https://flagcdn.com/w20/ca.png' },
    { code: '+52', country: 'Mexico', countryCode: 'mx', flag: 'https://flagcdn.com/w20/mx.png' },
    { code: '+54', country: 'Argentina', countryCode: 'ar', flag: 'https://flagcdn.com/w20/ar.png' },
    { code: '+55', country: 'Brazil', countryCode: 'br', flag: 'https://flagcdn.com/w20/br.png' },
    { code: '+56', country: 'Chile', countryCode: 'cl', flag: 'https://flagcdn.com/w20/cl.png' },
    { code: '+57', country: 'Colombia', countryCode: 'co', flag: 'https://flagcdn.com/w20/co.png' },
    { code: '+58', country: 'Venezuela', countryCode: 've', flag: 'https://flagcdn.com/w20/ve.png' },
    { code: '+51', country: 'Peru', countryCode: 'pe', flag: 'https://flagcdn.com/w20/pe.png' },
    { code: '+593', country: 'Ecuador', countryCode: 'ec', flag: 'https://flagcdn.com/w20/ec.png' },
    { code: '+591', country: 'Bolivia', countryCode: 'bo', flag: 'https://flagcdn.com/w20/bo.png' },
    { code: '+595', country: 'Paraguay', countryCode: 'py', flag: 'https://flagcdn.com/w20/py.png' },
    { code: '+598', country: 'Uruguay', countryCode: 'uy', flag: 'https://flagcdn.com/w20/uy.png' },
    { code: '+594', country: 'French Guiana', countryCode: 'gf', flag: 'https://flagcdn.com/w20/gf.png' },
    { code: '+597', country: 'Suriname', countryCode: 'sr', flag: 'https://flagcdn.com/w20/sr.png' },
    { code: '+592', country: 'Guyana', countryCode: 'gy', flag: 'https://flagcdn.com/w20/gy.png' },
    { code: '+502', country: 'Guatemala', countryCode: 'gt', flag: 'https://flagcdn.com/w20/gt.png' },
    { code: '+503', country: 'El Salvador', countryCode: 'sv', flag: 'https://flagcdn.com/w20/sv.png' },
    { code: '+504', country: 'Honduras', countryCode: 'hn', flag: 'https://flagcdn.com/w20/hn.png' },
    { code: '+505', country: 'Nicaragua', countryCode: 'ni', flag: 'https://flagcdn.com/w20/ni.png' },
    { code: '+506', country: 'Costa Rica', countryCode: 'cr', flag: 'https://flagcdn.com/w20/cr.png' },
    { code: '+507', country: 'Panama', countryCode: 'pa', flag: 'https://flagcdn.com/w20/pa.png' },
    { code: '+509', country: 'Haiti', countryCode: 'ht', flag: 'https://flagcdn.com/w20/ht.png' },
    { code: '+1', country: 'Dominican Republic', countryCode: 'do', flag: 'https://flagcdn.com/w20/do.png' },
    { code: '+1', country: 'Jamaica', countryCode: 'jm', flag: 'https://flagcdn.com/w20/jm.png' },
    { code: '+1', country: 'Trinidad and Tobago', countryCode: 'tt', flag: 'https://flagcdn.com/w20/tt.png' },
    { code: '+1', country: 'Barbados', countryCode: 'bb', flag: 'https://flagcdn.com/w20/bb.png' },
    { code: '+1', country: 'Bahamas', countryCode: 'bs', flag: 'https://flagcdn.com/w20/bs.png' }
  ], []);

  // Cargar datos del usuario cuando se abre el modal
  useEffect(() => {
    if (isOpen && usuario) {
      setFormData({
        name: usuario.nombre,
        email: usuario.email || '',
        phone: usuario.telefono || '',
        rol: usuario.rol
      });

      // Encontrar el país correspondiente
      const country = americanCountries.find(c => c.code === `+${usuario.codigo_pais}`);
      if (country) {
        setSelectedCountry(country);
      }

      setError('');
      setSuccess('');
      setIsLoading(false);
    }
  }, [isOpen, usuario, americanCountries]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCountrySelect = (country: typeof selectedCountry) => {
    setSelectedCountry(country);
    setShowCountryDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!usuario) return;
    
    // Validaciones básicas
    if (!formData.name || !formData.email || !formData.phone) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Por favor ingresa un email válido');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Preparar los datos para actualizar
      const dataToUpdate: Partial<UsuarioData> = {
        nombre: formData.name,
        telefono: formData.phone,
        codigo_pais: selectedCountry.code.replace('+', ''),
        rol: formData.rol
      };

      // Llamar al API para actualizar el usuario
      const result = await userServices.updateUsuario(usuario.id!, dataToUpdate);
      
      if (result.success) {
        setSuccess('¡Usuario actualizado exitosamente!');
        
        setTimeout(() => {
          onUserUpdated();
        }, 1500);
      } else {
        setError(result.error || 'Error al actualizar el usuario');
        setIsLoading(false);
        return;
      }
      
    } catch (error) {
      console.error('Error updating user:', error);
      setError('Error de conexión. Verifica tu internet e inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!isOpen || !usuario) return null;

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
              <h2 className="text-white text-lg font-semibold">Editar Usuario</h2>
              <p className="text-gray-400 text-sm">Actualizar información del usuario</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Nombre completo"
                  className="w-full pl-10 pr-4 py-3 bg-[#2a2d35] border border-[#3a3d45] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-[#F29A1F] text-sm"
                  required
                />
              </div>

              {/* Email Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Correo electrónico"
                  className="w-full pl-10 pr-4 py-3 bg-[#2a2d35] border border-[#3a3d45] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-[#F29A1F] text-sm"
                  required
                />
              </div>

              {/* Phone Input */}
              <div className="relative">
                <div className="flex">
                  {/* Country Selector */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                      className="flex items-center space-x-2 px-3 py-3 bg-[#2a2d35] border border-[#3a3d45] border-r-0 rounded-l-lg text-white hover:bg-slate-700/70 focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-[#F29A1F] min-w-[90px]"
                    >
                      <Image 
                        src={selectedCountry.flag} 
                        alt={`${selectedCountry.country} flag`}
                        width={16} 
                        height={12}
                        className="rounded-sm"
                      />
                      <span className="text-xs font-medium">{selectedCountry.code}</span>
                      <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Country Dropdown */}
                    {showCountryDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-64 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                        {americanCountries.map((country, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleCountrySelect(country)}
                            className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-slate-700 text-white text-sm transition-colors duration-150"
                          >
                            <Image 
                              src={country.flag} 
                              alt={`${country.country} flag`}
                              width={16} 
                              height={12}
                              className="rounded-sm"
                            />
                            <span className="text-gray-300 flex-1 text-xs">{country.country}</span>
                            <span className="text-green-400 font-medium text-xs">{country.code}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Phone Number Input */}
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Número de teléfono"
                    className="flex-1 px-4 py-3 bg-[#2a2d35] border border-[#3a3d45] rounded-r-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-[#F29A1F] text-sm"
                    required
                  />
                </div>
              </div>

              {/* Rol Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <select
                  name="rol"
                  value={formData.rol}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 bg-[#2a2d35] border border-[#3a3d45] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-[#F29A1F] text-sm"
                  required
                >
                  <option value="Operador">Operador</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-green-400 text-sm">
                  {success}
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-[#F29A1F] hover:bg-[#F29A1F] disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
          </form>
        </div>
      </div>
    </div>
  );
}
