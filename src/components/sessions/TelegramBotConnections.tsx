import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Bot } from 'lucide-react';

const TelegramBotConnections = () => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bot className="h-5 w-5" style={{ color: 'hsl(var(--telegram-blue))' }} />
          <h3 className="text-xl font-semibold">Telegram Bot</h3>
          <span className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground">
            0 bots
          </span>
        </div>
        <Button disabled variant="default" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Bot
        </Button>
      </div>

      {/* Coming Soon Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span className="text-4xl">🤖</span>
            <span>Bots de Telegram</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-telegram-blue/10 mb-4">
              <Bot className="h-8 w-8" style={{ color: 'hsl(var(--telegram-blue))' }} />
            </div>
            <h4 className="text-lg font-semibold mb-2">Próximamente</h4>
            <p className="text-muted-foreground max-w-md mx-auto">
              Conecta y administra tus bots de Telegram para automatizar conversaciones 
              y brindar atención al cliente 24/7.
            </p>
          </div>

          {/* Future Features Preview */}
          <div className="border-t pt-4 mt-4">
            <h5 className="text-sm font-medium mb-3 text-muted-foreground">
              Funcionalidades que estarán disponibles:
            </h5>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start space-x-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Conexión mediante Bot Token de @BotFather</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Configuración de webhooks automáticos</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Respuestas automáticas con IA</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Gestión de múltiples bots desde una interfaz</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Estadísticas y métricas de interacción</span>
              </li>
            </ul>
          </div>

          {/* Example Bot Token Field */}
          <div className="border-t pt-4 mt-4">
            <h5 className="text-sm font-medium mb-3 text-muted-foreground">
              Ejemplo de configuración:
            </h5>
            <div className="space-y-2 opacity-50 pointer-events-none">
              <label className="text-sm">Bot Token</label>
              <input 
                type="text" 
                disabled 
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                className="w-full px-3 py-2 border rounded-md bg-muted text-muted-foreground"
              />
              <label className="text-sm">Bot Username</label>
              <input 
                type="text" 
                disabled 
                placeholder="@mi_bot_username"
                className="w-full px-3 py-2 border rounded-md bg-muted text-muted-foreground"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TelegramBotConnections;
