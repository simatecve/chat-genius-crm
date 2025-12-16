import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ArrowLeft, Send, ArrowDownLeft, ArrowUpRight, Globe, MessageCircle, Paperclip, Smile, File, Trash2, Settings, BarChart3 } from 'lucide-react';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import EmojiPicker from 'emoji-picker-react';
import { FileUploadService } from '@/services/fileUploadService';
import { Link } from 'react-router-dom';
import { WebchatConversionStats } from '@/components/landing-chat/WebchatConversionStats';

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

  useEffect(() => {
    fetchWebChatConversations();
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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Globe className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Web Chat</h1>
        </div>
        <Link to="/configuracion" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
          <Settings className="h-4 w-4" />
          Configuración IA
        </Link>
      </div>

      <Tabs defaultValue="conversations" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="conversations" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Conversaciones
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Estadísticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conversations">
          {/* Web Chat Content */}
          <div className="h-[calc(100vh-320px)] flex gap-4">
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
            <Card className="flex-1 flex flex-col bg-background border-border overflow-hidden">
              {selectedWebChat ? (
                <>
                  <CardHeader className="py-3 border-b border-border bg-muted">
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
                          <CardTitle className="text-sm font-medium text-foreground">
                            {selectedWebChat.contact_name || 'Visitante Web'}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
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
                        className="text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
                        title="Borrar memoria de IA"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Borrar Memoria
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex-1 p-0 flex flex-col overflow-hidden bg-background">
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
                                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                                    : 'bg-muted text-foreground rounded-tl-none'
                                }`}
                              >
                                <div className="flex items-center gap-1 mb-0.5">
                                  {isOutgoing ? (
                                    <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                                  ) : (
                                    <ArrowDownLeft className="h-3 w-3 text-muted-foreground" />
                                  )}
                                  <span className="text-[10px] text-muted-foreground">
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
                                  <p className="text-[10px] text-muted-foreground mt-1 text-right">
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
                    <div className="p-3 border-t border-border bg-muted">
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
                          className="text-muted-foreground hover:text-foreground hover:bg-accent"
                          title="Adjuntar archivo"
                        >
                          <Paperclip className="h-5 w-5" />
                        </Button>
                        <Popover open={showWebChatEmoji} onOpenChange={setShowWebChatEmoji}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-foreground hover:bg-accent"
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
                          className="flex-1 bg-input border-border"
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
                <CardContent className="flex-1 flex items-center justify-center bg-background">
                  <div className="text-center text-muted-foreground">
                    <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">Selecciona una conversación</p>
                    <p className="text-sm mt-1">para ver los mensajes del Web Chat</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stats">
          <WebchatConversionStats />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LandingChat;
