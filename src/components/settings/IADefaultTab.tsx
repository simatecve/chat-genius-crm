import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { iaDefaultService, IADefaultSettings } from '@/services/iaDefaultService';
import { X } from 'lucide-react';

const IADefaultTab: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const [isEnabled, setIsEnabled] = useState(false);
  const [cashierNumbersText, setCashierNumbersText] = useState('');
  const [cbu, setCbu] = useState('');


  useEffect(() => {
    const load = async () => {
      try {
        const settings = await iaDefaultService.getSettings();
        if (settings) {
          setIsEnabled(!!settings.is_enabled);
          setCashierNumbersText(settings.cashier_numbers || '');
          setCbu(settings.cbu || '');
        }
      } catch (error) {
        console.error(error);
        toast({
          title: 'Error',
          description: 'No se pudo cargar la configuración de IA por defecto',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  const save = async () => {
    try {
      await iaDefaultService.saveSettings({
        id: 1,
        is_enabled: isEnabled,
        cashier_numbers: cashierNumbersText,
        cbu,
      });
      toast({ title: 'Guardado', description: 'Configuración actualizada correctamente.' });
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Error', description: error.message || 'No se pudo guardar.', variant: 'destructive' });
    }
  };

  // ya no se usa chips; texto libre

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <span className="h-6 w-6 text-primary">🧠</span>
        <h2 className="text-2xl font-bold">Inteligencia Artificial</h2>
      </div>

      {/* IA encendida para nuevos chats */}
      <Card>
        <CardHeader>
          <CardTitle>IA encendida para nuevos chats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Activa la inteligencia artificial para responder automáticamente a los nuevos chats.
          </p>
          <div className="flex items-center justify-between">
            <Label className="text-base">Activar IA automáticamente</Label>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* Números de Cajeros (texto) */}
      <Card>
        <CardHeader>
          <CardTitle>Números de Cajeros</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Ingresa uno o varios números de cajero en texto libre (por ejemplo, separados por coma).
          </p>
          <Input
            placeholder="Ej: +54911..., +549351..."
            value={cashierNumbersText}
            onChange={(e) => setCashierNumbersText(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* CBU */}
      <Card>
        <CardHeader>
          <CardTitle>CBU</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Ingresa el CBU (Clave Bancaria Uniforme) para transacciones bancarias.
          </p>
          <Input placeholder="Ingresa el CBU..." value={cbu} onChange={(e) => setCbu(e.target.value)} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save}>Guardar cambios</Button>
      </div>
    </div>
  );
};

export default IADefaultTab;