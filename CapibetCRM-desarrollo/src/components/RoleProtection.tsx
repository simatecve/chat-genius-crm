'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface RoleProtectionProps {
  requiredRoles: string[];
  children: React.ReactNode;
  fallbackPath?: string;
}

export default function RoleProtection({ 
  requiredRoles, 
  children, 
  fallbackPath = '/dashboard' 
}: RoleProtectionProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      // Si no hay usuario logueado, redirigir al login
      if (!user) {
        router.push('/login');
        return;
      }

      // Si el usuario no tiene el rol requerido, redirigir
      if (!requiredRoles.includes(user.rol)) {
        router.push(fallbackPath);
        return;
      }
    }
  }, [user, isLoading, requiredRoles, fallbackPath, router]);

  // Mostrar loading mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1a1d23] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full flex items-center justify-center mb-4 mx-auto animate-pulse overflow-hidden">
            <img 
              src="https://pbs.twimg.com/profile_images/1118644090420322304/5SFmHCl-_400x400.jpg" 
              alt="CAPIBET Logo"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <p className="text-gray-400">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario, no mostrar contenido (se redirigirá)
  if (!user) {
    return null;
  }

  // Si el usuario no tiene permisos, mostrar mensaje de acceso denegado
  if (!requiredRoles.includes(user.rol)) {
    return (
      <div className="min-h-screen bg-[#1a1d23] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6 mx-auto">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-white text-2xl font-bold mb-4">Acceso Denegado</h1>
          <p className="text-gray-400 mb-6">
            No tienes permisos para acceder a esta sección. Esta área está restringida a usuarios con rol: {requiredRoles.join(', ')}.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            Tu rol actual: <span className="text-[#F29A1F] font-medium">{user.rol}</span>
          </p>
          <button
            onClick={() => router.push(fallbackPath)}
            className="bg-[#F29A1F] hover:bg-[#F29A1F] text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Si el usuario tiene permisos, mostrar el contenido
  return <>{children}</>;
}
