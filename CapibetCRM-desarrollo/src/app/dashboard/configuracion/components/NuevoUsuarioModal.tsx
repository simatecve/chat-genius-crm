'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { userServices } from '@/services/userServices';
import { UsuarioData } from '@/app/api/usuarios/domain/usuario';
import { Plus } from 'lucide-react';

interface NuevoUsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void; // Callback para refrescar la tabla
}

export default function NuevoUsuarioModal({ isOpen, onClose, onUserCreated }: NuevoUsuarioModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    rol: 'admin'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  // Países de América del Norte y del Sur (mismo que en registro)
  const americanCountries = [
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
  ];

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        rol: 'admin'
      });
      setError('');
      setSuccess('');
      setIsLoading(false);
    }
  }, [isOpen]);

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
    
    // Validaciones básicas
    if (!formData.name || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword || !formData.rol) {
      setError('Por favor completa todos los campos');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Por favor ingresa un email válido');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Verificar si el email ya existe
      const emailCheck = await userServices.checkEmailExists(formData.email);
      
      if (emailCheck.success && emailCheck.data) {
        setError('Este email ya está registrado');
        setIsLoading(false);
        return;
      }
      
      // Preparar datos para la API (usar endpoint de register)
      const userData = {
        correo_electronico: formData.email,
        contrasena: formData.password,
        nombre: formData.name,
        telefono: formData.phone,
        codigo_pais: selectedCountry.code.replace('+', ''),
        rol: formData.rol
      };
      
      // Crear usuario en Supabase mediante el endpoint de registro
      const result = await userServices.registerExternalUser(userData);
      
      if (result.success) {
        setSuccess('¡Usuario creado exitosamente!');
        
        // Esperar un momento y cerrar modal
        setTimeout(() => {
          onUserCreated(); // Refrescar la tabla
          onClose(); // Cerrar modal
        }, 1500);
        
      } else {
        setError(result.error || 'Error al crear el usuario. Inténtalo de nuevo.');
      }
      
    } catch (error) {
      console.error('Error creating user:', error);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-[#1a1d23] rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#3a3d45]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#F29A1F] rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm"><Plus className="w-4 h-4" /></span>
            </div>
            <div>
              <h2 className="text-white text-lg font-semibold">Nuevo Usuario</h2>
              <p className="text-gray-400 text-sm">
                Datos del usuario
              </p>
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
              {/* Step 2: User Details */}
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

              {/* Rol Select */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Rol</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <select
                    name="rol"
                    value={formData.rol}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-[#2a2d35] border border-[#3a3d45] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-[#F29A1F] text-sm appearance-none cursor-pointer"
                    required
                  >
                    <option value="Admin">Admin</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Cliente">Cliente</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Password Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Contraseña"
                  className="w-full pl-10 pr-12 py-3 bg-[#2a2d35] border border-[#3a3d45] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-[#F29A1F] text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <div className="p-1 rounded-full hover:bg-slate-600/50 transition-colors duration-200">
                    <svg className="h-4 w-4 text-gray-400 hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {showPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      )}
                    </svg>
                  </div>
                </button>
              </div>

              {/* Confirm Password Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Repetir contraseña"
                  className="w-full pl-10 pr-12 py-3 bg-[#2a2d35] border border-[#3a3d45] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-[#F29A1F] text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <div className="p-1 rounded-full hover:bg-slate-600/50 transition-colors duration-200">
                    <svg className="h-4 w-4 text-gray-400 hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {showConfirmPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      )}
                    </svg>
                  </div>
                </button>
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
                  {isLoading ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
        </div>
      </div>
    </div>
  );
}
