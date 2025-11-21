import React, { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';

import Integrations from '@/components/Integrations';
import { User, Lock, Phone, Building, Mail, Save, Eye, EyeOff, Settings as SettingsIcon, Key, Bot } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useBotAutoStop } from '@/hooks/useBotAutoStop';

interface UserProfile {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company_name: string | null;
}

const Settings = () => {
  const [profile, setProfile] = useState<UserProfile>({
    first_name: '',
    last_name: '',
    phone: '',
    company_name: ''
  });
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { effectiveUserId } = useEffectiveUserId();
  const { autoStopEnabled, isLoading: isBotLoading, toggleAutoStop } = useBotAutoStop();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      if (!effectiveUserId) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, company_name')
        .eq('id', effectiveUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el perfil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveUserId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: effectiveUserId,
          ...profile,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Perfil actualizado correctamente",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwords.new !== passwords.confirm) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      });
      return;
    }

    if (passwords.new.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new
      });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Contraseña cambiada correctamente",
      });

      setPasswords({ current: '', new: '', confirm: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: "No se pudo cambiar la contraseña",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
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
    
      <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center space-x-2">
        <SettingsIcon className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">Configuración</h1>
      </div>
      
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="bot" className="flex items-center space-x-2">
              <Bot className="h-4 w-4" />
              <span>Bot</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center space-x-2">
              <Key className="h-4 w-4" />
              <span>Integraciones</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Información Personal */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Información Personal</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    {/* Email (Solo lectura) */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span>Correo Electrónico</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground">
                        El correo electrónico no se puede modificar
                      </p>
                    </div>

                    {/* Nombre */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first_name">Nombre</Label>
                        <Input
                          id="first_name"
                          type="text"
                          value={profile.first_name || ''}
                          onChange={(e) => setProfile(prev => ({ ...prev, first_name: e.target.value }))}
                          placeholder="Tu nombre"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">Apellido</Label>
                        <Input
                          id="last_name"
                          type="text"
                          value={profile.last_name || ''}
                          onChange={(e) => setProfile(prev => ({ ...prev, last_name: e.target.value }))}
                          placeholder="Tu apellido"
                        />
                      </div>
                    </div>

                    {/* Teléfono */}
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center space-x-2">
                        <Phone className="h-4 w-4" />
                        <span>Teléfono</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={profile.phone || ''}
                        onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+54 9 11 1234-5678"
                      />
                    </div>

                    {/* Empresa */}
                    <div className="space-y-2">
                      <Label htmlFor="company_name" className="flex items-center space-x-2">
                        <Building className="h-4 w-4" />
                        <span>Empresa</span>
                      </Label>
                      <Input
                        id="company_name"
                        type="text"
                        value={profile.company_name || ''}
                        onChange={(e) => setProfile(prev => ({ ...prev, company_name: e.target.value }))}
                        placeholder="Nombre de tu empresa"
                      />
                    </div>

                    <Button type="submit" disabled={saving} className="w-full">
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Cambio de Contraseña */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Lock className="h-5 w-5" />
                    <span>Cambiar Contraseña</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    {/* Contraseña Nueva */}
                    <div className="space-y-2">
                      <Label htmlFor="new_password">Nueva Contraseña</Label>
                      <div className="relative">
                        <Input
                          id="new_password"
                          type={showPasswords.new ? "text" : "password"}
                          value={passwords.new}
                          onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                          placeholder="Mínimo 6 caracteres"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => togglePasswordVisibility('new')}
                        >
                          {showPasswords.new ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Confirmar Contraseña */}
                    <div className="space-y-2">
                      <Label htmlFor="confirm_password">Confirmar Nueva Contraseña</Label>
                      <div className="relative">
                        <Input
                          id="confirm_password"
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwords.confirm}
                          onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                          placeholder="Repite la nueva contraseña"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => togglePasswordVisibility('confirm')}
                        >
                          {showPasswords.confirm ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    <Button 
                      type="submit" 
                      disabled={changingPassword || !passwords.new || !passwords.confirm}
                      className="w-full"
                      variant="outline"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      {changingPassword ? 'Cambiando...' : 'Cambiar Contraseña'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Información adicional */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Información de la Cuenta</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-muted-foreground">Tipo de Cuenta</p>
                      <p className="capitalize">Cliente</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Fecha de Registro</p>
                      <p>{user?.created_at ? new Date(user.created_at).toLocaleDateString('es-ES') : 'No disponible'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="bot" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bot className="h-5 w-5" />
                  <span>Configuración del Bot</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="auto-stop" className="text-base font-medium">
                      Auto-detención al responder
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Cuando está activo, el bot se detendrá automáticamente para un contacto cuando tú respondas manualmente en la conversación. 
                      Si está inactivo, el bot seguirá respondiendo aunque escribas.
                    </p>
                  </div>
                  <Switch
                    id="auto-stop"
                    checked={autoStopEnabled}
                    onCheckedChange={toggleAutoStop}
                    disabled={isBotLoading}
                  />
                </div>
                
                <Separator />
                
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium">¿Cómo funciona?</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Si está <strong>activado</strong>: Cuando un contacto escribe y tú respondes desde el chat, el bot se desactiva automáticamente para ese contacto.</li>
                    <li>Si está <strong>desactivado</strong>: El bot seguirá respondiendo incluso si intervienes en la conversación.</li>
                    <li>Esto afecta a todas las conversaciones y también se combina con la configuración individual de cada contacto.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="integrations" className="mt-6">
            <Integrations />
          </TabsContent>
        </Tabs>
      </div>
    
  );
};

export default Settings;