'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Link, Tag, Users, MessageCircle, Bell } from 'lucide-react';

// Lazy loading de componentes para evitar cargas innecesarias
const EspaciosTrabajoTab = lazy(() => import('./components/EspaciosTrabajoTab'));
const UsuariosTab = lazy(() => import('./components/UsuariosTab'));
const EtiquetasTab = lazy(() => import('./components/EtiquetasTab'));
const RespuestasRapidasTab = lazy(() => import('./components/RespuestasRapidasTab'));
const SesionesTab = lazy(() => import('./components/SesionesTab'));
const NotificacionesTab = lazy(() => import('./components/NotificacionesTab'));
import { isUserAuthenticated, getUserData } from '@/utils/auth';

// Tipos para las pestañas
interface TabConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ComponentType;
}

// Componentes temporales

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState('espacios-trabajo');
  const [userEmail, setUserEmail] = useState('');
  const router = useRouter();

  // Configuración de pestañas
  const tabs: TabConfig[] = [
    { id: 'espacios-trabajo', label: 'Espacios de trabajo', icon: <Building2 className="w-4 h-4" />, component: EspaciosTrabajoTab },
    { id: 'sesiones', label: 'Sesiones', icon: <Link className="w-4 h-4" />, component: SesionesTab },
    { id: 'etiquetas', label: 'Etiquetas', icon: <Tag className="w-4 h-4" />, component: EtiquetasTab },
    { id: 'usuarios', label: 'Usuarios', icon: <Users className="w-4 h-4" />, component: UsuariosTab },
    { id: 'respuestas-rapidas', label: 'Respuestas rápidas', icon: <MessageCircle className="w-4 h-4" />, component: RespuestasRapidasTab },
    { id: 'notificaciones', label: 'Notificaciones', icon: <Bell className="w-4 h-4" />, component: NotificacionesTab },
  ];

  useEffect(() => {
    // Verificar autenticación usando la utilidad centralizada
    if (!isUserAuthenticated()) {
      router.push('/login');
      return;
    }

    // Cargar datos del usuario desde la nueva estructura
    const userData = getUserData();
    if (userData) {
      setUserEmail(userData.correo_electronico || '');
    }
  }, [router]);

  // Función de logout ya no es necesaria aquí
  // El logout se maneja a través del Header component

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-[var(--text-primary)]">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header de Configuración */}
      <div className="bg-[var(--bg-primary)] border-b border-[var(--border-primary)] px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center space-x-4">
            {/* Page Title */}
            <h1 className="text-[var(--text-primary)] font-semibold text-2xl">Configuración</h1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[var(--bg-primary)] border-b border-[var(--border-primary)] px-6 flex-shrink-0">
        <div className="flex space-x-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-4 px-2 border-b-2 transition-colors cursor-pointer ${activeTab === tab.id
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
            >
              <span className="text-sm">{tab.icon}</span>
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-[var(--bg-primary)] p-6 overflow-y-auto min-h-0 scrollbar-thin">
        {/* Renderizar el componente de la pestaña activa con lazy loading */}
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="text-[var(--text-primary)]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)] mx-auto mb-4"></div>
              <p>Cargando {tabs.find(tab => tab.id === activeTab)?.label}...</p>
            </div>
          </div>
        }>
          {(() => {
            const ActiveTabComponent = tabs.find(tab => tab.id === activeTab)?.component;
            if (ActiveTabComponent) {
              return <ActiveTabComponent />;
            }
            return null;
          })()}
        </Suspense>
      </div>
    </div>
  );
}
