'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Canal } from '@/types/common';

interface CanalOption {
  id: string;
  nombre: string;
  icon: string;
  logoPath: string;
  color: string;
  tipo: Canal['tipo'];
  description: string;
}

const canalOptions: CanalOption[] = [
  { 
    id: 'whatsapp', 
    nombre: 'WhatsApp', 
    icon: '📱', 
    logoPath: '/wpp_logo.svg',
    color: '#25D366', 
    tipo: 'whatsapp',
    description: 'WhatsApp estándar'
  },

  { 
    id: 'whatsapp_api', 
    nombre: 'Whatsapp API', 
    icon: '📱', 
    logoPath: '/wpp_logo.svg',
    color: '#25D366', 
    tipo: 'whatsappApi',
    description: 'Conecta WhatsApp usando API oficial'
  },
  { 
    id: 'instagram', 
    nombre: 'Instagram', 
    icon: '📷', 
    logoPath: '/instagram_logo.svg',
    color: '#E4405F', 
    tipo: 'instagram',
    description: 'Conecta Instagram Business'
  },
  { 
    id: 'messenger', 
    nombre: 'Messenger', 
    icon: '💬', 
    logoPath: '/messenger_logo.svg',
    color: '#0084FF', 
    tipo: 'messenger',
    description: 'Conecta Facebook Messenger'
  },
  { 
    id: 'telegram', 
    nombre: 'Telegram', 
    icon: '✈️', 
    logoPath: '/telegram_logo.svg',
    color: '#0088CC', 
    tipo: 'telegram',
    description: 'Conecta Telegram personal'
  },
  { 
    id: 'telegram_bot', 
    nombre: 'Telegram Bot', 
    icon: '🤖', 
    logoPath: '/telegram_logo.svg',
    color: '#0088CC', 
    tipo: 'telegramBot',
    description: 'Conecta Telegram Bot API'
  },
  { 
    id: 'web_chat', 
    nombre: 'Web Chat', 
    icon: '💬', 
    logoPath: '/chat_logo.svg',
    color: '#F29A1F', 
    tipo: 'webChat',
    description: 'Chat integrado en tu sitio web'
  },
  { 
    id: 'email', 
    nombre: 'Email', 
    icon: '✉️', 
    logoPath: '/email_logo.svg',
    color: '#EA4335', 
    tipo: 'email',
    description: 'Conecta tu cuenta de email'
  },
];

interface CanalSelectorProps {
  onSelectCanal: (tipo: Canal['tipo']) => void;
  selectedCanal?: Canal['tipo'] | null;
  showDescriptions?: boolean;
}

export default function CanalSelector({ 
  onSelectCanal, 
  selectedCanal, 
  showDescriptions = false 
}: CanalSelectorProps) {
  const [hoveredCanal, setHoveredCanal] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {canalOptions.map((option) => {
          const isSelected = selectedCanal === option.tipo;
          const isHovered = hoveredCanal === option.id;
          
          return (
            <button
              key={option.id}
              onClick={() => onSelectCanal(option.tipo)}
              onMouseEnter={() => setHoveredCanal(option.id)}
              onMouseLeave={() => setHoveredCanal(null)}
              className={`
                relative bg-[#1a1d23] border rounded-lg p-4 text-center transition-all duration-200 group
                ${isSelected 
                  ? 'border-[#F29A1F] bg-[#F29A1F] bg-opacity-10' 
                  : 'border-[#3a3d45] hover:border-[#F29A1F] hover:bg-[#2a2d35]'
                }
                ${isHovered ? 'transform scale-105' : ''}
              `}
            >
              {/* Logo del canal */}
              <div 
                className={`
                  w-12 h-12 mb-3 transition-all duration-200 flex items-center justify-center mx-auto
                  ${isSelected ? 'transform scale-110' : ''}
                `}
              >
                <Image
                  src={option.logoPath}
                  alt={`${option.nombre} logo`}
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                />
              </div>
              
              {/* Nombre del canal */}
              <div className={`
                font-medium text-sm transition-colors duration-200
                ${isSelected ? 'text-[#F29A1F]' : 'text-white'}
              `}>
                {option.nombre}
              </div>
              
              {/* Descripción (opcional) */}
              {showDescriptions && (
                <div className="text-gray-400 text-xs mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {option.description}
                </div>
              )}
              
              {/* Indicador de selección */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-3 h-3 bg-[#F29A1F] rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
              )}
              
              {/* Efecto de brillo en hover */}
              {isHovered && !isSelected && (
                <div 
                  className="absolute inset-0 rounded-lg opacity-20"
                  style={{ 
                    background: `radial-gradient(circle at center, ${option.color} 0%, transparent 70%)` 
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
