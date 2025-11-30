import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Send } from 'lucide-react';

const TelegramConnections = () => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Send className="h-5 w-5" style={{ color: 'hsl(var(--telegram-blue))' }} />
          <h3 className="text-xl font-semibold">Telegram</h3>
          <span className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground">
            0 conexiones
          </span>
        </div>
        <Button disabled variant="default" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Agregar
        </Button>
      </div>

      {/* Coming Soon Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span className="text-4xl">✈️</span>
            <span>Conexiones de Telegram Personal</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-telegram-blue/10 mb-4">
              <Send className="h-8 w-8" style={{ color: 'hsl(var(--telegram-blue))' }} />
            </div>
            <h4 className="text-lg font-semibold mb-2">Próximamente</h4>
            <p className="text-muted-foreground max-w-md mx-auto">
              Pronto podrás conectar tu cuenta personal de Telegram para recibir y enviar mensajes 
              directamente desde la plataforma.
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
                <span>Conexión mediante código QR o número de teléfono</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Gestión de múltiples sesiones de Telegram</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Envío y recepción de mensajes en tiempo real</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Integración con bots de IA</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TelegramConnections;
