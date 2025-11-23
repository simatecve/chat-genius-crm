'use client';

import { SesionResponse } from '@/app/api/sesiones/domain/sesion';
import Image from 'next/image';
// Tipos locales para canales (sin dependencias externas)
type CanalTipo = 'whatsapp' | 'whatsappApi' | 'email' | 'instagram' | 'messenger' | 'telegram' | 'telegramBot' | 'webChat';

interface Canal {
  id: number;
  tipo: CanalTipo;
  descripcion: string;
  usuario_id: number;
  espacio_id: number;
  creado_en?: string;
}

interface CanalOption {
  id: string;
  nombre: string;
  icon: string;
  logoPath: string;
  color: string;
  tipo: Canal['tipo'];
}

const canalOptions: CanalOption[] = [
  { id: 'whatsapp', nombre: 'WhatsApp', icon: '📱', logoPath: '/wpp_logo.svg', color: '#25D366', tipo: 'whatsapp' },
  { id: 'whatsappApi', nombre: 'Whatsapp API', icon: '📱', logoPath: '/wpp_logo.svg', color: '#25D366', tipo: 'whatsappApi' },
  { id: 'instagram', nombre: 'Instagram', icon: '📷', logoPath: '/instagram_logo.svg', color: '#E4405F', tipo: 'instagram' },
  { id: 'messenger', nombre: 'Messenger', icon: '💬', logoPath: '/messenger_logo.svg', color: '#0084FF', tipo: 'messenger' },
  { id: 'telegram', nombre: 'Telegram', icon: '✈️', logoPath: '/telegram_logo.svg', color: '#0088CC', tipo: 'telegram' },
  { id: 'telegramBot', nombre: 'Telegram Bot', icon: '🤖', logoPath: '/telegram_logo.svg', color: '#0088CC', tipo: 'telegramBot' },
  { id: 'webChat', nombre: 'Web Chat', icon: '💬', logoPath: '/chat_logo.svg', color: '#F29A1F', tipo: 'webChat' },
  { id: 'email', nombre: 'Email', icon: '✉️', logoPath: '/email_logo.svg', color: '#EA4335', tipo: 'email' },
];

interface Contacto {
  id: number;
  nombre: string;
  apellido?: string;
  nombre_completo?: string;
}

interface Embudo {
  id: number;
  nombre: string;
}

interface SesionesListProps {
  sesiones: SesionResponse[];
  canales: Canal[];
  contactos?: Contacto[];
  embudos?: Embudo[];
  onEditSesion?: (sesion: SesionResponse) => void;
  onDeleteSesion?: (sesionId: string) => void;
  onToggleStatus?: (sesionId: string, estado: 'activo' | 'desconectado' | 'expirado') => void;
}

