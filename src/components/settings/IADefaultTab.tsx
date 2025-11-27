import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { iaDefaultService, IADefaultSettings } from '@/services/iaDefaultService';
import { X } from 'lucide-react';

const Chip: React.FC<{ value: string; onRemove: () => void }> = ({ value, onRemove }) => (
  <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-muted-foreground mr-2 mb-2 text-sm">
    {value}
    <button className="ml-1 hover:text-destructive" onClick={onRemove} aria-label="Eliminar">
      <X className="h-3 w-3" />
    </button>
  </span>
);

const IADefaultTab: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const [isEnabled, setIsEnabled] = useState(false);
  const [cashierInput, setCashierInput] = useState('');
  const [cashierNumbers, setCashierNumbers] = useState<string[]>([]);
  const [cbu, setCbu] = useState('');

  const addCashierNumber = () => {
    const cleaned = cashierInput.trim();
    if (!cleaned) return;
    if (!cashierNumbers.includes(cleaned)) {
      setCashierNumbers(prev => [...prev, cleaned]);
    }
    setCashierInput('');
  };

  const removeCashierNumber = (num: string) => {
    setCashierNumbers(prev => prev.filter(n => n !== num));
  };

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await iaDefaultService.getSettings();
        if (settings) {
          setIsEnabled(!!settings.is_enabled);
          setCashierNumbers(settings.cashier_numbers || []);
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
        cashier_numbers: cashierNumbers,
        cbu,
      });
      toast({ title: 'Guardado', description: 'Configuración actualizada correctamente.' });
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Error', description: error.message || 'No se pudo guardar.', variant: 'destructive' });
    }
  };

  const onCashierKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      addCashierNumber();
    }
  };

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

      {/* Números de Cajeros */}
      <Card>
        <CardHeader>
          <CardTitle>Números de Cajeros</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Ingresa los números de teléfono de los cajeros. Presiona espacio o Enter para agregar cada número.
          </p>
          <Input
            placeholder="Ingresa un número de teléfono..."
            value={cashierInput}
            onChange={(e) => setCashierInput(e.target.value)}
            onKeyDown={onCashierKeyDown}
          />
          <div className="mt-3">
            {cashierNumbers.map((num) => (
              <Chip key={num} value={num} onRemove={() => removeCashierNumber(num)} />
            ))}
          </div>
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
