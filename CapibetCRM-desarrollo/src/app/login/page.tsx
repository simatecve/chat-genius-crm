'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { userServices } from '@/services/userServices';
import { LoginCredentials } from '@/app/api/usuarios/domain/usuario';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Pre-llenar email si viene del registro
  useEffect(() => {
    const registeredEmail = localStorage.getItem('registeredEmail');
    if (registeredEmail) {
      setEmail(registeredEmail);
      localStorage.removeItem('registeredEmail');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validación básica
    if (!email || !password) {
      setError('Por favor completa todos los campos');
      return;
    }
    
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor ingresa un email válido');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const credentials: LoginCredentials = {
        correo_electronico: email,
        contrasena: password
      };
      
      const result = await userServices.loginUsuario(credentials);
      
      if (result.success && result.data) {
        const data = result.data;
        
        // Guardar tokens de autenticación
        if (data.access_token) {
          localStorage.setItem('access_token', data.access_token);
        }
        
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }
        
        // Guardar información del usuario
        const userData = {
          id: data.id,
          nombre: data.nombre,
          correo_electronico: data.correo_electronico,
          organizacion_id: data.organizacion_id,
          telefono: data.telefono,
          rol: data.rol,
          codigo_pais: data.codigo_pais
        };
        localStorage.setItem('userData', JSON.stringify(userData));
        
        // Guardar información de la organización (si existe)
        if (data.organizacion) {
          const organizationData = {
            id: data.organizacion.id,
            nombre: data.organizacion.nombre,
            logo: data.organizacion.logo,
            web: data.organizacion.website
          };
          localStorage.setItem('organizationData', JSON.stringify(organizationData));
        }
        
        console.log('Login exitoso:', {
          usuario: userData.nombre,
          rol: userData.rol,
          organizacion: data.organizacion?.nombre || 'Sin organización'
        });
        
        // Notificar que el login fue exitoso para activar WebSocket
        window.dispatchEvent(new CustomEvent('userLoggedIn', {
          detail: { user: userData, organization: data.organizacion }
        }));
        
        // Redireccionar según el rol del usuario
        if (userData.rol === 'Cliente') {
          router.push('/cliente');
        } else {
          router.push('/dashboard');
        }
        
      } else {
        setError(result.error || 'Email o contraseña incorrectos');
      }
      
    } catch (error) {
      console.error('Login error:', error);
      setError('Error de conexión. Verifica tu internet e inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1d23] flex flex-col lg:flex-row">
      {/* Mobile Logo - Only visible on small screens */}
      <div className="lg:hidden flex justify-center py-8 px-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center shadow-lg mb-4 overflow-hidden">
            <img 
              src="https://pbs.twimg.com/profile_images/1118644090420322304/5SFmHCl-_400x400.jpg" 
              alt="CAPIBET Logo"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <h1 className="text-white text-2xl font-bold">CAPIBET</h1>
          <div className="flex items-center justify-center gap-2 mt-1">
            <div className="h-0.5 w-8 bg-[#F29A1F]"></div>
            <span className="text-[#F29A1F] text-sm font-medium tracking-wider">CRM</span>
            <div className="h-0.5 w-8 bg-[#F29A1F]"></div>
          </div>
        </div>
      </div>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-6 lg:p-8">
        <div className="w-full max-w-md">
          <h1 className="text-white text-2xl lg:text-3xl font-semibold mb-6 lg:mb-8 text-center lg:text-left">Iniciar sesión</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full pl-10 pr-4 py-4 bg-[#2a2d35] border border-[#3a3d45] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-[#F29A1F] text-base"
                required
              />
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="w-full pl-10 pr-12 py-4 bg-[#2a2d35] border border-[#3a3d45] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:border-[#F29A1F] text-base"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-slate-600/30 rounded-r-lg transition-colors duration-200 cursor-pointer"
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

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#F29A1F] hover:bg-[#F29A1F] disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#F29A1F] focus:ring-offset-2 focus:ring-offset-[#1a1d23] text-base cursor-pointer"
            >
              {isLoading ? 'Iniciando sesión...' : 'INICIAR SESIÓN'}
            </button>
          </form>

          {/* Register Link */}
          <p className="mt-6 text-center text-gray-400">
            ¿No tienes una cuenta?{' '}
            <Link href="/register" className="text-[#F29A1F] hover:text-[#F29A1F] font-medium">
              Regístrate
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Beast CRM Logo */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-[#F29A1F] via-[#F29A1F] to-[#1e2b2c] relative overflow-hidden">
        <div className="text-center z-10">
          <div className="mb-8">
            {/* Beast Logo Circle */}
            <div className="w-32 h-32 mx-auto rounded-full flex items-center justify-centershadow-2xl overflow-hidden">
              <img 
                src="https://pbs.twimg.com/profile_images/1118644090420322304/5SFmHCl-_400x400.jpg" 
                alt="CAPIBET Logo"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
          </div>
          <h1 className="text-white text-6xl font-bold mb-2">CAPIBET</h1>
          <div className="flex items-center justify-center gap-4">
            <div className="h-1 w-16 bg-white/50"></div>
            <span className="text-white text-xl font-medium tracking-wider">CRM</span>
            <div className="h-1 w-16 bg-white/50"></div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-32 h-32 border border-white/20 rounded-full"></div>
          <div className="absolute bottom-20 right-20 w-48 h-48 border border-white/20 rounded-full"></div>
          <div className="absolute top-1/2 left-10 w-24 h-24 border border-white/20 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}