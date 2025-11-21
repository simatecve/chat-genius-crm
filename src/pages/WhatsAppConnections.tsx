import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Phone, List, Trash2, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import UsageLimitAlert from '@/components/UsageLimitAlert';



interface WhatsAppConnection {
  id: string;
  name: string;
  phone_number: string;
  color: string;
  status: string;
  created_at: string;
}

const colorOptions = [
  { name: 'Azul', value: '#3b82f6', bg: 'bg-blue-500' },
  { name: 'Verde', value: '#10b981', bg: 'bg-emerald-500' },
  { name: 'Rojo', value: '#ef4444', bg: 'bg-red-500' },
  { name: 'Púrpura', value: '#8b5cf6', bg: 'bg-violet-500' },
  { name: 'Naranja', value: '#f97316', bg: 'bg-orange-500' },
  { name: 'Rosa', value: '#ec4899', bg: 'bg-pink-500' },
];

const WhatsAppConnections = () => {
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<string>('');
  const [verifying, setVerifying] = useState<string | null>(null); // Agregar esta línea
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    color: '#3b82f6'
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const { effectiveUserId, loading: userIdLoading } = useEffectiveUserId();
  const { enforceLimit, incrementUsage } = useUsageLimits();

  useEffect(() => {
    // Solo ejecutar fetchConnections cuando tenemos un effectiveUserId válido
    if (!userIdLoading && effectiveUserId) {
      fetchConnections();
    }
  }, [effectiveUserId, userIdLoading]);

  const fetchConnections = async () => {
    // Verificar que tengamos un effectiveUserId válido antes de hacer la consulta
    if (!effectiveUserId) {
      console.log('No effectiveUserId available, skipping fetch');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las conexiones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQRConnect = async (sessionName: string) => {
    setCurrentSession(sessionName);
    setQrModalOpen(true);
    setQrLoading(true);
    setQrImage(null);

    try {
      const response = await fetch('https://n8n.kanbanpro.com.ar/webhook/qr_instancia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_name: sessionName
        })
      });

      if (!response.ok) {
        throw new Error(`Error en webhook QR: ${response.status} ${response.statusText}`);
      }

      const qrData = await response.text();
      
      // Convertir la respuesta en una imagen base64
      const qrImageUrl = `data:image/png;base64,${qrData}`;
      setQrImage(qrImageUrl);
      
    } catch (error: any) {
      console.error('Error getting QR code:', error);
      toast({
        title: "Error",
        description: "No se pudo obtener el código QR. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setQrLoading(false);
    }
  };

  const handleQRConnected = async () => {
    if (!currentSession) {
      toast({
        title: "Error",
        description: "No hay sesión activa para verificar.",
        variant: "destructive",
      });
      return;
    }

    if (!effectiveUserId) {
      toast({
        title: "Error",
        description: "Usuario no autenticado",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Verificando estatus para:', currentSession);
      
      // Usar el mismo webhook que handleVerifyStatus
      const response = await fetch('https://n8n.kanbanpro.com.ar/webhook/estatus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_name: currentSession
        })
      });
  
      if (!response.ok) {
        throw new Error(`Error del webhook: ${response.status}`);
      }
  
      // Obtener respuesta como texto primero
      const responseText = await response.text();
      console.log('Respuesta del webhook (texto):', responseText);
      
      let newStatus = 'desconectado';
      
      try {
        // Intentar parsear como JSON
        const webhookData = JSON.parse(responseText);
        console.log('Datos parseados como JSON:', webhookData);
        
        // Si es un array con objetos
        if (Array.isArray(webhookData) && webhookData.length > 0) {
          const connectionData = webhookData[0];
          if (connectionData.status === 'WORKING') {
            newStatus = 'conectado';
          }
        }
      } catch (jsonError) {
        // Si no es JSON válido, verificar si el texto contiene WORKING
        console.log('No es JSON, verificando texto plano:', responseText);
        if (responseText.trim().toUpperCase() === 'WORKING') {
          newStatus = 'conectado';
        }
      }
      
      console.log('Actualizando estatus a:', newStatus);
      
      // Actualizar en la base de datos
      const { error: updateError } = await supabase
        .from('whatsapp_connections')
        .update({ status: newStatus })
        .eq('name', currentSession)
        .eq('user_id', effectiveUserId);
  
      if (updateError) {
        console.error('Error actualizando BD:', updateError);
        throw new Error('Error actualizando base de datos');
      }
      
      toast({
        title: "¡Conexión verificada!",
        description: `Conexión ${newStatus}`,
      });
      
    } catch (error: any) {
      console.error('Error verificando conexión:', error);
      toast({
        title: "Error de verificación",
        description: "No se pudo verificar el estado de la conexión. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      // Cerrar modal y limpiar estado
      setQrModalOpen(false);
      setQrImage(null);
      setCurrentSession('');
      
      // Actualizar la lista de conexiones para reflejar cualquier cambio de estado
      fetchConnections();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone_number) {
      toast({
        title: "Error",
        description: "Por favor, completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id || !effectiveUserId) {
      toast({
        title: "Error",
        description: "Usuario no autenticado",
        variant: "destructive",
      });
      return;
    }

    // Verificar límites antes de crear la conexión
    const canCreate = await enforceLimit('whatsapp_connections', 1);
    if (!canCreate) {
      return;
    }

    setCreating(true);
    try {
      // Primero obtener los datos completos del perfil del usuario
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, company_name, plan_type, profile_type')
        .eq('id', effectiveUserId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }

      // Preparar todos los datos del usuario para enviar al webhook
      const userData = {
        // Datos de autenticación
        user_id: effectiveUserId,
        email: user.email,
        
        // Datos del perfil
        first_name: profileData?.first_name || null,
        last_name: profileData?.last_name || null,
        phone: profileData?.phone || null,
        company_name: profileData?.company_name || null,
        plan_type: profileData?.plan_type || null,
        profile_type: profileData?.profile_type || null,
        
        // Datos de la conexión WhatsApp
        nombre_instancia: formData.name,
        telefono: formData.phone_number,
        color: formData.color,
        
        // Metadatos adicionales
        created_at: new Date().toISOString(),
        user_agent: navigator.userAgent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      // Ejecutar el webhook de n8n con todos los datos del usuario
      const webhookResponse = await fetch('https://n8n.kanbanpro.com.ar/webhook/crear_instancia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      if (!webhookResponse.ok) {
        throw new Error(`Error en webhook: ${webhookResponse.status} ${webhookResponse.statusText}`);
      }

      const webhookData = await webhookResponse.json();
      console.log('Webhook response:', webhookData);

      // Si el webhook fue exitoso, guardar en la base de datos
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .insert({
          user_id: effectiveUserId,
          name: formData.name,
          phone_number: formData.phone_number,
          color: formData.color,
          status: 'desconectado'
        })
        .select()
        .single();

      if (error) throw error;

      // Incrementar uso después de crear exitosamente
      await incrementUsage('whatsapp_connections', 1);

      toast({
        title: "Conexión creada",
        description: "La conexión de WhatsApp se creó correctamente y la instancia fue configurada con todos tus datos",
      });

      setDialogOpen(false);
      setFormData({ name: '', phone_number: '', color: '#3b82f6' });
      fetchConnections();
    } catch (error: any) {
      console.error('Error creating connection:', error);
      
      // Mostrar mensaje de error más específico
      let errorMessage = "No se pudo crear la conexión";
      if (error.message.includes('webhook')) {
        errorMessage = "Error al configurar la instancia de WhatsApp. Verifica la conexión con el servidor.";
      } else if (error.message.includes('profiles')) {
        errorMessage = "Error al obtener los datos del perfil. Verifica tu información de usuario.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (connectionId: string, connectionName: string) => {
    if (!effectiveUserId) {
      toast({
        title: "Error",
        description: "Usuario no autenticado",
        variant: "destructive",
      });
      return;
    }

    setDeleting(connectionId);
    try {
      const { error } = await supabase
        .from('whatsapp_connections')
        .delete()
        .eq('id', connectionId)
        .eq('user_id', effectiveUserId);

      if (error) throw error;

      toast({
        title: "Conexión eliminada",
        description: `La conexión "${connectionName}" se eliminó correctamente`,
      });

      fetchConnections();
    } catch (error: any) {
      console.error('Error deleting connection:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la conexión",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleVerifyStatus = async (sessionName: string, connectionId: string) => {
    if (!effectiveUserId) {
      toast({
        title: "Error",
        description: "Usuario no autenticado",
        variant: "destructive",
      });
      return;
    }

    setVerifying(connectionId);
    
    try {
      console.log('Verificando estatus para:', sessionName);
      
      const response = await fetch('https://n8n.kanbanpro.com.ar/webhook/estatus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_name: sessionName
        })
      });
  
      if (!response.ok) {
        throw new Error(`Error del webhook: ${response.status}`);
      }
  
      // Obtener respuesta como texto primero
      const responseText = await response.text();
      console.log('Respuesta del webhook (texto):', responseText);
      
      let newStatus = 'desconectado';
      
      try {
        // Intentar parsear como JSON
        const webhookData = JSON.parse(responseText);
        console.log('Datos parseados como JSON:', webhookData);
        
        // Si es un array con objetos
        if (Array.isArray(webhookData) && webhookData.length > 0) {
          const connectionData = webhookData[0];
          if (connectionData.status === 'WORKING') {
            newStatus = 'conectado';
          }
        }
      } catch (jsonError) {
        // Si no es JSON válido, verificar si el texto contiene WORKING
        console.log('No es JSON, verificando texto plano:', responseText);
        if (responseText.trim().toUpperCase() === 'WORKING') {
          newStatus = 'conectado';
        }
      }
      
      console.log('Actualizando estatus a:', newStatus);
      
      // Actualizar en la base de datos
      const { error: updateError } = await supabase
        .from('whatsapp_connections')
        .update({ status: newStatus })
        .eq('id', connectionId)
        .eq('user_id', effectiveUserId);
  
      if (updateError) {
        console.error('Error actualizando BD:', updateError);
        throw new Error('Error actualizando base de datos');
      }
      
      toast({
        title: "Estatus verificado",
        description: `Conexión ${newStatus}`,
      });
      
      // Refrescar la lista
      fetchConnections();
      
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudo verificar el estatus",
        variant: "destructive",
      });
    } finally {
      setVerifying(null);
    }
  };

  const getColorOption = (colorValue: string) => {
    return colorOptions.find(opt => opt.value === colorValue) || colorOptions[0];
  };

  if (loading || userIdLoading) {
    return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Conexiones WhatsApp</h1>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
    );
  }

  return (
    
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Conexiones WhatsApp</h1>
            <p className="text-muted-foreground">Gestiona tus conexiones de WhatsApp</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90 transition-all duration-200 shadow-glow">
                <Plus className="h-4 w-4 mr-2" />
              Nueva Conexión
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nueva Conexión de WhatsApp</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la conexión</Label>
                <Input
                  id="name"
                  placeholder="Ej: WhatsApp Principal"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={creating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Número de WhatsApp</Label>
                <Input
                  id="phone"
                  placeholder="Ej: +5491123456789"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  disabled={creating}
                />
              </div>
              <div className="space-y-2">
                <Label>Color de identificación</Label>
                <div className="grid grid-cols-3 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-all ${
                        formData.color === color.value 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      disabled={creating}
                    >
                      <div className={`w-4 h-4 rounded-full ${color.bg}`}></div>
                      <span className="text-sm">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-emerald-500 hover:bg-emerald-600"
                disabled={creating}
              >
                {creating ? 'Creando conexión...' : 'Crear Conexión'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Modal QR */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp con Código QR</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Columna izquierda - Código QR */}
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-64 h-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                {qrLoading ? (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground">Generando código QR...</p>
                  </div>
                ) : qrImage ? (
                  <img 
                    src={qrImage} 
                    alt="Código QR de WhatsApp" 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <QrCode className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Código QR no disponible</p>
                  </div>
                )}
              </div>
              <p className="text-sm text-center text-muted-foreground">
                Sesión: <span className="font-medium">{currentSession}</span>
              </p>
            </div>
            
            {/* Columna derecha - Instrucciones */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Instrucciones para conectar</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</div>
                  <p className="text-sm">Abre WhatsApp en tu teléfono</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</div>
                  <p className="text-sm">Ve a <strong>Configuración</strong> → <strong>Dispositivos vinculados</strong></p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</div>
                  <p className="text-sm">Toca <strong>"Vincular un dispositivo"</strong></p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">4</div>
                  <p className="text-sm">Escanea el código QR que aparece a la izquierda</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">5</div>
                  <p className="text-sm">Una vez conectado, haz clic en el botón de abajo</p>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <Button 
                  onClick={handleQRConnected}
                  className="w-full bg-emerald-500 hover:bg-emerald-600"
                  disabled={qrLoading || !qrImage}
                >
                  Ya he conectado mi WhatsApp
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground">
                <p><strong>Nota:</strong> El código QR es válido por tiempo limitado. Si expira, cierra esta ventana y vuelve a intentarlo.</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alerta de límites */}
      <UsageLimitAlert resourceType="whatsapp_connections_used" />

      {connections.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No hay conexiones</h3>
            <p className="text-muted-foreground mb-4">
              Crea tu primera conexión de WhatsApp para comenzar a comunicarte con tus clientes
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {connections.map((connection) => {
            const colorOption = getColorOption(connection.color);
            return (
              <Card key={connection.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div 
                        className={`w-4 h-4 rounded-full ${colorOption.bg}`}
                      ></div>
                      <h3 className="font-semibold">{connection.name}</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        connection.status === 'conectado' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {connection.status}
                      </span>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            disabled={deleting === connection.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar conexión?</AlertDialogTitle>
                            <AlertDialogDescription>
                              ¿Estás seguro de que quieres eliminar la conexión "{connection.name}"? 
                              Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(connection.id, connection.name)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              {deleting === connection.id ? 'Eliminando...' : 'Eliminar'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {connection.phone_number}
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Creado: {new Date(connection.created_at).toLocaleDateString()}
                  </p>
                  
                  {/* Botones de acción */}
                  <div className="space-y-2">
                    {/* Botón Conectar con QR - Solo mostrar si no está conectado */}
                    {connection.status !== 'conectado' && connection.status !== 'working' && (
                      <Button 
                        onClick={() => handleQRConnect(connection.name)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={qrLoading}
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        Conectar con QR
                      </Button>
                    )}
                    
                    {/* Botón Verificar Estatus */}
                    <Button 
                      onClick={() => handleVerifyStatus(connection.name, connection.id)}
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      disabled={verifying === connection.id}
                    >
                      {verifying === connection.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                          Verificando...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Verificar Estatus
                        </>
                      )}
                    </Button>
                    
                    {/* Mensaje para conexiones ya conectadas */}
                    {(connection.status === 'conectado' || connection.status === 'working') && (
                      <div className="w-full p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-md text-center">
                        <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                          ✓ WhatsApp conectado
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-center pt-8">
        <Button variant="outline" size="sm">
          <List className="h-4 w-4 mr-2" />
          Conexiones Existentes
        </Button>
      </div>
      </div>
    
  );
};

export default WhatsAppConnections;