import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { MessageSquare, Settings, ArrowLeft, Send, ArrowDownLeft, ArrowUpRight, Globe, User, MessageCircle, Paperclip, Smile, File } from 'lucide-react';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import EmojiPicker from 'emoji-picker-react';
import { FileUploadService } from '@/services/fileUploadService';

interface LandingConversation {
  id_usuario: string;
  lastMessage: string | null;
  lastMessageTime: string;
  messageCount: number;
}

interface LandingMessage {
  id: number;
  id_usuario: string | null;
  mensaje: string | null;
  orientacion: string | null;
  created_at: string;
}

interface LandingConfig {
  id: string;
  cashier_number: string;
  cbu: string;
}

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch conversations from mensaje_landing grouped by id_usuario
  const fetchConversations = async () => {
    try {
      // Get all messages and group by id_usuario
      const { data, error } = await supabase
        .from('mensaje_landing')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching conversations:', error);
        return;
      }
      
      // Group messages by id_usuario
      const conversationMap = new Map<string, LandingConversation>();
      
      (data || []).forEach((msg) => {
        const idUsuario = msg.id_usuario || 'unknown';
        
        if (!conversationMap.has(idUsuario)) {
          conversationMap.set(idUsuario, {
            id_usuario: idUsuario,
            lastMessage: msg.mensaje,
            lastMessageTime: msg.created_at,
            messageCount: 1
          });
        } else {
          const existing = conversationMap.get(idUsuario)!;
          existing.messageCount++;
          // Update last message if this one is newer
          if (new Date(msg.created_at) > new Date(existing.lastMessageTime)) {
            existing.lastMessage = msg.mensaje;
            existing.lastMessageTime = msg.created_at;
          }
        }
      });
      
      // Convert to array and sort by last message time
      const conversationsArray = Array.from(conversationMap.values())
        .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
      
      setConversations(conversationsArray);
      setLoading(false);
    } catch (err) {
      console.error('Error processing conversations:', err);
      setLoading(false);
    }
  };

  // Fetch messages for a specific id_usuario
  const fetchMessages = async (idUsuario: string) => {
    const { data, error } = await supabase
      .from('mensaje_landing')
      .select('*')
      .eq('id_usuario', idUsuario)
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
    if (!selectedConversation || !newMessage.trim()) return;
    
    const { error } = await supabase
      .from('mensaje_landing')
      .insert({
        id_usuario: selectedConversation.id_usuario,
        mensaje: newMessage.trim(),
        orientacion: 'saliente'
      });
    
    if (error) {
      toast.error('Error al enviar mensaje');
      console.error('Error sending message:', error);
      return;
    }
    
    setNewMessage('');
    fetchMessages(selectedConversation.id_usuario);
  };

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
    fetchConversations();
    fetchConfig();
    fetchWebChatConversations();
  }, [user, effectiveUserId]);

  useEffect(() => {
    if (selectedWebChat) {
      fetchWebChatMessages(selectedWebChat.id);
    }
  }, [selectedWebChat]);

  useEffect(() => {
    webChatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [webChatMessages]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id_usuario);
    }
  }, [selectedConversation]);

  // Subscribe to realtime updates
  useEffect(() => {
    const messagesChannel = supabase
      .channel('mensaje-landing-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mensaje_landing'
      }, (payload) => {
        fetchConversations();
        if (selectedConversation && payload.new && (payload.new as LandingMessage).id_usuario === selectedConversation.id_usuario) {
          fetchMessages(selectedConversation.id_usuario);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [selectedConversation]);

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
        <h1 className="text-3xl font-bold">Chat - Landing</h1>
      </div>
      <p className="text-muted-foreground">Gestiona las conversaciones del chat de tu landing page</p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mx-4 mt-4 w-fit">
          <TabsTrigger value="conversations" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Landing
          </TabsTrigger>
          <TabsTrigger value="webchat" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Web Chat
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuración
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conversations" className="flex-1 p-4">
          <div className="h-[calc(100vh-280px)] flex gap-4">
            {/* Conversations List */}
            <Card className="w-80 flex flex-col bg-card border-border">
              <CardHeader className="py-3 border-b border-border">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Conversaciones ({conversations.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full">
                  {loading ? (
                    <div className="p-4 text-center text-muted-foreground">Cargando...</div>
                  ) : conversations.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No hay conversaciones aún
                    </div>
                  ) : (
                    conversations.map((conv) => (
                      <div
                        key={conv.id_usuario}
                        onClick={() => setSelectedConversation(conv)}
                        className={`p-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedConversation?.id_usuario === conv.id_usuario ? 'bg-muted' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm text-foreground truncate">
                                {conv.id_usuario.length > 12 
                                  ? conv.id_usuario.substring(0, 12) + '...' 
                                  : conv.id_usuario}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(conv.lastMessageTime), 'dd/MM', { locale: es })}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {conv.lastMessage || 'Sin mensaje'}
                            </p>
                            <span className="text-xs text-primary">
                              {conv.messageCount} mensaje{conv.messageCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Messages Area - WhatsApp Style */}
            <Card className="flex-1 flex flex-col bg-[#0d1418] border-border overflow-hidden">
              {selectedConversation ? (
                <>
                  {/* Header */}
                  <CardHeader className="py-3 border-b border-border bg-[#202c33]">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedConversation(null)}
                        className="md:hidden text-foreground"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-medium text-[#e9edef]">
                          Usuario: {selectedConversation.id_usuario}
                        </CardTitle>
                        <p className="text-xs text-[#8696a0]">
                          {selectedConversation.messageCount} mensaje{selectedConversation.messageCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {/* Messages */}
                  <CardContent className="flex-1 p-0 flex flex-col overflow-hidden bg-[#0d1418]">
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-2">
                        {messages.map((msg) => {
                          const isOutgoing = msg.orientacion === 'saliente';
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
                                    {isOutgoing ? 'Enviado' : 'Recibido'}
                                  </span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {msg.mensaje || ''}
                                </p>
                                <p className="text-[10px] text-[#8696a0] mt-1 text-right">
                                  {formatMessageTime(msg.created_at)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                    
                    {/* Input Area */}
                    <div className="p-3 border-t border-border bg-[#202c33]">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Escribe un mensaje..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                          className="flex-1 bg-[#2a3942] border-none text-[#e9edef] placeholder:text-[#8696a0]"
                        />
                        <Button 
                          onClick={sendMessage} 
                          size="icon"
                          className="bg-primary hover:bg-primary/90"
                          disabled={!newMessage.trim()}
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
                    <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">Selecciona una conversación</p>
                    <p className="text-sm mt-1">para ver los mensajes</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </TabsContent>

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
  );
};

export default LandingChat;
