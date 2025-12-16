import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';
import { unifiedAIService, UnifiedAISettings, SessionAIStatus } from '@/services/unifiedAIService';
import { MessageSquare, Phone, Bot, Globe, Loader2 } from 'lucide-react';
import AIUsageStats from './AIUsageStats';

const channelIcons: Record<string, React.ReactNode> = {
  whatsapp: <Phone className="h-4 w-4 text-green-500" />,
  telegram: <Bot className="h-4 w-4 text-blue-500" />,
  twilio: <Phone className="h-4 w-4 text-red-500" />,
  webchat: <Globe className="h-4 w-4 text-purple-500" />,
};

const channelLabels: Record<string, string> = {
  whatsapp: 'WhatsApp',
  telegram: 'Telegram Bot',
  twilio: 'Twilio',
  webchat: 'Web Chat',
};

const IADefaultTab: React.FC = () => {
  const { toast } = useToast();
  const { effectiveUserId, loading: userIdLoading } = useEffectiveUserId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings state
  const [systemPrompt, setSystemPrompt] = useState('');
  const [cashierNumbers, setCashierNumbers] = useState('');
  const [cbu, setCbu] = useState('');
  const [model, setModel] = useState('google/gemini-2.5-flash');
  const [maxTokens, setMaxTokens] = useState(500);

  // Sessions state
  const [sessions, setSessions] = useState<SessionAIStatus[]>([]);
  const [togglingSession, setTogglingSession] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!effectiveUserId || userIdLoading) return;

      try {
        // Load unified AI settings
        const settings = await unifiedAIService.getSettings(effectiveUserId);
        if (settings) {
          setSystemPrompt(settings.system_prompt || unifiedAIService.getDefaultPrompt());
          setCashierNumbers(settings.cashier_numbers || '');
          setCbu(settings.cbu || '');
          setModel(settings.model || 'google/gemini-2.5-flash');
          setMaxTokens(settings.max_tokens || 500);
        } else {
          setSystemPrompt(unifiedAIService.getDefaultPrompt());
        }

        // Load all sessions
        const allSessions = await unifiedAIService.getAllSessions(effectiveUserId);
        setSessions(allSessions);
      } catch (error) {
        console.error(error);
        toast({
          title: 'Error',
          description: 'No se pudo cargar la configuración de IA',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [effectiveUserId, userIdLoading, toast]);

  const saveSettings = async () => {
    if (!effectiveUserId) return;

    setSaving(true);
    try {
      await unifiedAIService.saveSettings({
        user_id: effectiveUserId,
        is_enabled: true,
        system_prompt: systemPrompt,
        cashier_numbers: cashierNumbers,
        cbu,
        model,
        max_tokens: maxTokens,
      });
      toast({ title: 'Guardado', description: 'Configuración de IA actualizada correctamente.' });
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Error', description: error.message || 'No se pudo guardar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSessionAI = async (session: SessionAIStatus) => {
    setTogglingSession(session.id);
    try {
      await unifiedAIService.toggleSessionAI(session.id, session.channel_type, !session.ai_enabled);
      setSessions(prev =>
        prev.map(s => (s.id === session.id ? { ...s, ai_enabled: !s.ai_enabled } : s))
      );
      toast({
        title: session.ai_enabled ? 'IA Desactivada' : 'IA Activada',
        description: `${session.name}: IA ${session.ai_enabled ? 'desactivada' : 'activada'}`,
      });
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Error', description: error.message || 'No se pudo cambiar el estado.', variant: 'destructive' });
    } finally {
      setTogglingSession(null);
    }
  };

  // Group sessions by channel type
  const sessionsByChannel = sessions.reduce((acc, session) => {
    if (!acc[session.channel_type]) {
      acc[session.channel_type] = [];
    }
    acc[session.channel_type].push(session);
    return acc;
  }, {} as Record<string, SessionAIStatus[]>);

  if (loading || userIdLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <span className="h-6 w-6 text-primary">🧠</span>
        <h2 className="text-2xl font-bold">Inteligencia Artificial Unificada</h2>
      </div>

      {/* AI Usage Statistics */}
      <AIUsageStats userId={effectiveUserId} />

      {/* Activación por Sesión */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Activación por Sesión
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Activa o desactiva la IA para cada sesión individual. La IA usará la configuración unificada de abajo.
          </p>

          {Object.keys(sessionsByChannel).length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4">
              No tienes sesiones configuradas. Ve a "Sesiones" para agregar canales.
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(sessionsByChannel).map(([channelType, channelSessions]) => (
                <div key={channelType} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase">
                    {channelIcons[channelType]}
                    {channelLabels[channelType] || channelType}
                  </div>
                  <div className="space-y-2 pl-6">
                    {channelSessions.map(session => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-card border"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{session.name}</span>
                          {session.phone_number && (
                            <span className="text-xs text-muted-foreground">{session.phone_number}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {togglingSession === session.id && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                          <Switch
                            checked={session.ai_enabled}
                            onCheckedChange={() => handleToggleSessionAI(session)}
                            disabled={togglingSession === session.id}
                          />
                          <span className={`text-xs ${session.ai_enabled ? 'text-green-500' : 'text-muted-foreground'}`}>
                            {session.ai_enabled ? 'ON' : 'OFF'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <CardTitle>Prompt del Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Define las instrucciones y comportamiento de la IA. Usa {'{CBU}'} y {'{CAJERO}'} como placeholders.
          </p>
          <Textarea
            placeholder="Escribe el prompt del sistema..."
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={12}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* CBU y Cajero */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>CBU</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              CBU para transacciones bancarias (reemplaza {'{CBU}'} en el prompt).
            </p>
            <Input
              placeholder="Ingresa el CBU..."
              value={cbu}
              onChange={(e) => setCbu(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Números de Cajeros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Link o número del cajero (reemplaza {'{CAJERO}'} en el prompt).
            </p>
            <Input
              placeholder="Ej: http://wa.link/cargacapibet"
              value={cashierNumbers}
              onChange={(e) => setCashierNumbers(e.target.value)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Modelo y Tokens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Modelo de IA</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full p-2 rounded-md border bg-background"
            >
              <option value="google/gemini-2.5-flash">Gemini 2.5 Flash (Recomendado)</option>
              <option value="google/gemini-2.5-pro">Gemini 2.5 Pro</option>
              <option value="openai/gpt-5-mini">GPT-5 Mini</option>
              <option value="openai/gpt-5">GPT-5</option>
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Max Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              placeholder="500"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value) || 500)}
              min={100}
              max={4000}
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Guardar cambios
        </Button>
      </div>
    </div>
  );
};

export default IADefaultTab;
