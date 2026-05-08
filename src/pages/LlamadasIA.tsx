import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Phone, Upload, X, FileText, Paperclip, Loader2,
  Bot, Mic, BarChart3, Play, RefreshCw, CheckCircle2,
  XCircle, Clock, PhoneCall
} from 'lucide-react';
import Papa from 'papaparse';

interface VapiAssistant {
  id: string;
  vapi_assistant_id: string;
  name: string;
  model_name: string;
  voice_id: string;
  created_at: string;
}

interface VapiPhoneNumber {
  id: string;
  vapi_phone_number_id: string;
  friendly_name: string;
  phone_number: string;
}

interface VapiCall {
  id: string;
  vapi_call_id: string;
  destination: string;
  status: string;
  duration_seconds: number | null;
  summary: string | null;
  transcript: string | null;
  recording_url: string | null;
  ended_reason: string | null;
  created_at: string;
}

interface AttachmentFile { file: File; name: string; }

type ActiveTab = 'create' | 'calls' | 'history';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function callFn(fn: string, body: object) {
  return fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify(body),
  }).then(r => r.json());
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    queued:     { label: 'En cola',     color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    ringing:    { label: 'Llamando',    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    'in-progress': { label: 'En curso', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    completed:  { label: 'Completada', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    failed:     { label: 'Fallida',    color: 'bg-red-500/20 text-red-400 border-red-500/30' },
    ended:      { label: 'Finalizada', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  };
  const s = map[status] ?? { label: status, color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${s.color}`}>
      {s.label}
    </span>
  );
}

export default function LlamadasIA() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>('create');

  // ---- Estado: crear asistente + campaña ----
  const [campaignName, setCampaignName] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [voiceId, setVoiceId] = useState('jennifer');
  const [modelName, setModelName] = useState('gpt-4o-mini');
  const [contactsText, setContactsText] = useState('');
  const [kbFiles, setKbFiles] = useState<AttachmentFile[]>([]);
  const [selectedPhoneId, setSelectedPhoneId] = useState('');
  const [loadingCreate, setLoadingCreate] = useState(false);

  // ---- Listas ----
  const [assistants, setAssistants] = useState<VapiAssistant[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<VapiPhoneNumber[]>([]);
  const [calls, setCalls] = useState<VapiCall[]>([]);
  const [loadingNumbers, setLoadingNumbers] = useState(false);
  const [loadingCalls, setLoadingCalls] = useState(false);

  // ---- Llamada rápida ----
  const [quickDest, setQuickDest] = useState('');
  const [quickAssistant, setQuickAssistant] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [loadingQuickCall, setLoadingQuickCall] = useState(false);
  const [expandedCall, setExpandedCall] = useState<string | null>(null);

  const parseContacts = (t: string) =>
    t.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);

  // ---- Cargar datos al montar ----
  useEffect(() => {
    loadPhoneNumbers();
    loadAssistants();
    loadCalls();
  }, []);

  const loadPhoneNumbers = async () => {
    setLoadingNumbers(true);
    const { data } = await supabase.from('vapi_phone_numbers').select('*').order('friendly_name');
    if (data) setPhoneNumbers(data);
    setLoadingNumbers(false);
  };

  const loadAssistants = async () => {
    const { data } = await supabase.from('vapi_assistants').select('*').order('created_at', { ascending: false });
    if (data) setAssistants(data as VapiAssistant[]);
  };

  const loadCalls = async () => {
    setLoadingCalls(true);
    const { data } = await supabase.from('vapi_calls').select('*').order('created_at', { ascending: false }).limit(50);
    if (data) setCalls(data as VapiCall[]);
    setLoadingCalls(false);
  };

  const syncPhoneNumbers = async () => {
    setLoadingNumbers(true);
    const res = await callFn('vapi-sync-phone-numbers', {});
    if (res.success) {
      toast({ title: `${res.count} números sincronizados` });
      loadPhoneNumbers();
    } else {
      toast({ title: 'Error al sincronizar', description: res.error || res.details, variant: 'destructive' });
    }
    setLoadingNumbers(false);
  };

  const handleContactsFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        complete: (r) => {
          const nums = (r.data as any[]).map(row => row[0]).filter(Boolean);
          setContactsText(p => p ? `${p}\n${nums.join('\n')}` : nums.join('\n'));
        }
      });
    } else {
      const reader = new FileReader();
      reader.onload = ev => setContactsText(p => p ? `${p}\n${ev.target?.result}` : ev.target?.result as string);
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) return toast({ title: 'El nombre es requerido', variant: 'destructive' });
    if (!systemPrompt.trim()) return toast({ title: 'El prompt del asistente es requerido', variant: 'destructive' });
    if (!selectedPhoneId) return toast({ title: 'Selecciona un número de teléfono', variant: 'destructive' });
    const contacts = parseContacts(contactsText);
    if (!contacts.length) return toast({ title: 'Agrega al menos un contacto', variant: 'destructive' });

    setLoadingCreate(true);
    try {
      // 1. Crear asistente en VAPI
      const assistantRes = await callFn('vapi-create-assistant', {
        name: campaignName,
        firstMessage: firstMessage || 'Hola, ¿cómo puedo ayudarte?',
        systemPrompt,
        voiceId,
        modelName,
      });
      if (!assistantRes.success) throw new Error(assistantRes.error || 'Error al crear asistente');

      const vapiAssistantId = assistantRes.vapiAssistantId;

      // 2. Guardar campaña en ia_calls
      const { data: campaign, error: campaignErr } = await supabase
        .from('ia_calls')
        .insert({
          user_id: user?.id,
          name: campaignName,
          contacts,
          knowledge_base_text: systemPrompt,
          knowledge_base_files: [],
          status: 'processing',
        })
        .select('id').single();

      if (campaignErr) throw campaignErr;

      // 3. Disparar llamada por cada contacto
      let success = 0;
      for (const phone of contacts) {
        const callRes = await callFn('vapi-call', {
          destination: phone,
          assistantId: vapiAssistantId,
          phoneNumberId: selectedPhoneId,
          campaignId: campaign.id,
        });
        if (callRes.success) success++;
      }

      toast({
        title: '¡Campaña lanzada!',
        description: `Asistente creado y ${success}/${contacts.length} llamadas iniciadas.`,
      });

      // Limpiar formulario
      setCampaignName(''); setFirstMessage(''); setSystemPrompt('');
      setContactsText(''); setKbFiles([]); setSelectedPhoneId('');
      await loadCalls();
      setActiveTab('history');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleQuickCall = async () => {
    if (!quickDest || !quickAssistant || !quickPhone) {
      return toast({ title: 'Completa todos los campos', variant: 'destructive' });
    }
    setLoadingQuickCall(true);
    const res = await callFn('vapi-call', {
      destination: quickDest,
      assistantId: quickAssistant,
      phoneNumberId: quickPhone,
    });
    if (res.success) {
      toast({ title: 'Llamada iniciada', description: `ID: ${res.vapiCallId}` });
      setQuickDest('');
      loadCalls();
    } else {
      toast({ title: 'Error al llamar', description: res.error || res.details, variant: 'destructive' });
    }
    setLoadingQuickCall(false);
  };

  // ---- Stats ----
  const stats = {
    total: calls.length,
    completed: calls.filter(c => c.status === 'completed').length,
    failed: calls.filter(c => c.status === 'failed').length,
    avgDuration: calls.filter(c => c.duration_seconds).reduce((acc, c) => acc + (c.duration_seconds ?? 0), 0)
      / (calls.filter(c => c.duration_seconds).length || 1),
  };

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'create', label: 'Nueva Campaña', icon: <Bot className="h-4 w-4" /> },
    { id: 'calls', label: 'Llamada Rápida', icon: <PhoneCall className="h-4 w-4" /> },
    { id: 'history', label: 'Historial', icon: <BarChart3 className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Phone className="h-8 w-8 text-primary" />
              Llamadas IA
            </h1>
            <p className="text-muted-foreground mt-1">Integración con VAPI – Llamadas automatizadas con IA</p>
          </div>
          <Button variant="outline" size="sm" onClick={syncPhoneNumbers} disabled={loadingNumbers}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingNumbers ? 'animate-spin' : ''}`} />
            Sincronizar números
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total llamadas', value: stats.total, icon: <Phone className="h-5 w-5 text-primary" /> },
            { label: 'Completadas', value: stats.completed, icon: <CheckCircle2 className="h-5 w-5 text-emerald-400" /> },
            { label: 'Fallidas', value: stats.failed, icon: <XCircle className="h-5 w-5 text-red-400" /> },
            { label: 'Dur. promedio', value: `${Math.round(stats.avgDuration)}s`, icon: <Clock className="h-5 w-5 text-blue-400" /> },
          ].map(s => (
            <Card key={s.label} className="border-border">
              <CardContent className="pt-4 flex items-center gap-3">
                {s.icon}
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === t.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ========== TAB: NUEVA CAMPAÑA ========== */}
        {activeTab === 'create' && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Crear Campaña + Asistente IA</CardTitle>
              <CardDescription>Configura el asistente, los contactos y el número de origen. El asistente se creará automáticamente en VAPI.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre de la campaña *</Label>
                  <Input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="Ej. Prospección Mayo 2026" />
                </div>
                <div className="space-y-2">
                  <Label>Primer mensaje del asistente</Label>
                  <Input value={firstMessage} onChange={e => setFirstMessage(e.target.value)} placeholder="Hola, ¿cómo puedo ayudarte?" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Prompt del sistema (instrucciones para la IA) *</Label>
                <Textarea
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                  placeholder="Eres un asistente de ventas para la empresa X. Tu objetivo es agendar una cita. Presenta los siguientes beneficios: ..."
                  className="min-h-[130px]"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Voz del asistente</Label>
                  <select
                    value={voiceId}
                    onChange={e => setVoiceId(e.target.value)}
                    className="w-full p-2 rounded-md bg-background border border-border text-foreground text-sm"
                  >
                    <option value="jennifer">Jennifer (Inglés)</option>
                    <option value="es-ES-Standard-A">Español ES Femenino</option>
                    <option value="es-MX-Standard-A">Español MX Femenino</option>
                    <option value="es-US-Standard-A">Español US Femenino</option>
                    <option value="pNInz6obpgDQGcFMA">Adam (ElevenLabs)</option>
                    <option value="21m00Tcm4TlvDq8ikWAM">Rachel (ElevenLabs)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Modelo de IA</Label>
                  <select
                    value={modelName}
                    onChange={e => setModelName(e.target.value)}
                    className="w-full p-2 rounded-md bg-background border border-border text-foreground text-sm"
                  >
                    <option value="gpt-4o-mini">GPT-4o Mini (rápido)</option>
                    <option value="gpt-4o">GPT-4o (mejor calidad)</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo (económico)</option>
                  </select>
                </div>
              </div>

              {/* Número de origen */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Número de origen (VAPI) *</Label>
                  {loadingNumbers && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                {phoneNumbers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay números configurados.{' '}
                    <button onClick={syncPhoneNumbers} className="text-primary underline">Sincronizar ahora</button>
                  </p>
                ) : (
                  <select
                    value={selectedPhoneId}
                    onChange={e => setSelectedPhoneId(e.target.value)}
                    className="w-full p-2 rounded-md bg-background border border-border text-foreground text-sm"
                  >
                    <option value="">— Selecciona un número —</option>
                    {phoneNumbers.map(n => (
                      <option key={n.vapi_phone_number_id} value={n.vapi_phone_number_id}>
                        {n.friendly_name} {n.phone_number ? `(${n.phone_number})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Contactos */}
              <div className="space-y-2 pt-4 border-t border-border">
                <div className="flex justify-between items-center">
                  <Label>Contactos (números de teléfono) *</Label>
                  <div>
                    <input id="contacts-file" type="file" accept=".csv,.txt" onChange={handleContactsFile} className="hidden" />
                    <label htmlFor="contacts-file">
                      <Button variant="outline" size="sm" asChild className="cursor-pointer">
                        <span><Upload className="h-4 w-4 mr-2" />Subir CSV/TXT</span>
                      </Button>
                    </label>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Pega los números en formato E.164 (+15551234567) separados por comas o saltos de línea.</p>
                <Textarea
                  value={contactsText}
                  onChange={e => setContactsText(e.target.value)}
                  placeholder="+15551234567&#10;+525551234567"
                  className="min-h-[100px] font-mono text-sm"
                />
                {parseContacts(contactsText).length > 0 && (
                  <p className="text-sm text-primary font-medium">{parseContacts(contactsText).length} contactos detectados</p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleCreateCampaign} disabled={loadingCreate} className="min-w-[220px]">
                  {loadingCreate ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando asistente y llamadas...</>
                  ) : (
                    <><Bot className="mr-2 h-4 w-4" />Crear asistente e iniciar campaña</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========== TAB: LLAMADA RÁPIDA ========== */}
        {activeTab === 'calls' && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Llamada Rápida</CardTitle>
              <CardDescription>Inicia una llamada individual usando un asistente ya creado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Número destino</Label>
                <Input value={quickDest} onChange={e => setQuickDest(e.target.value)} placeholder="+15551234567" />
              </div>
              <div className="space-y-2">
                <Label>Asistente</Label>
                <select
                  value={quickAssistant}
                  onChange={e => setQuickAssistant(e.target.value)}
                  className="w-full p-2 rounded-md bg-background border border-border text-foreground text-sm"
                >
                  <option value="">— Selecciona un asistente —</option>
                  {assistants.map(a => (
                    <option key={a.vapi_assistant_id} value={a.vapi_assistant_id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Número de origen</Label>
                <select
                  value={quickPhone}
                  onChange={e => setQuickPhone(e.target.value)}
                  className="w-full p-2 rounded-md bg-background border border-border text-foreground text-sm"
                >
                  <option value="">— Selecciona un número —</option>
                  {phoneNumbers.map(n => (
                    <option key={n.vapi_phone_number_id} value={n.vapi_phone_number_id}>
                      {n.friendly_name} {n.phone_number ? `(${n.phone_number})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={handleQuickCall} disabled={loadingQuickCall} className="w-full">
                {loadingQuickCall ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Iniciando...</>
                ) : (
                  <><PhoneCall className="mr-2 h-4 w-4" />Iniciar llamada</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ========== TAB: HISTORIAL ========== */}
        {activeTab === 'history' && (
          <Card className="border-border">
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>Historial de Llamadas</CardTitle>
                <CardDescription>Registro completo de todas las llamadas realizadas con VAPI.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadCalls} disabled={loadingCalls}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingCalls ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </CardHeader>
            <CardContent>
              {loadingCalls ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : calls.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Phone className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No hay llamadas registradas aún.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {calls.map(call => (
                    <div key={call.id} className="border border-border rounded-lg overflow-hidden">
                      <button
                        className="w-full text-left p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedCall(expandedCall === call.id ? null : call.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{call.destination}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(call.created_at).toLocaleString('es-MX')}
                              {call.duration_seconds ? ` · ${call.duration_seconds}s` : ''}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={call.status} />
                      </button>

                      {expandedCall === call.id && (
                        <div className="border-t border-border p-4 space-y-3 bg-muted/30">
                          {call.summary && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-1">RESUMEN</p>
                              <p className="text-sm">{call.summary}</p>
                            </div>
                          )}
                          {call.transcript && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-1">TRANSCRIPCIÓN</p>
                              <p className="text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">{call.transcript}</p>
                            </div>
                          )}
                          {call.ended_reason && (
                            <p className="text-xs text-muted-foreground">Motivo de finalización: <span className="font-mono">{call.ended_reason}</span></p>
                          )}
                          {call.recording_url && (
                            <a
                              href={call.recording_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              <Play className="h-4 w-4" /> Reproducir grabación
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
