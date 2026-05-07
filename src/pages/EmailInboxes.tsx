import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Mail, Plus, Inbox, RefreshCw, Eye, ArrowLeft, Send } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function EmailInboxes() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [inboxes, setInboxes] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [selectedInbox, setSelectedInbox] = useState<any>(null);

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
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          inboxId: selectedInbox.id,
          toEmail: composeTo,
          subject: composeSubject,
          textBody: composeBody,
          htmlBody: composeBody.replace(/\n/g, '<br>')
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

          <Card className="border-border shadow-sm">
            <CardContent className="p-0">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                  <Inbox className="h-12 w-12 mb-4 opacity-20" />
                  <p>No hay mensajes en esta bandeja todavía.</p>
                  <p className="text-sm mt-2">Los correos enviados o recibidos aparecerán aquí.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`p-4 hover:bg-muted/50 transition-colors ${!msg.is_read ? 'bg-muted/20 font-medium' : ''}`}>
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {msg.direction === 'inbound' ? msg.from_email : `Para: ${msg.to_email}`}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${msg.direction === 'inbound' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'}`}>
                            {msg.direction === 'inbound' ? 'Recibido' : 'Enviado'}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                          {format(new Date(msg.received_at), "d MMM, HH:mm", { locale: es })}
                        </span>
                      </div>
                      <h4 className="text-base text-foreground mb-2 mt-1">{msg.subject || '(Sin asunto)'}</h4>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-md">
                        {msg.body_text || msg.body_html?.replace(/<[^>]*>?/gm, '') || '(Sin contenido)'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Modal de Redacción */}
        <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Nuevo Mensaje</DialogTitle>
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
