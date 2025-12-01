import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';
import { Loader2, CheckCircle, Copy } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TwilioConnectionFormProps {
  onClose: () => void;
}

interface Workspace {
  id: string;
  name: string;
}

interface LeadColumn {
  id: string;
  name: string;
  workspace_id: string | null;
}

const TwilioConnectionForm = ({ onClose }: TwilioConnectionFormProps) => {
  const [open, setOpen] = useState(true);
  const [creating, setCreating] = useState(false);
  const [connectionCreated, setConnectionCreated] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [leadColumns, setLeadColumns] = useState<LeadColumn[]>([]);
  const [formData, setFormData] = useState({
    connection_name: '',
    account_sid: '',
    auth_token: '',
    phone_number: '',
    workspace_id: '',
    default_column_id: ''
  });
  
  const { toast } = useToast();
  const { effectiveUserId } = useEffectiveUserId();

  useEffect(() => {
    if (effectiveUserId) {
      fetchWorkspaces();
      fetchLeadColumns();
    }
  }, [effectiveUserId]);

  useEffect(() => {
    if (formData.workspace_id && effectiveUserId) {
      fetchLeadColumns(formData.workspace_id);
    } else if (!formData.workspace_id && effectiveUserId) {
      fetchLeadColumns();
    }
  }, [formData.workspace_id, effectiveUserId]);

  const fetchWorkspaces = async () => {
    if (!effectiveUserId) return;
    const { data } = await supabase
      .from('workspaces')
      .select('*')
      .eq('user_id', effectiveUserId)
      .order('position');
    if (data) setWorkspaces(data);
  };

  const fetchLeadColumns = async (workspaceId?: string) => {
    if (!effectiveUserId) return;
    let query = supabase
      .from('lead_columns')
      .select('*')
      .eq('user_id', effectiveUserId);
    
    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }
    
    const { data } = await query.order('position');
    if (data) setLeadColumns(data);
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 200);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "URL copiada al portapapeles",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!effectiveUserId) {
      toast({
        title: "Error",
        description: "Usuario no autenticado",
        variant: "destructive",
      });
      return;
    }

    if (!formData.connection_name || !formData.account_sid || !formData.auth_token || !formData.phone_number) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const cleanPhoneNumber = formData.phone_number.replace(/\D/g, '');
      
      // Validar credenciales de Twilio
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${formData.account_sid}.json`;
      const twilioResponse = await fetch(twilioUrl, {
        headers: {
          'Authorization': `Basic ${btoa(`${formData.account_sid}:${formData.auth_token}`)}`,
        },
      });

      if (!twilioResponse.ok) {
        throw new Error('Credenciales de Twilio inválidas');
      }

      // Crear conexión en la base de datos
      const { data: connection, error: insertError } = await supabase
        .from('twilio_connections')
        .insert({
          user_id: effectiveUserId,
          connection_name: formData.connection_name,
          account_sid: formData.account_sid,
          auth_token: formData.auth_token,
          phone_number: cleanPhoneNumber,
          status: 'active',
          workspace_id: formData.workspace_id || null,
          default_column_id: formData.default_column_id || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const generatedWebhookUrl = `https://pxvembsxhwvpotydtiqa.supabase.co/functions/v1/twilio-webhook?connectionId=${connection.id}`;
      setWebhookUrl(generatedWebhookUrl);
      setConnectionCreated(true);

      toast({
        title: "¡Éxito!",
        description: "Conexión de Twilio creada correctamente",
      });
      
    } catch (error: any) {
      console.error('Error creating Twilio connection:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la conexión",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span className="text-2xl">📞</span>
            <span>Conectar Twilio WhatsApp</span>
          </DialogTitle>
        </DialogHeader>

        {!connectionCreated ? (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="connection_name">Nombre de la conexión *</Label>
              <Input
                id="connection_name"
                value={formData.connection_name}
                onChange={(e) => setFormData({ ...formData, connection_name: e.target.value })}
                placeholder="Ej: Twilio Principal"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_sid">Account SID *</Label>
              <Input
                id="account_sid"
                value={formData.account_sid}
                onChange={(e) => setFormData({ ...formData, account_sid: e.target.value })}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="auth_token">Auth Token *</Label>
              <Input
                id="auth_token"
                type="password"
                value={formData.auth_token}
                onChange={(e) => setFormData({ ...formData, auth_token: e.target.value })}
                placeholder="••••••••••••••••••••••••••••••••"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Número de WhatsApp Business *</Label>
              <Input
                id="phone"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                placeholder="1234567890 (sin + ni espacios)"
                required
              />
              <p className="text-xs text-muted-foreground">
                Ingresa solo dígitos, sin el prefijo + (ej: 1234567890)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workspace">Espacio de trabajo (opcional)</Label>
              <Select
                value={formData.workspace_id}
                onValueChange={(value) => setFormData({ ...formData, workspace_id: value, default_column_id: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un espacio" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((workspace) => (
                    <SelectItem key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="column">Columna predeterminada (opcional)</Label>
              <Select
                value={formData.default_column_id}
                onValueChange={(value) => setFormData({ ...formData, default_column_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una columna" />
                </SelectTrigger>
                <SelectContent>
                  {leadColumns.map((column) => (
                    <SelectItem key={column.id} value={column.id}>
                      {column.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Crear Conexión
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 py-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                ¡Conexión creada exitosamente! Ahora configura el webhook en Twilio.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>URL del Webhook</Label>
              <div className="flex gap-2">
                <Input value={webhookUrl} readOnly className="font-mono text-sm" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(webhookUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-semibold">Instrucciones:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Ve a la consola de Twilio</li>
                <li>Navega a Messaging → Try it out → Send a WhatsApp message</li>
                <li>Selecciona tu WhatsApp Sender</li>
                <li>En "Sandbox Settings" o "WhatsApp Sender Configuration"</li>
                <li>Configura "When a message comes in" con la URL del webhook</li>
                <li>Método: HTTP POST</li>
                <li>Guarda los cambios</li>
              </ol>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleClose}>
                Finalizar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TwilioConnectionForm;
