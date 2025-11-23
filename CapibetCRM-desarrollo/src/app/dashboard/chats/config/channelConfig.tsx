/**
 * Configuración centralizada para todos los canales de comunicación
 * Soporta: WhatsApp (QR y API), Messenger, Telegram, Telegram Bot
 */

import Image from 'next/image';
import { Camera, MessageCircle, Send, Bot, Mail, Facebook, Twitter, Briefcase, Megaphone, Smartphone } from 'lucide-react';

export type ChannelType = 
  | 'whatsapp_qr' 
  | 'whatsapp_api' 
  | 'messenger' 
  | 'telegram' 
  | 'telegram_bot' 
  | 'instagram' 
  | 'gmail' 
  | 'outlook' 
  | 'web-chat' 
  | 'email' 
  | 'sms' 
  | 'facebook' 
  | 'twitter' 
  | 'linkedin';

export interface ChannelConfig {
  name: string;
  icon: React.ReactNode;
  color: string;
  supportedFeatures: {
    text: boolean;
    images: boolean;
    videos: boolean;
    files: boolean;
    emojis: boolean;
    audio: boolean;
  };
  messageEndpoint: string;
}

const CHANNEL_CONFIGS: Record<string, ChannelConfig> = {
  'whatsapp_qr': {
    name: 'WhatsApp',
    icon: <Image src="/wpp_logo.svg" alt="WhatsApp QR" width={16} height={16} className="filter brightness-0 invert" />,
    color: '#25D366',
    supportedFeatures: {
      text: true,
      images: true,
      videos: true,
      files: true,
      emojis: true,
      audio: true,
    },
    messageEndpoint: '/api/mensajes/enviar/whatsapp',
  },
  'whatsapp_api': {
    name: 'WhatsApp',
    icon: <Image src="/wpp_logo.svg" alt="WhatsApp API" width={16} height={16} className="filter brightness-0 invert" />,
    color: '#25D366',
    supportedFeatures: {
      text: true,
      images: true,
      videos: true,
      files: true,
      emojis: true,
      audio: true,
    },
    messageEndpoint: '/api/mensajes/enviar/whatsapp',
  },
  'messenger': {
    name: 'Messenger',
    icon: <Image src="/messenger_logo.svg" alt="Messenger" width={16} height={16} className="filter brightness-0 invert" />,
    color: '#0084FF',
    supportedFeatures: {
      text: true,
      images: true,
      videos: true,
      files: true,
      emojis: true,
      audio: true,
    },
    messageEndpoint: '/api/mensajes/enviar/messenger',
  },
  'telegram': {
    name: 'Telegram',
    icon: <Image src="/telegram_logo.svg" alt="Telegram" width={16} height={16} className="filter brightness-0 invert" />,
    color: '#0088cc',
    supportedFeatures: {
      text: true,
      images: true,
      videos: true,
      files: true,
      emojis: true,
      audio: true,
    },
    messageEndpoint: '/api/mensajes/enviar/telegram',
  },
  'telegram_bot': {
    name: 'Telegram Bot',
    icon: <Bot className="w-4 h-4" />,
    color: '#0088cc',
    supportedFeatures: {
      text: true,
      images: true,
      videos: true,
      files: true,
      emojis: true,
      audio: true,
    },
    messageEndpoint: '/api/mensajes/enviar/telegram-bot',
  },
  'instagram': {
    name: 'Instagram',
    icon: <Image src="/instagram_logo.svg" alt="Instagram" width={16} height={16} className="filter brightness-0 invert" />,
    color: '#E4405F',
    supportedFeatures: {
      text: true,
      images: true,
      videos: true,
      files: false,
      emojis: true,
      audio: false,
    },
    messageEndpoint: '/api/mensajes/enviar/instagram',
  },
  'gmail': {
    name: 'Gmail',
    icon: <Image src="/email_logo.svg" alt="Gmail" width={16} height={16} className="filter brightness-0 invert" />,
    color: '#EA4335',
    supportedFeatures: {
      text: true,
      images: true,
      videos: false,
      files: true,
      emojis: false,
      audio: false,
    },
    messageEndpoint: '/api/mensajes/enviar/gmail',
  },
  'outlook': {
    name: 'Outlook',
    icon: <Mail className="w-4 h-4" />,
    color: '#0078D4',
    supportedFeatures: {
      text: true,
      images: true,
      videos: false,
      files: true,
      emojis: false,
      audio: false,
    },
    messageEndpoint: '/api/mensajes/enviar/outlook',
  },
  'web-chat': {
    name: 'Web Chat',
    icon: <Image src="/chat_logo.svg" alt="Web Chat" width={16} height={16} className="filter brightness-0 invert" />,
    color: '#6366F1',
    supportedFeatures: {
      text: true,
      images: true,
      videos: false,
      files: true,
      emojis: true,
      audio: false,
    },
    messageEndpoint: '/api/mensajes/enviar/webchat',
  },
  'email': {
    name: 'Email',
    icon: <Mail className="w-4 h-4" />,
    color: '#6366F1',
    supportedFeatures: {
      text: true,
      images: true,
      videos: false,
      files: true,
      emojis: false,
      audio: false,
    },
    messageEndpoint: '/api/mensajes/enviar/email',
  },
  'sms': {
    name: 'SMS',
    icon: <Smartphone className="w-4 h-4" />,
    color: '#10B981',
    supportedFeatures: {
      text: true,
      images: false,
      videos: false,
      files: false,
      emojis: false,
      audio: false,
    },
    messageEndpoint: '/api/mensajes/enviar/sms',
  },
  'facebook': {
    name: 'Facebook',
    icon: <Facebook className="w-4 h-4" />,
    color: '#1877F2',
    supportedFeatures: {
      text: true,
      images: true,
      videos: true,
      files: false,
      emojis: true,
      audio: false,
    },
    messageEndpoint: '/api/mensajes/enviar/facebook',
  },
  'twitter': {
    name: 'Twitter',
    icon: <Twitter className="w-4 h-4" />,
    color: '#1DA1F2',
    supportedFeatures: {
      text: true,
      images: true,
      videos: true,
      files: false,
      emojis: true,
      audio: false,
    },
    messageEndpoint: '/api/mensajes/enviar/twitter',
  },
  'linkedin': {
    name: 'LinkedIn',
    icon: <Briefcase className="w-4 h-4" />,
    color: '#0A66C2',
    supportedFeatures: {
      text: true,
      images: true,
      videos: false,
      files: true,
      emojis: false,
      audio: false,
    },
    messageEndpoint: '/api/mensajes/enviar/linkedin',
  },
};

