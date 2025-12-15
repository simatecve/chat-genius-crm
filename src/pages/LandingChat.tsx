import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Settings, ArrowLeft, Send, ArrowDownLeft, ArrowUpRight, Globe, MessageCircle, Paperclip, Smile, File, Bot, RefreshCw, Trash2 } from 'lucide-react';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import EmojiPicker from 'emoji-picker-react';
import { FileUploadService } from '@/services/fileUploadService';
import { webchatAIService } from '@/services/webchatAIService';

interface WebChatConversation {
  id: string;
  phone_number: string;
  contact_name: string | null;
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number | null;
}

interface WebChatMessage {
  id: string;
  content: string;
  direction: string;
  created_at: string | null;
  is_bot: boolean | null;
  file_url: string | null;
  attachment_url: string | null;
  message_type: string | null;
}

const LandingChat = () => {
  const { user } = useAuth();
  const { effectiveUserId } = useEffectiveUserId();
  const [activeTab, setActiveTab] = useState('webchat');
  
  // Web Chat state
  const [webChatConversations, setWebChatConversations] = useState<WebChatConversation[]>([]);
  const [webChatMessages, setWebChatMessages] = useState<WebChatMessage[]>([]);
  const [selectedWebChat, setSelectedWebChat] = useState<WebChatConversation | null>(null);
  const [webChatNewMessage, setWebChatNewMessage] = useState('');
  const [webChatLoading, setWebChatLoading] = useState(false);
  const [sendingWebChat, setSendingWebChat] = useState(false);
  const [showWebChatEmoji, setShowWebChatEmoji] = useState(false);
  const [webChatAttachment, setWebChatAttachment] = useState<File | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const webChatFileInputRef = useRef<HTMLInputElement>(null);
  const webChatMessagesEndRef = useRef<HTMLDivElement>(null);

  // Webchat AI Config state (isolated from ia_default_settings)
  const [iaLoading, setIaLoading] = useState(true);
  const [iaEnabled, setIaEnabled] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [cashierNumbers, setCashierNumbers] = useState('');
  const [cbu, setCbu] = useState('');
  const [savingIA, setSavingIA] = useState(false);

  // Web Chat Functions
  const fetchWebChatConversations = async () => {
    if (!effectiveUserId) return;
    setWebChatLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('channel_type', 'webchat')
        .order('last_message_time', { ascending: false });

      if (error) {
        console.error('Error fetching webchat conversations:', error);
        return;
      }
      setWebChatConversations(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setWebChatLoading(false);
    }
  };

  const fetchWebChatMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching webchat messages:', error);
      return;
    }
    setWebChatMessages(data || []);
  };

  const sendWebChatMessage = async (attachmentUrl?: string, attachmentType?: string) => {
    if (!selectedWebChat || (!webChatNewMessage.trim() && !attachmentUrl)) return;
    setSendingWebChat(true);
    try {
      const { error } = await supabase.functions.invoke('web-chat-send', {
        body: {
          conversationId: selectedWebChat.id,
          message: webChatNewMessage.trim(),
          userId: effectiveUserId,
          attachmentUrl: attachmentUrl || undefined,
          attachmentType: attachmentType || undefined
        }
      });

      if (error) throw error;
      setWebChatNewMessage('');
      setWebChatAttachment(null);
      fetchWebChatMessages(selectedWebChat.id);
    } catch (error) {
      console.error('Error sending webchat message:', error);
      toast.error('Error al enviar mensaje');
    } finally {
      setSendingWebChat(false);
    }
  };

  const handleWebChatFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedWebChat) return;

    const validation = FileUploadService.validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setUploadingAttachment(true);
    try {
      const result = await FileUploadService.uploadFile(file, effectiveUserId || '', selectedWebChat.id);
      await sendWebChatMessage(result.url, file.type);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Error al subir archivo');
    } finally {
      setUploadingAttachment(false);
      if (webChatFileInputRef.current) {
        webChatFileInputRef.current.value = '';
      }
    }
  };

  const handleWebChatEmojiSelect = (emojiData: any) => {
    setWebChatNewMessage(prev => prev + emojiData.emoji);
    setShowWebChatEmoji(false);
  };

  // Fetch Webchat AI settings (isolated table)
  const fetchWebchatAISettings = async () => {
    if (!effectiveUserId) return;
    try {
      const settings = await webchatAIService.getSettings(effectiveUserId);
      if (settings) {
        setIaEnabled(!!settings.is_enabled);
        setSystemPrompt(settings.system_prompt || webchatAIService.getDefaultPrompt());
        setCashierNumbers(settings.cashier_numbers || '');
        setCbu(settings.cbu || '');
      } else {
        // Set default prompt if no settings exist
        setSystemPrompt(webchatAIService.getDefaultPrompt());
      }
    } catch (error) {
      console.error('Error loading webchat AI settings:', error);
      setSystemPrompt(webchatAIService.getDefaultPrompt());
    } finally {
      setIaLoading(false);
    }
  };

  const saveWebchatAISettings = async () => {
    if (!effectiveUserId) return;
    setSavingIA(true);
    try {
      await webchatAIService.saveSettings({
        user_id: effectiveUserId,
        is_enabled: iaEnabled,
        system_prompt: systemPrompt,
        cashier_numbers: cashierNumbers,
        cbu: cbu,
      });
      toast.success('Configuración de IA guardada');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error al guardar configuración de IA');
    } finally {
      setSavingIA(false);
    }
  };

  const resetPromptToDefault = () => {
    setSystemPrompt(webchatAIService.getDefaultPrompt());
    toast.info('Prompt restaurado al valor predeterminado');
  };

  useEffect(() => {
    fetchWebChatConversations();
    fetchWebchatAISettings();
  }, [effectiveUserId]);

  useEffect(() => {
    if (selectedWebChat) {
      fetchWebChatMessages(selectedWebChat.id);
    }
  }, [selectedWebChat]);

  useEffect(() => {
    webChatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [webChatMessages]);

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return format(date, 'HH:mm', { locale: es });
    } else if (diffDays === 1) {
      return 'Ayer ' + format(date, 'HH:mm', { locale: es });
    } else if (diffDays < 7) {
      return format(date, 'EEEE HH:mm', { locale: es });
    } else {
      return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Globe className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">Web Chat</h1>
      </div>
      <p className="text-muted-foreground">Gestiona las conversaciones del chat web</p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mx-4 mt-4 w-fit">
          <TabsTrigger value="webchat" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Conversaciones
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            IA Web Chat
          </TabsTrigger>
        </TabsList>

        {/* Web Chat Tab */}
        <TabsContent value="webchat" className="flex-1 p-4">
          <div className="h-[calc(100vh-280px)] flex gap-4">
            {/* Web Chat Conversations List */}
            <Card className="w-80 flex flex-col bg-card border-border">
              <CardHeader className="py-3 border-b border-border">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Web Chat ({webChatConversations.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full">
                  {webChatLoading ? (
                    <div className="p-4 text-center text-muted-foreground">Cargando...</div>
                  ) : webChatConversations.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No hay conversaciones de web chat
                    </div>
                  ) : (
                    webChatConversations.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => setSelectedWebChat(conv)}
                        className={`p-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedWebChat?.id === conv.id ? 'bg-muted' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <MessageCircle className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm text-foreground truncate">
                                {conv.contact_name || 'Visitante Web'}
                              </span>
                              {conv.last_message_time && (
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(conv.last_message_time), 'dd/MM', { locale: es })}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {conv.last_message || 'Sin mensaje'}
                            </p>
                            {(conv.unread_count || 0) > 0 && (
                              <span className="inline-flex items-center justify-center w-5 h-5 text-xs bg-primary text-primary-foreground rounded-full">
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Web Chat Messages Area */}
            <Card className="flex-1 flex flex-col bg-[#0d1418] border-border overflow-hidden">
              {selectedWebChat ? (
                <>
                  <CardHeader className="py-3 border-b border-border bg-[#202c33]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedWebChat(null)}
                          className="md:hidden text-foreground"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <MessageCircle className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-medium text-[#e9edef]">
                            {selectedWebChat.contact_name || 'Visitante Web'}
                          </CardTitle>
                          <p className="text-xs text-[#8696a0]">
                            Session: {selectedWebChat.phone_number.substring(0, 12)}...
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (!selectedWebChat) return;
                          if (!confirm('¿Borrar memoria de IA para esta conversación?')) return;
                          const { error } = await supabase
                            .from('messages')
                            .delete()
                            .eq('conversation_id', selectedWebChat.id);
                          if (error) {
                            toast.error('Error al borrar memoria');
                          } else {
                            setWebChatMessages([]);
                            toast.success('Memoria de IA borrada');
                          }
                        }}
                        className="text-[#8696a0] hover:text-red-400 hover:bg-red-400/10"
                        title="Borrar memoria de IA"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Borrar Memoria
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex-1 p-0 flex flex-col overflow-hidden bg-[#0d1418]">
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-2">
                        {webChatMessages.map((msg) => {
                          const isOutgoing = msg.direction === 'outbound';
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[70%] p-2 px-3 rounded-lg shadow-sm ${
                                  isOutgoing
                                    ? 'bg-[#005c4b] text-white rounded-tr-none'
                                    : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                                }`}
                              >
                                <div className="flex items-center gap-1 mb-0.5">
                                  {isOutgoing ? (
                                    <ArrowUpRight className="h-3 w-3 text-[#8696a0]" />
                                  ) : (
                                    <ArrowDownLeft className="h-3 w-3 text-[#8696a0]" />
                                  )}
                                  <span className="text-[10px] text-[#8696a0]">
                                    {isOutgoing ? (msg.is_bot ? 'Bot' : 'Enviado') : 'Recibido'}
                                  </span>
                                </div>
                                {/* Render attachments */}
                                {(msg.file_url || msg.attachment_url) && (
                                  <div className="mb-2">
                                    {msg.message_type === 'image' || (msg.file_url || msg.attachment_url)?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                      <img 
                                        src={msg.file_url || msg.attachment_url || ''} 
                                        alt="Attachment" 
                                        className="max-w-full rounded-lg"
                                      />
                                    ) : (
                                      <a 
                                        href={msg.file_url || msg.attachment_url || ''} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-primary hover:underline"
                                      >
                                        <File className="h-4 w-4" />
                                        <span className="text-sm">Ver archivo</span>
                                      </a>
                                    )}
                                  </div>
                                )}
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {msg.content || ''}
                                </p>
                                {msg.created_at && (
                                  <p className="text-[10px] text-[#8696a0] mt-1 text-right">
                                    {formatMessageTime(msg.created_at)}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        <div ref={webChatMessagesEndRef} />
                      </div>
                    </ScrollArea>
                    
                    {/* Input Area */}
                    <div className="p-3 border-t border-border bg-[#202c33]">
                      <input 
                        type="file" 
                        ref={webChatFileInputRef}
                        onChange={handleWebChatFileSelect}
                        accept="image/*,.pdf,.doc,.docx"
                        className="hidden"
                      />
                      <div className="flex gap-2 items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => webChatFileInputRef.current?.click()}
                          disabled={uploadingAttachment}
                          className="text-[#8696a0] hover:text-foreground hover:bg-[#2a3942]"
                          title="Adjuntar archivo"
                        >
                          <Paperclip className="h-5 w-5" />
                        </Button>
                        <Popover open={showWebChatEmoji} onOpenChange={setShowWebChatEmoji}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-[#8696a0] hover:text-foreground hover:bg-[#2a3942]"
                              title="Emojis"
                            >
                              <Smile className="h-5 w-5" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 border-none" side="top" align="start">
                            <EmojiPicker onEmojiClick={handleWebChatEmojiSelect} />
                          </PopoverContent>
                        </Popover>
                        <Input
                          placeholder="Escribe un mensaje..."
                          value={webChatNewMessage}
                          onChange={(e) => setWebChatNewMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendWebChatMessage()}
                          className="flex-1 bg-[#2a3942] border-none text-[#e9edef] placeholder:text-[#8696a0]"
                        />
                        <Button 
                          onClick={() => sendWebChatMessage()} 
                          size="icon"
                          className="bg-primary hover:bg-primary/90"
                          disabled={(!webChatNewMessage.trim() && !webChatAttachment) || sendingWebChat || uploadingAttachment}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex-1 flex items-center justify-center bg-[#0d1418]">
                  <div className="text-center text-[#8696a0]">
                    <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">Selecciona una conversación</p>
                    <p className="text-sm mt-1">para ver los mensajes del Web Chat</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* IA Web Chat Configuration Tab */}
        <TabsContent value="config" className="flex-1 p-4">
          <div className="max-w-3xl space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  IA Predeterminada para Web Chat
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configuración aislada de la IA general. Solo afecta al Web Chat.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {iaLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <>
                    {/* Enable/Disable */}
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <Label className="text-base font-medium">Activar IA para Web Chat</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          La IA responderá automáticamente a los visitantes del web chat
                        </p>
                      </div>
                      <Switch checked={iaEnabled} onCheckedChange={setIaEnabled} />
                    </div>

                    {/* System Prompt */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium">Prompt del Sistema</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetPromptToDefault}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Restaurar
                        </Button>
                      </div>
                      <Textarea
                        placeholder="Escribe las instrucciones para la IA..."
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        rows={8}
                        className="resize-none font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Define cómo debe comportarse la IA al responder a los visitantes del web chat.
                      </p>
                    </div>

                    {/* Cashier Numbers */}
                    <div className="space-y-2">
                      <Label>Números de Cajeros</Label>
                      <Input
                        placeholder="Ej: +54911..., +549351..."
                        value={cashierNumbers}
                        onChange={(e) => setCashierNumbers(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Estos números se añadirán al contexto de la IA automáticamente
                      </p>
                    </div>

                    {/* CBU */}
                    <div className="space-y-2">
                      <Label>CBU</Label>
                      <Input
                        placeholder="Ingresa el CBU..."
                        value={cbu}
                        onChange={(e) => setCbu(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        CBU para transferencias (se añade al contexto de la IA)
                      </p>
                    </div>

                    <Button onClick={saveWebchatAISettings} disabled={savingIA} className="w-full">
                      {savingIA ? 'Guardando...' : 'Guardar Configuración'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LandingChat;
