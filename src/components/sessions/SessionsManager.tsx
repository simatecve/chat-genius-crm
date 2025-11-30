import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link2, Plus } from 'lucide-react';
import WhatsAppConnections from '@/pages/WhatsAppConnections';
import TelegramConnections from './TelegramConnections';
import TelegramBotConnections from './TelegramBotConnections';

interface Channel {
  id: string;
  name: string;
  icon: string;
  color: string;
  enabled: boolean;
  category?: string;
}

const channels: Channel[] = [
  { id: 'whatsapp-qr', name: 'WhatsApp QR', icon: '📱', color: 'hsl(var(--whatsapp-green))', enabled: true },
  { id: 'whatsapp-api', name: 'WhatsApp API', icon: '📱', color: 'hsl(var(--muted))', enabled: false, category: 'whatsapp' },
  { id: 'instagram', name: 'Instagram', icon: '📷', color: 'hsl(var(--muted))', enabled: false },
  { id: 'messenger', name: 'Messenger', icon: '💬', color: 'hsl(var(--muted))', enabled: false },
  { id: 'telegram', name: 'Telegram', icon: '✈️', color: 'hsl(var(--telegram-blue))', enabled: true },
  { id: 'telegram-bot', name: 'Telegram Bot', icon: '🤖', color: 'hsl(var(--telegram-blue))', enabled: true },
  { id: 'web-chat', name: 'Web Chat', icon: '💻', color: 'hsl(var(--muted))', enabled: false },
  { id: 'google-calendar', name: 'Google Calendar', icon: '📅', color: 'hsl(var(--muted))', enabled: false },
  { id: 'email', name: 'Email', icon: '✉️', color: 'hsl(var(--muted))', enabled: false },
];

const SessionsManager = () => {
  const [selectedChannel, setSelectedChannel] = useState<string>('whatsapp-qr');

  const renderChannelContent = () => {
    switch (selectedChannel) {
      case 'whatsapp-qr':
        return <WhatsAppConnections />;
      case 'telegram':
        return <TelegramConnections />;
      case 'telegram-bot':
        return <TelegramBotConnections />;
      default:
        return (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Canal no disponible</p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link2 className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Sesiones</h2>
        </div>
        <Button variant="outline" size="sm" disabled>
          <Plus className="h-4 w-4 mr-2" />
          Añadir Canal
        </Button>
      </div>
      
      <p className="text-muted-foreground text-sm">
        Crear, editar y eliminar tus sesiones vinculadas.
      </p>

      {/* Channel Selector */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Canales</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => channel.enabled && setSelectedChannel(channel.id)}
              disabled={!channel.enabled}
              className={`
                relative p-4 rounded-lg border-2 transition-all
                ${channel.enabled 
                  ? 'cursor-pointer hover:shadow-md hover:scale-105' 
                  : 'cursor-not-allowed opacity-40'
                }
                ${selectedChannel === channel.id && channel.enabled
                  ? 'border-primary shadow-md'
                  : 'border-border'
                }
              `}
              style={{
                backgroundColor: channel.enabled 
                  ? selectedChannel === channel.id 
                    ? `${channel.color}15`
                    : 'hsl(var(--card))'
                  : 'hsl(var(--muted) / 0.3)'
              }}
            >
              <div className="flex flex-col items-center space-y-2">
                <span className="text-3xl">{channel.icon}</span>
                <span 
                  className={`text-sm font-medium text-center ${
                    channel.enabled ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {channel.name}
                </span>
                {!channel.enabled && (
                  <span className="text-xs text-muted-foreground">Próximamente</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Channel Content */}
      <div className="mt-6">
        {renderChannelContent()}
      </div>
    </div>
  );
};

export default SessionsManager;