const DEFAULT_CONFIG: ChannelConfig = {
  name: 'Desconocido',
  icon: <Megaphone className="w-4 h-4" />,
  color: '#6B7280',
  supportedFeatures: {
    text: true,
    images: false,
    videos: false,
    files: false,
    emojis: false,
    audio: false,
  },
  messageEndpoint: '/api/mensajes/enviar/generic',
};

/**
 * Obtiene la configuración de un canal por su tipo
 */
export const getChannelConfig = (type: string): ChannelConfig => {
  const normalizedType = type.toLowerCase().trim();
  return CHANNEL_CONFIGS[normalizedType] || DEFAULT_CONFIG;
};

/**
 * Obtiene solo la información de visualización (nombre e icono)
 */
export const getChannelInfo = (type: string): { name: string; icon: React.ReactNode } => {
  const config = getChannelConfig(type);
  return { name: config.name, icon: config.icon };
};

/**
 * Obtiene el color del canal
 */
export const getChannelColor = (type: string): string => {
  return getChannelConfig(type).color;
};

/**
 * Verifica si un canal soporta una característica específica
 */
export const channelSupports = (type: string, feature: keyof ChannelConfig['supportedFeatures']): boolean => {
  return getChannelConfig(type).supportedFeatures[feature];
};

/**
 * Verifica si un canal soporta emojis
 */
export const isEmojiPickerAvailable = (type: string): boolean => {
  return channelSupports(type, 'emojis');
};

/**
 * Obtiene el endpoint para enviar mensajes
 */
export const getMessageEndpoint = (type: string): string => {
  return getChannelConfig(type).messageEndpoint;
};