export default function SesionesList({ 
  sesiones, 
  canales,
  contactos = [],
  embudos = [],
  onEditSesion, 
  onDeleteSesion, 
  onToggleStatus 
}: SesionesListProps) {

  const getCanalLogo = (tipo: Canal['tipo']) => {
    const option = canalOptions.find(opt => opt.tipo === tipo);
    return option?.logoPath || '/wpp_logo.svg';
  };

  const getCanalDisplayName = (tipo: string) => {
    const typeMap: { [key: string]: string } = {
      'whatsapp': 'WhatsApp',
      'whatsappApi': 'WhatsApp API',
      'whatsapp_qr': 'WhatsApp QR',
      'whatsapp-api': 'WhatsApp API',
      'instagram': 'Instagram',
      'messenger': 'Messenger',
      'telegram': 'Telegram',
      'telegramBot': 'Telegram Bot',
      'telegram-bot': 'Telegram Bot',
      'webChat': 'Web Chat',
      'web-chat': 'Web Chat',
      'email': 'Email'
    };
    
    return typeMap[tipo] || tipo.charAt(0).toUpperCase() + tipo.slice(1);
  };

  const getContactoName = (contactoId: string) => {
    const contacto = contactos.find(c => String(c.id) === contactoId);
    if (contacto) {
      return contacto.nombre_completo || `${contacto.nombre} ${contacto.apellido || ''}`.trim();
    }
    return `Contacto ${contactoId}`;
  };

  const getEmbudoName = (embudoId: string) => {
    const embudo = embudos.find(e => String(e.id) === embudoId);
    return embudo ? embudo.nombre : `Embudo ${embudoId}`;
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (sesiones.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">🔗</div>
        <h3 className="text-white text-lg font-medium mb-2">No hay sesiones configuradas</h3>
        <p className="text-gray-400 mb-4">Crea tu primera sesión para comenzar a gestionar tus canales</p>
        <div className="bg-[#1a1d23] rounded-lg p-4 max-w-md mx-auto">
          <div className="text-gray-500 text-sm">
            <p>• Conecta WhatsApp, Instagram, Telegram y más</p>
            <p>• Gestiona múltiples cuentas desde un solo lugar</p>
            <p>• Automatiza respuestas y flujos de trabajo</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1a1d23] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Sesiones</p>
              <p className="text-white text-2xl font-bold">{sesiones.length}</p>
            </div>
            <div className="text-2xl">🔗</div>
          </div>
        </div>
        
        <div className="bg-[#1a1d23] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Sesiones Activas</p>
              <p className="text-white text-2xl font-bold">
                {sesiones.filter(s => s.estado === 'activo').length}
              </p>
            </div>
            <div className="text-2xl text-green-500">✅</div>
          </div>
        </div>
        
        <div className="bg-[#1a1d23] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Tipos Únicos</p>
              <p className="text-white text-2xl font-bold">
                {new Set(sesiones.map(s => s.type).filter(type => type !== undefined)).size}
              </p>
            </div>
            <div className="text-2xl">📱</div>
          </div>
        </div>
      </div>

      {/* Lista de sesiones */}
      <div className="space-y-3">
        {sesiones.map((sesion) => (
          <div
            key={sesion.id}
            className={`
              bg-[#1a1d23] rounded-lg p-4 pl-10 transition-all duration-200 hover:bg-[#111318]`}
          >
            <div className="flex items-center justify-between">
              {/* Información principal */}
              <div className="flex items-center space-x-4 flex-1">
                {/* Icono del canal */}
                <div 
                  className="w-10 h-10 flex items-center justify-center"
                >
                  <Image
                    src={getCanalLogo((sesion.type as Canal['tipo']) || 'whatsapp')}
                    alt={`${sesion.type} logo`}
                    width={75}
                    height={75}
                    className="w-full h-full object-contain"
                  />
                </div>
                
                {/* Detalles de la sesión */}
                <div className="flex-1 ml-2">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-white font-medium">{sesion.nombre}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      sesion.estado === 'activo'
                        ? 'bg-green-100 text-green-800' 
                        : sesion.estado === 'desconectado'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {sesion.estado.charAt(0).toUpperCase() + sesion.estado.slice(1)}
                    </span>
                  </div>
                  
                   <div className="text-gray-400 text-sm space-y-1">
                     <p>Tipo: <span className="text-white">{getCanalDisplayName(sesion.type || 'whatsapp')}</span></p>
                     <p>Usuario: <span className="text-white">{getContactoName(sesion.usuario_id)}</span></p>
                     <p>Embudo: <span className="text-white">{getEmbudoName(sesion.embudo_id)}</span></p>
                     <p>Creada: <span className="text-white">{formatDate(sesion.creado_en)}</span></p>
                   </div>
                </div>
              </div>
              
              {/* Acciones */}
              <div className="flex items-center space-x-2">
                {/* Toggle de estado */}
                
                
                {/* Botón editar */}
                {onEditSesion && (
                  <button
                    onClick={() => onEditSesion(sesion)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-[#3a3d45] rounded-lg transition-colors"
                    title="Editar sesión"
                  >
                    ✏️
                  </button>
                )}
                
                {/* Botón eliminar */}
                {onDeleteSesion && (
                  <button
                    onClick={() => onDeleteSesion(sesion.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900 hover:bg-opacity-20 rounded-lg transition-colors"
                    title="Eliminar sesión"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
            
            
          </div>
        ))}
      </div>
    </div>
  );
}
