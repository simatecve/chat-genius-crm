/**
 * Avatar que muestra el icono del canal de comunicación
 * Reutilizable para cualquier tipo de canal
 */

import Image from 'next/image';
import { getChannelInfo } from '../config/channelConfig';

interface ChannelAvatarProps {
  channelType: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const SIZE_MAP = {
  small: { container: 'w-8 h-8', icon: 24 },
  medium: { container: 'w-10 h-10', icon: 32 },
  large: { container: 'w-12 h-12', icon: 40 },
};

export default function ChannelAvatar({ channelType, size = 'medium', className = '' }: ChannelAvatarProps) {
  const { name, icon } = getChannelInfo(channelType);
  const sizeConfig = SIZE_MAP[size];

  // Para WhatsApp, renderizamos el logo directamente
  if (channelType === 'whatsapp_qr' || channelType === 'whatsapp_api') {
    return (
      <div className={`${sizeConfig.container} rounded-full flex items-center justify-center ${className}`}>
        <Image 
          src="/wpp_logo.svg" 
          alt={name}
          width={sizeConfig.icon} 
          height={sizeConfig.icon} 
        />
      </div>
    );
  }

  // Para otros canales, renderizamos el icono correspondiente
  return (
    <div className={`${sizeConfig.container} rounded-full flex items-center justify-center ${className}`}>
      {icon}
    </div>
  );
}

