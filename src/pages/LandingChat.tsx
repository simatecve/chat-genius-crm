import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { MessageSquare, Settings, ArrowLeft, Send, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface LandingConversation {
  id: string;
  session_id: string;
  visitor_name: string | null;
  visitor_email: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

interface LandingMessage {
  id: string;
  conversation_id: string;
  content: string;
  direction: string;
  created_at: string;
}

interface LandingConfig {
  id: string;
  cashier_number: string;
  cbu: string;
}

const LandingChat = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('conversations');
  const [conversations, setConversations] = useState<LandingConversation[]>([]);
  const [messages, setMessages] = useState<LandingMessage[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<LandingConversation | null>(null);
  const [config, setConfig] = useState<LandingConfig | null>(null);
  const [cashierNumber, setCashierNumber] = useState('');
  const [cbu, setCbu] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  // Fetch conversations
  const fetchConversations = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('landing_chat_conversations')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching conversations:', error);
      return;
    }
    
    setConversations(data || []);
    setLoading(false);
  };

  // Fetch messages for a conversation
  const fetchMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('landing_chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }
    
    setMessages(data || []);
  };

  // Fetch config
  const fetchConfig = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('landing_chat_config')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching config:', error);
      return;
    }
    
    if (data) {
      setConfig(data);
      setCashierNumber(data.cashier_number || '');
      setCbu(data.cbu || '');
    }
  };

  // Save config
  const saveConfig = async () => {
    if (!user) return;
    
    setSavingConfig(true);
    
    const configData = {
      cashier_number: cashierNumber,
      cbu: cbu,
      user_id: user.id,
      updated_at: new Date().toISOString()
    };
    
    if (config) {
      const { error } = await supabase
        .from('landing_chat_config')
        .update(configData)
        .eq('id', config.id);
      
      if (error) {
        toast.error('Error al guardar la configuración');
        console.error('Error saving config:', error);
      } else {
        toast.success('Configuración guardada correctamente');
      }
    } else {
      const { error } = await supabase
        .from('landing_chat_config')
        .insert(configData);
      
      if (error) {
        toast.error('Error al guardar la configuración');
        console.error('Error saving config:', error);
      } else {
        toast.success('Configuración guardada correctamente');
        fetchConfig();
      }
    }
    
    setSavingConfig(false);
  };

  // Send message
  const sendMessage = async () => {
    if (!user || !selectedConversation || !newMessage.trim()) return;
    
    const { error } = await supabase
      .from('landing_chat_messages')
      .insert({
        conversation_id: selectedConversation.id,
        content: newMessage.trim(),
        direction: 'outbound',
        user_id: user.id
      });
    
    if (error) {
      toast.error('Error al enviar mensaje');
      console.error('Error sending message:', error);
      return;
    }
    
    setNewMessage('');
    fetchMessages(selectedConversation.id);
  };

  useEffect(() => {
    fetchConversations();
    fetchConfig();
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const conversationsChannel = supabase
      .channel('landing-conversations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'landing_chat_conversations'
      }, () => {
        fetchConversations();
      })
      .subscribe();

    const messagesChannel = supabase
      .channel('landing-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'landing_chat_messages'
      }, (payload) => {
        if (selectedConversation && payload.new.conversation_id === selectedConversation.id) {
          fetchMessages(selectedConversation.id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [user, selectedConversation]);

  return (
    <AppLayout>
      <div className="h-full flex flex-col bg-background">
        <div className="border-b border-border p-4">
          <h1 className="text-2xl font-bold text-foreground">Chat - Landing</h1>
          <p className="text-muted-foreground text-sm">Gestiona las conversaciones del chat de tu landing page</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-4 w-fit">
            <TabsTrigger value="conversations" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversaciones
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuración
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conversations" className="flex-1 p-4">
            <div className="h-full flex gap-4">
              {/* Conversations List */}
              <Card className="w-80 flex flex-col">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Conversaciones</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-0">
                  <ScrollArea className="h-[calc(100vh-320px)]">
                    {loading ? (
                      <div className="p-4 text-center text-muted-foreground">Cargando...</div>
                    ) : conversations.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        No hay conversaciones aún
                      </div>
                    ) : (
                      conversations.map((conv) => (
                        <div
                          key={conv.id}
                          onClick={() => setSelectedConversation(conv)}
                          className={`p-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${
                            selectedConversation?.id === conv.id ? 'bg-muted' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm text-foreground">
                              {conv.visitor_name || 'Visitante'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(conv.created_at), 'dd/MM', { locale: es })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            ID: {conv.session_id.substring(0, 8)}...
                          </p>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Messages Area */}
              <Card className="flex-1 flex flex-col">
                {selectedConversation ? (
                  <>
                    <CardHeader className="py-3 border-b border-border">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedConversation(null)}
                          className="md:hidden"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                          <CardTitle className="text-sm font-medium">
                            {selectedConversation.visitor_name || 'Visitante'}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {selectedConversation.visitor_email || selectedConversation.session_id}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 flex flex-col">
                      <ScrollArea className="flex-1 p-4">
                        <div className="space-y-3">
                          {messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[70%] p-3 rounded-lg ${
                                  msg.direction === 'outbound'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-foreground'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  {msg.direction === 'inbound' ? (
                                    <ArrowDownLeft className="h-3 w-3" />
                                  ) : (
                                    <ArrowUpRight className="h-3 w-3" />
                                  )}
                                  <span className="text-xs opacity-70">
                                    {msg.direction === 'inbound' ? 'Recibido' : 'Enviado'}
                                  </span>
                                </div>
                                <p className="text-sm">{msg.content}</p>
                                <p className="text-xs opacity-70 mt-1 text-right">
                                  {format(new Date(msg.created_at), 'HH:mm', { locale: es })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <div className="p-4 border-t border-border">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Escribe un mensaje..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            className="flex-1"
                          />
                          <Button onClick={sendMessage} size="icon">
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <CardContent className="flex-1 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Selecciona una conversación para ver los mensajes</p>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="config" className="flex-1 p-4">
            <Card className="max-w-lg">
              <CardHeader>
                <CardTitle>Configuración del Chat Landing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Número de Cajero
                  </label>
                  <Input
                    placeholder="Ej: +54 9 11 1234-5678"
                    value={cashierNumber}
                    onChange={(e) => setCashierNumber(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Número de contacto del cajero para operaciones
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    CBU
                  </label>
                  <Input
                    placeholder="Ingresa el CBU"
                    value={cbu}
                    onChange={(e) => setCbu(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    CBU para transferencias bancarias
                  </p>
                </div>

                <Button 
                  onClick={saveConfig} 
                  disabled={savingConfig}
                  className="w-full"
                >
                  {savingConfig ? 'Guardando...' : 'Guardar Configuración'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default LandingChat;