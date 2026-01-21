import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Facebook, Instagram, Loader2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFacebookConnections, FacebookPage } from '@/hooks/useFacebookConnections';
import { useSearchParams } from 'react-router-dom';

interface Workspace {
  id: string;
  name: string;
}

interface LeadColumn {
  id: string;
  name: string;
  workspace_id: string;
}

interface PageConfig {
  workspaceId?: string;
  columnId?: string;
  aiEnabled: boolean;
  n8nWebhookUrl?: string;
}

interface FacebookConnectionFormProps {
  userId: string;
  workspaces: Workspace[];
  embudos: LeadColumn[];
  onClose: () => void;
  onSuccess: () => void;
}

const SUPABASE_URL = 'https://pxvembsxhwvpotydtiqa.supabase.co';
const FACEBOOK_APP_ID = '676996378445410';

export function FacebookConnectionForm({
  userId,
  workspaces,
  embudos,
  onClose,
  onSuccess,
}: FacebookConnectionFormProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { createConnection } = useFacebookConnections(userId);

  const [step, setStep] = useState<'login' | 'select-pages' | 'configure'>('login');
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [pageConfigs, setPageConfigs] = useState<Record<string, PageConfig>>({});

  // Check for OAuth callback results on mount
  useEffect(() => {
    const fbSuccess = searchParams.get('fb_success');
    const fbError = searchParams.get('fb_error');
    const fbPages = searchParams.get('fb_pages');

    if (fbError) {
      toast({
        title: 'Error de Facebook',
        description: decodeURIComponent(fbError),
        variant: 'destructive',
      });
      searchParams.delete('fb_error');
      setSearchParams(searchParams);
    }

    if (fbSuccess === 'true' && fbPages) {
      try {
        const decodedPages = JSON.parse(decodeURIComponent(atob(fbPages)));
        setPages(decodedPages);
        setStep('select-pages');
        
        const initialConfigs: Record<string, PageConfig> = {};
        decodedPages.forEach((page: FacebookPage) => {
          initialConfigs[page.id] = {
            aiEnabled: false,
          };
        });
        setPageConfigs(initialConfigs);

        searchParams.delete('fb_success');
        searchParams.delete('fb_pages');
        searchParams.delete('fb_user_id');
        setSearchParams(searchParams);
      } catch (e) {
        console.error('Error parsing Facebook pages:', e);
        toast({
          title: 'Error',
          description: 'No se pudieron procesar las páginas de Facebook',
          variant: 'destructive',
        });
      }
    }
  }, [searchParams, setSearchParams, toast]);

  const handleFacebookLogin = () => {
    const redirectUri = `${SUPABASE_URL}/functions/v1/facebook-oauth-callback`;
    const scope = 'pages_messaging,pages_read_engagement,pages_manage_metadata,instagram_basic,instagram_manage_messages';
    
    const loginUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${FACEBOOK_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${scope}` +
      `&state=${userId}`;

    window.location.href = loginUrl;
  };

  const handlePageToggle = (pageId: string) => {
    setSelectedPages((prev) =>
      prev.includes(pageId)
        ? prev.filter((id) => id !== pageId)
        : [...prev, pageId]
    );
  };

  const handleConfigChange = (
    pageId: string,
    field: keyof PageConfig,
    value: string | boolean
  ) => {
    setPageConfigs((prev) => ({
      ...prev,
      [pageId]: {
        ...prev[pageId],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    if (selectedPages.length === 0) {
      toast({
        title: 'Selecciona al menos una página',
        description: 'Debes seleccionar al menos una página para conectar',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      for (const pageId of selectedPages) {
        const page = pages.find((p) => p.id === pageId);
        if (!page) continue;

        const config = pageConfigs[pageId];
        await createConnection(
          page,
          config?.workspaceId,
          config?.columnId,
          config?.aiEnabled,
          config?.n8nWebhookUrl
        );
      }

      toast({
        title: 'Conexiones creadas',
        description: `Se conectaron ${selectedPages.length} página(s) exitosamente`,
      });

      onSuccess();
    } catch (error) {
      console.error('Error creating connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmbudos = (workspaceId?: string) =>
    embudos.filter((e) => e.workspace_id === workspaceId);

  return (
    <div className="space-y-6">
      {step === 'login' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Facebook className="h-5 w-5 text-primary" />
              Conectar Facebook e Instagram
            </CardTitle>
            <CardDescription>
              Inicia sesión con Facebook para conectar tus páginas de negocio y cuentas de Instagram.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <h4 className="font-medium text-foreground">
                Permisos requeridos:
              </h4>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>• Administrar mensajes de páginas</li>
                <li>• Leer información de páginas</li>
                <li>• Administrar mensajes de Instagram (si tienes Instagram Business)</li>
              </ul>
            </div>

            <Button
              onClick={handleFacebookLogin}
              className="w-full"
              size="lg"
            >
              <Facebook className="mr-2 h-5 w-5" />
              Continuar con Facebook
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Al continuar, serás redirigido a Facebook para autorizar la aplicación.
            </p>
          </CardContent>
        </Card>
      )}

      {step === 'select-pages' && (
        <Card>
          <CardHeader>
            <CardTitle>Selecciona tus páginas</CardTitle>
            <CardDescription>
              Elige las páginas que deseas conectar. Las páginas con Instagram Business vinculado
              también recibirán mensajes de Instagram.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pages.length === 0 ? (
              <div className="rounded-lg border border-warning/20 bg-warning/5 p-4">
                <p className="text-sm text-muted-foreground">
                  No se encontraron páginas asociadas a tu cuenta. Asegúrate de tener al menos
                  una página de Facebook donde seas administrador.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pages.map((page) => (
                  <div
                    key={page.id}
                    className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                      selectedPages.includes(page.id)
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedPages.includes(page.id)}
                        onCheckedChange={() => handlePageToggle(page.id)}
                      />
                      <div>
                        <p className="font-medium">{page.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Facebook className="h-3 w-3" />
                          <span>Messenger</span>
                          {page.instagram_username && (
                            <>
                              <span>•</span>
                              <Instagram className="h-3 w-3" />
                              <span>@{page.instagram_username}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {page.instagram_account_id && (
                      <Badge variant="secondary">
                        <Instagram className="mr-1 h-3 w-3" />
                        Instagram
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button
                onClick={() => setStep('configure')}
                disabled={selectedPages.length === 0}
                className="flex-1"
              >
                Continuar ({selectedPages.length} seleccionada{selectedPages.length !== 1 ? 's' : ''})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'configure' && (
        <Card>
          <CardHeader>
            <CardTitle>Configurar conexiones</CardTitle>
            <CardDescription>
              Configura las opciones para cada página seleccionada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedPages.map((pageId) => {
              const page = pages.find((p) => p.id === pageId);
              if (!page) return null;
              const config = pageConfigs[pageId] || { aiEnabled: false };

              return (
                <div key={pageId} className="space-y-4 rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <Facebook className="h-4 w-4 text-primary" />
                    <span className="font-medium">{page.name}</span>
                    {page.instagram_username && (
                      <Badge variant="outline" className="ml-auto">
                        <Instagram className="mr-1 h-3 w-3" />
                        @{page.instagram_username}
                      </Badge>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Workspace</Label>
                      <Select
                        value={config.workspaceId || ''}
                        onValueChange={(value) =>
                          handleConfigChange(pageId, 'workspaceId', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar workspace" />
                        </SelectTrigger>
                        <SelectContent>
                          {workspaces.map((ws) => (
                            <SelectItem key={ws.id} value={ws.id}>
                              {ws.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Embudo por defecto</Label>
                      <Select
                        value={config.columnId || ''}
                        onValueChange={(value) =>
                          handleConfigChange(pageId, 'columnId', value)
                        }
                        disabled={!config.workspaceId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar embudo" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredEmbudos(config.workspaceId).map((col) => (
                            <SelectItem key={col.id} value={col.id}>
                              {col.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Habilitar IA</Label>
                      <p className="text-xs text-muted-foreground">
                        Respuestas automáticas con inteligencia artificial
                      </p>
                    </div>
                    <Switch
                      checked={config.aiEnabled || false}
                      onCheckedChange={(checked) =>
                        handleConfigChange(pageId, 'aiEnabled', checked)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Webhook n8n (opcional)</Label>
                    <Input
                      placeholder="https://n8n.example.com/webhook/..."
                      value={config.n8nWebhookUrl || ''}
                      onChange={(e) =>
                        handleConfigChange(pageId, 'n8nWebhookUrl', e.target.value)
                      }
                    />
                  </div>
                </div>
              );
            })}

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setStep('select-pages')}
                className="flex-1"
              >
                Atrás
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Conectar {selectedPages.length} página{selectedPages.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
