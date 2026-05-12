import React, { useMemo, useRef, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Plus, Inbox, RefreshCw, Eye, ArrowLeft, Send, Reply } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type EmailInbox = Database['public']['Tables']['email_inboxes']['Row'];
type EmailMessage = Database['public']['Tables']['email_messages']['Row'];

const stripHtml = (value: string) => value.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const normalizeSubjectForReply = (subject: string) => {
  const trimmed = subject.trim();
  if (!trimmed) return 'Re:';
  if (/^\s*re\s*:/i.test(trimmed)) return trimmed;
  return `Re: ${trimmed}`;
};

function EmailHtmlFrame({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const srcDoc = useMemo(() => {
    const safeHtml = html || '';
    return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><base target="_blank" /><style>html,body{margin:0;padding:0;background:transparent;color:inherit;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}body{padding:12px}img{max-width:100%;height:auto}pre{white-space:pre-wrap;word-break:break-word}</style></head><body>${safeHtml}</body></html>`;
  }, [html]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        const height = doc.documentElement.scrollHeight;
        iframe.style.height = `${Math.max(height, 200)}px`;
      } catch {
      }
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [srcDoc]);

  return (
    <iframe
      ref={iframeRef}
      title="email-html"
      className="w-full rounded-md border border-border bg-background"
      sandbox="allow-popups allow-popups-to-escape-sandbox"
      srcDoc={srcDoc}
    />
  );
}

export default function EmailInboxes() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [inboxes, setInboxes] = useState<EmailInbox[]>([]);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [selectedInbox, setSelectedInbox] = useState<EmailInbox | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);

  // Estado para el modal de redactar
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  useEffect(() => {
    if (user) {
      fetchInboxes();
    }
  }, [user]);

  useEffect(() => {
    if (selectedInbox) {
      fetchMessages(selectedInbox.id);
    }
  }, [selectedInbox]);

  const fetchInboxes = async () => {
    try {
      const { data, error } = await supabase
        .from('email_inboxes')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInboxes(data || []);
    } catch (error) {
      console.error('Error fetching inboxes:', error);
    }
  };

  const fetchMessages = async (inboxId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_messages')
        .select('*')
        .eq('inbox_id', inboxId)
        .order('received_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInbox = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      toast({ title: "Error", description: "Ingresa un email válido.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('email_inboxes')
        .insert({
          user_id: user?.id,
          email_address: newEmail.trim()
        });

      if (error) throw error;
      toast({ title: "Éxito", description: "Bandeja de correo creada correctamente." });
      setNewEmail('');
      fetchInboxes();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!composeTo || !composeSubject || !composeBody) {
      toast({ title: "Error", description: "Por favor, completa todos los campos.", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const safeHtmlBody = `<div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size: 14px; white-space: pre-wrap; word-break: break-word;">${
        escapeHtml(composeBody)
      }</div>`;

      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          inboxId: selectedInbox.id,
          toEmail: composeTo,
          subject: composeSubject,
          textBody: composeBody,
          htmlBody: safeHtmlBody,
        }
      });

      if (error) throw error;

      toast({ title: "Correo enviado", description: "El mensaje ha sido enviado exitosamente." });
      setIsComposeOpen(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      fetchMessages(selectedInbox.id); // Recargar la lista de mensajes
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast({ title: "Error al enviar", description: error.message || "Ocurrió un error inesperado.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleOpenMessage = async (msg: EmailMessage) => {
    setSelectedMessage(msg);

    if (msg.direction === 'inbound' && !msg.is_read) {
      const { error } = await supabase
        .from('email_messages')
        .update({ is_read: true })
        .eq('id', msg.id);

      if (!error) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, is_read: true } : m)),
        );
      }
    }
  };

  const handleReply = (msg: EmailMessage) => {
    const replyTo = (msg.from_email || '').trim();
    if (!replyTo) {
      toast({ title: "Error", description: "No se encontró el remitente para responder.", variant: "destructive" });
      return;
    }

    setComposeTo(replyTo);
    setComposeSubject(normalizeSubjectForReply(msg.subject || ''));
    setComposeBody('');
    setIsComposeOpen(true);
  };

  const messagePreview = useMemo(() => {
    const msg = selectedMessage;
    if (!msg) return null;
    const subject = msg.subject || '(Sin asunto)';
    const fromTo = msg.direction === 'inbound' ? (msg.from_email || '') : (msg.to_email || '');
    return { subject, fromTo };
  }, [selectedMessage]);

  if (selectedInbox) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setSelectedInbox(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Mail className="h-8 w-8 text-primary" />
                {selectedInbox.email_address}
              </h1>
              <p className="text-muted-foreground mt-1">Bandeja de entrada</p>
            </div>
            
            <div className="ml-auto flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => fetchMessages(selectedInbox.id)}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              <Button onClick={() => setIsComposeOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Redactar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <Card className="border-border shadow-sm lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Mensajes</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                    <Inbox className="h-12 w-12 mb-4 opacity-20" />
                    <p>No hay mensajes en esta bandeja todavía.</p>
                    <p className="text-sm mt-2">Los correos enviados o recibidos aparecerán aquí.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[70vh]">
                    <div className="divide-y divide-border">
                      {messages.map((msg) => {
                        const isSelected = selectedMessage?.id === msg.id;
                        const subject = msg.subject || '(Sin asunto)';
                        const headerText = msg.direction === 'inbound'
                          ? (msg.from_email || '(Sin remitente)')
                          : `Para: ${msg.to_email || '(Sin destinatario)'}`;

                        const bodyPreviewRaw = msg.body_text
                          ? msg.body_text
                          : (msg.body_html ? stripHtml(msg.body_html) : '');
                        const bodyPreview = bodyPreviewRaw ? bodyPreviewRaw.slice(0, 140) : '(Sin contenido)';

                        return (
                          <button
                            key={msg.id}
                            type="button"
                            className={[
                              'w-full text-left p-4 transition-colors',
                              isSelected ? 'bg-muted/60' : 'hover:bg-muted/40',
                              !msg.is_read && msg.direction === 'inbound' ? 'bg-muted/20 font-medium' : '',
                            ].join(' ')}
                            onClick={() => handleOpenMessage(msg)}
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-foreground truncate">
                                    {headerText}
                                  </span>
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full ${
                                      msg.direction === 'inbound'
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                                    }`}
                                  >
                                    {msg.direction === 'inbound' ? 'Recibido' : 'Enviado'}
                                  </span>
                                </div>
                                <div className="text-sm text-foreground mt-1 truncate">{subject}</div>
                                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {bodyPreview}
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {format(new Date(msg.received_at), "d MMM, HH:mm", { locale: es })}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm lg:col-span-3">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">
                      {messagePreview?.subject || 'Selecciona un mensaje'}
                    </CardTitle>
                    {selectedMessage ? (
                      <div className="text-sm text-muted-foreground mt-1">
                        {selectedMessage.direction === 'inbound'
                          ? `De: ${selectedMessage.from_email || '(Sin remitente)'}`
                          : `Para: ${selectedMessage.to_email || '(Sin destinatario)'}`}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground mt-1">
                        Haz click en un email para ver el detalle.
                      </div>
                    )}
                  </div>
                  {selectedMessage?.direction === 'inbound' && (
                    <Button
                      variant="outline"
                      onClick={() => handleReply(selectedMessage)}
                      disabled={sending}
                    >
                      <Reply className="h-4 w-4 mr-2" />
                      Responder
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedMessage ? (
                  <div className="text-sm text-muted-foreground">
                    No hay ningún mensaje seleccionado.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(selectedMessage.received_at), "d MMMM yyyy, HH:mm", { locale: es })}
                    </div>
                    {selectedMessage.body_html ? (
                      <EmailHtmlFrame html={selectedMessage.body_html} />
                    ) : (
                      <pre className="whitespace-pre-wrap break-words rounded-md border border-border bg-muted/20 p-4 text-sm text-foreground">
                        {selectedMessage.body_text || '(Sin contenido)'}
                      </pre>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modal de Redacción */}
        <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>{composeTo ? 'Redactar' : 'Nuevo Mensaje'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>De</Label>
                <Input value={selectedInbox.email_address} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Para</Label>
                <Input 
                  placeholder="destinatario@ejemplo.com" 
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Asunto</Label>
                <Input 
                  placeholder="Asunto del correo" 
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Mensaje</Label>
                <Textarea 
                  placeholder="Escribe tu mensaje aquí..." 
                  className="min-h-[200px]"
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsComposeOpen(false)} disabled={sending}>Cancelar</Button>
              <Button onClick={handleSendEmail} disabled={sending}>
                {sending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Enviar Correo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Mail className="h-8 w-8 text-primary" />
            Bandejas de Email
          </h1>
          <p className="text-muted-foreground mt-1">Gestiona tus correos entrantes y salientes a través de AWS SES</p>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Nueva Bandeja</CardTitle>
            <CardDescription>Añade una dirección de correo para recibir y enviar mensajes.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label>Dirección de correo electrónico</Label>
                <Input 
                  value={newEmail} 
                  onChange={(e) => setNewEmail(e.target.value)} 
                  placeholder="ejemplo@tudominio.com" 
                />
              </div>
              <Button onClick={handleCreateInbox} disabled={loading} className="min-w-[150px]">
                {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Crear Bandeja
              </Button>
            </div>
            
            <div className="mt-4 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Configuración del Webhook para recibir (AWS SES)</p>
              <p>Tu URL del webhook es: <code className="bg-background px-1 py-0.5 rounded text-primary">https://[TU_PROYECTO_SUPABASE].supabase.co/functions/v1/webhook-email</code></p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {inboxes.map(inbox => (
            <Card key={inbox.id} className="border-border hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => setSelectedInbox(inbox)}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 group-hover:text-primary">
                    <Eye className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </Button>
                </div>
                <h3 className="font-semibold text-lg text-foreground truncate" title={inbox.email_address}>
                  {inbox.email_address}
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Creada el {format(new Date(inbox.created_at), "d MMM, yyyy", { locale: es })}
                </p>
              </CardContent>
            </Card>
          ))}
          
          {inboxes.length === 0 && (
            <div className="col-span-full p-8 text-center border-2 border-dashed border-border rounded-lg text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No tienes bandejas de correo configuradas.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
