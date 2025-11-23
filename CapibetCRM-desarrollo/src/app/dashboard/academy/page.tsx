'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isUserAuthenticated } from '@/utils/auth';

interface ModuleProgress {
  id: string;
  name: string;
  description: string;
  progress: number;
  status: 'completed' | 'in-progress' | 'not-started';
  icon: string;
  color: string;
}

const modules: ModuleProgress[] = [
  {
    id: 'dashboard',
    name: 'Módulo de Dashboard',
    description: 'Panel principal con métricas y resumen del sistema',
    progress: 50,
    status: 'in-progress',
    icon: '🏠',
    color: 'bg-cyan-500'
  },
  {
    id: 'embudos',
    name: 'Módulo de Embudos',
    description: 'Automatización de procesos de venta y marketing',
    progress: 90,
    status: 'in-progress',
    icon: '🔽',
    color: 'bg-purple-500'
  },
  {
    id: 'chats',
    name: 'Módulo de Chats',
    description: 'Sistema de comunicación interna y externa',
    progress: 70,
    status: 'in-progress',
    icon: '💬',
    color: 'bg-orange-500'
  },
  {
    id: 'chat-interno',
    name: 'Módulo de Chat Interno',
    description: 'Sistema de comunicación interna del equipo',
    progress: 100,
    status: 'completed',
    icon: '💭',
    color: 'bg-teal-500'
  },
  {
    id: 'emails',
    name: 'Módulo de Emails',
    description: 'Gestión de campañas de email marketing',
    progress: 70,
    status: 'in-progress',
    icon: '✉️',
    color: 'bg-red-500'
  },
  {
    id: 'calendario',
    name: 'Módulo de Calendario',
    description: 'Planificación y gestión de eventos',
    progress: 50,
    status: 'in-progress',
    icon: '📅',
    color: 'bg-indigo-500'
  },
  {
    id: 'contactos',
    name: 'Módulo de Contactos',
    description: 'Gestión de clientes y base de datos de contactos',
    progress: 100,
    status: 'completed',
    icon: '👥',
    color: 'bg-blue-500'
  },
  {
    id: 'ventas',
    name: 'Módulo de Ventas',
    description: 'Sistema completo de gestión de ventas de fichas digitales',
    progress: 100,
    status: 'completed',
    icon: '🛒',
    color: 'bg-green-500'
  },
  {
    id: 'envios-masivos',
    name: 'Módulo de Envíos Masivos',
    description: 'Campañas de comunicación masiva',
    progress: 0,
    status: 'in-progress',
    icon: '📤',
    color: 'bg-pink-500'
  },
  {
    id: 'configuracion',
    name: 'Módulo de Configuración',
    description: 'Administración y configuración del sistema',
    progress: 65,
    status: 'in-progress',
    icon: '⚙️',
    color: 'bg-gray-500'
  },
  {
    id: 'notificaciones',
    name: 'Módulo de Notificaciones',
    description: 'Sistema de alertas y notificaciones en tiempo real',
    progress: 20,
    status: 'in-progress',
    icon: '🔔',
    color: 'bg-yellow-500'
  }
];

export default function AcademyPage() {
  const router = useRouter();
  const [isModulesExpanded, setIsModulesExpanded] = useState(false);

  // Verificar autenticación
  if (!isUserAuthenticated()) {
    router.push('/login');
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'in-progress':
        return 'text-yellow-400';
      case 'not-started':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'in-progress':
        return 'En Progreso';
      case 'not-started':
        return 'No Iniciado';
      default:
        return 'Desconocido';
    }
  };

  const getOverallProgress = () => {
    return 75; // Progreso general fijo al 52%
  };


  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-[var(--bg-primary)] border-b border-[var(--border-primary)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[var(--text-primary)] font-semibold text-2xl">CAPIBET Academy</h1>
            <p className="text-[var(--text-muted)] text-sm mt-1">Seguimiento del progreso de implementación de módulos</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-[var(--bg-primary)] p-6">
        {/* Resumen General */}
        <div className="mb-8">
          <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[var(--text-muted)] text-lg mb-2">Progreso General del Sistema</p>
                <p className="text-[var(--text-primary)] text-4xl font-bold">{getOverallProgress()}%</p>
                <p className="text-[var(--text-muted)] text-sm mt-2">Avance total de implementación de módulos</p>
              </div>
              <div className="w-20 h-20 bg-[var(--accent-primary)] rounded-full flex items-center justify-center">
                <span className="text-white text-3xl">🎯</span>
              </div>
            </div>
            <div className="mt-6">
              <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-4">
                <div 
                  className="bg-[var(--accent-primary)] h-4 rounded-full transition-all duration-300"
                  style={{ width: `${getOverallProgress()}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Módulos */}
        <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
          <div className="p-6 border-b border-[var(--border-primary)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[var(--text-primary)] text-lg font-semibold">Progreso por Módulo</h2>
                <p className="text-[var(--text-muted)] text-sm mt-1">Detalle del avance de cada módulo del sistema</p>
              </div>
              <button
                onClick={() => setIsModulesExpanded(!isModulesExpanded)}
                className="flex items-center space-x-2 text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition-colors"
              >
                <span className="text-sm font-medium">
                  {isModulesExpanded ? 'Ocultar' : 'Expandir'}
                </span>
                <svg 
                  className={`w-5 h-5 transition-transform duration-200 ${isModulesExpanded ? 'rotate-180' : ''}`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {isModulesExpanded && (
            <div className="p-6">
              <div className="space-y-6">
                {modules.map((module) => (
                  <div key={module.id} className="flex items-center space-x-4 p-4 bg-[var(--bg-tertiary)] rounded-lg">
                    {/* Icono del módulo */}
                    <div className={`w-16 h-16 ${module.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white text-2xl">{module.icon}</span>
                    </div>

                    {/* Información del módulo */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[var(--text-primary)] font-semibold text-lg">{module.name}</h3>
                        <div className="flex items-center space-x-3">
                          <span className={`text-sm font-medium ${getStatusColor(module.status)}`}>
                            {getStatusText(module.status)}
                          </span>
                          <span className="text-[var(--text-primary)] font-bold text-lg">
                            {module.progress}%
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-[var(--text-muted)] text-sm mb-3">{module.description}</p>
                      
                      {/* Barra de progreso */}
                      <div className="w-full bg-[var(--bg-primary)] rounded-full h-3">
                        <div 
                          className={`${module.color} h-3 rounded-full transition-all duration-300`}
                          style={{ width: `${module.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Información adicional */}
        <div className="mt-8 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] p-6">
          <h3 className="text-[var(--text-primary)] font-semibold text-lg mb-4">Información del Sistema</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-[var(--text-primary)] font-medium mb-2">Estado Actual</h4>
              <p className="text-[var(--text-muted)] text-sm">
                El sistema CAPIBET CRM está en desarrollo activo. Los módulos marcados como &quot;En Progreso&quot; 
                tienen funcionalidades básicas implementadas y están siendo mejorados continuamente.
              </p>
            </div>
            <div>
              <h4 className="text-[var(--text-primary)] font-medium mb-2">Próximos Pasos</h4>
              <p className="text-[var(--text-muted)] text-sm">
                Se están desarrollando los módulos pendientes según las prioridades del negocio. 
                Cada módulo se completa con funcionalidades avanzadas y optimizaciones de rendimiento.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
