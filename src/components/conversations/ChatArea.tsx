import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
import { MoreVertical, Send, Paperclip, Smile, X, BotOff, Bot, Zap, UserCircle, MessageSquare, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { AssignToKanban } from './AssignToKanban';
import EmojiPicker from 'emoji-picker-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AttachmentRenderer from './AttachmentRenderer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useBotBlock } from '@/hooks/useBotBlock';
import { useBotAutoStop } from '@/hooks/useBotAutoStop';
import { useAuth } from '@/hooks/useAuth';
import { useQuickReplies } from '@/hooks/useQuickReplies';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useProfile } from '@/hooks/useProfile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WhatsAppConnection } from '@/hooks/useWhatsAppConnections';
import { TwilioConnection } from '@/hooks/useTwilioConnections';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];

interface ChatAreaProps {
  conversation: Conversation | null;
  messages: Message[];
  onSendMessage: (message: string, attachment?: File) => void;
  isSending: boolean;
  onToggleInfoPanel: () => void;
  whatsappConnections: WhatsAppConnection[];
  selectedSession: string | null;
  onSessionChange: (sessionName: string) => void;
  twilioConnections: TwilioConnection[];
  selectedTwilioConnection: string | null;
  onTwilioConnectionChange: (connectionId: string) => void;
  originalSessionStatus: 'active' | 'disconnected' | 'deleted';
}

const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  messages,
  onSendMessage,
  isSending,
  onToggleInfoPanel,
  whatsappConnections,
  selectedSession,
  onSessionChange,
  twilioConnections,
  selectedTwilioConnection,
  onTwilioConnectionChange,
  originalSessionStatus,
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showQuickReplyDropdown, setShowQuickReplyDropdown] = useState(false);
  const [quickReplyFilter, setQuickReplyFilter] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { quickReplies } = useQuickReplies();
  const { isBlocked, isLoading: isBotToggling, toggleBotBlock } = useBotBlock(
    conversation?.phone_number || null,
    conversation?.pushname || null
  );
  const { autoStopEnabled } = useBotAutoStop();
  const { isCajero } = useProfile();

  // Función para enmascarar números de teléfono
  const maskPhoneNumber = (phone: string | null) => {
    if (!phone) return '';
    return '****' + phone.slice(-4);
  };

  // Auto-scroll al final cuando llegan nuevos mensajes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Manejar envío de mensaje
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !conversation || isSending || isUploading) return;

    try {
      setIsUploading(true);
      let attachment: File | undefined = undefined;

      if (selectedFile) {
        attachment = selectedFile;
      }

      await onSendMessage(newMessage.trim(), attachment);
      
      // Si auto-stop está activado y el bot no está bloqueado, bloquear automáticamente
      if (autoStopEnabled && !isBlocked) {
        await toggleBotBlock();
      }
      
      setNewMessage('');
      setSelectedFile(null);
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Manejar selección de archivo
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tamaño (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Archivo muy grande',
          description: 'El archivo debe ser menor a 10MB',
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  // Manejar selección de emoji
  const handleEmojiSelect = (emoji: any) => {
    setNewMessage(prev => prev + emoji.emoji);
    setShowEmojiPicker(false);
  };

  // Manejar selección de respuesta rápida (y enviar automáticamente)
  const handleQuickReplySelect = (reply: any, autoSend: boolean = false) => {
    if (autoSend) {
      // Enviar directamente sin poner en el input
      onSendMessage(reply.message, undefined);
      setShowQuickReplies(false);
      setShowQuickReplyDropdown(false);
      setQuickReplyFilter('');
      setNewMessage('');
    } else {
      setNewMessage(reply.message);
      setShowQuickReplies(false);
      setShowQuickReplyDropdown(false);
      setQuickReplyFilter('');
    }
  };

  // Manejar cambio de input con detección de "/"
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    
    if (value.startsWith('/')) {
      const filter = value.substring(1).toLowerCase();
      setQuickReplyFilter(filter);
      setShowQuickReplyDropdown(true);
    } else {
      setShowQuickReplyDropdown(false);
      setQuickReplyFilter('');
    }
  };

  // Filtrar respuestas rápidas
  const filteredQuickReplies = quickReplies.filter(reply => 
    reply.title.toLowerCase().includes(quickReplyFilter) ||
    reply.message.toLowerCase().includes(quickReplyFilter)
  );

  // Remover archivo seleccionado
  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Formatear tiempo
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 días
      return date.toLocaleDateString('es-ES', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    }
  };

  // Obtener iniciales del nombre
  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Agrupar mensajes por fecha
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.created_at).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };

  console.log('[ChatArea] Rendering with:', {
    hasConversation: !!conversation,
    messagesCount: messages.length,
    messages: messages.map(m => ({ id: m.id, content: m.content.substring(0, 20), direction: m.direction }))
  });

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Selecciona una conversación</h3>
          <p className="text-muted-foreground">
            Elige una conversación de la lista para comenzar a chatear
          </p>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);
  console.log('[ChatArea] Message groups:', Object.keys(messageGroups));
  console.log('[ChatArea] Messages per group:', Object.entries(messageGroups).map(([date, msgs]) => ({
    date,
    count: msgs.length,
    messages: msgs.map(m => ({ id: m.id, content: m.content?.substring(0, 30), created_at: m.created_at }))
  })));

  return (
    <div className="h-full min-h-0 flex flex-col bg-background">
      {/* Header del chat */}
      <div className="p-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(conversation.pushname)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h2 className="font-medium">
              {conversation.pushname || (isCajero ? maskPhoneNumber(conversation.whatsapp_number) : conversation.whatsapp_number)}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isCajero ? maskPhoneNumber(conversation.whatsapp_number) : conversation.whatsapp_number}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <AssignToKanban 
              conversationPhone={conversation.whatsapp_number}
              conversationName={conversation.pushname}
              onLeadAssigned={(lead) => {
                console.log('Lead asignado:', lead);
              }}
              iconOnly
            />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onToggleInfoPanel}
              title="Mostrar/Ocultar información del contacto"
            >
              <UserCircle className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem 
                  onClick={toggleBotBlock}
                  disabled={isBotToggling}
                >
                  {isBlocked ? (
                    <>
                      <Bot className="h-4 w-4 mr-2" />
                      Activar Bot
                    </>
                  ) : (
                    <>
                      <BotOff className="h-4 w-4 mr-2" />
                      Desactivar Bot
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Selector de conexión WhatsApp si la original no está activa */}
      {conversation.channel_type === 'whatsapp' && originalSessionStatus !== 'active' && whatsappConnections.length > 0 && (
        <div className="mx-3 mt-3">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              La sesión original no está disponible. Selecciona una conexión activa:
              <Select value={selectedSession || ''} onValueChange={onSessionChange}>
                <SelectTrigger className="w-full mt-2">
                  <SelectValue placeholder="Seleccionar conexión WhatsApp" />
                </SelectTrigger>
                <SelectContent>
                  {whatsappConnections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.name || ''}>
                      {conn.name} - {conn.phone_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Selector de conexión Twilio si la original no está activa */}
      {conversation.channel_type === 'twilio' && originalSessionStatus !== 'active' && twilioConnections.length > 0 && (
        <div className="mx-3 mt-3">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              La conexión original no está disponible. Selecciona una conexión activa:
              <Select value={selectedTwilioConnection || ''} onValueChange={onTwilioConnectionChange}>
                <SelectTrigger className="w-full mt-2">
                  <SelectValue placeholder="Seleccionar conexión Twilio" />
                </SelectTrigger>
                <SelectContent>
                  {twilioConnections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      {conn.connection_name} - {conn.phone_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Indicador de contacto bloqueado */}
      {isBlocked && (
        <div className="mx-3 mt-3">
          <Alert className="border-orange-500/50 bg-orange-500/10">
            <BotOff className="h-4 w-4 text-orange-500" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-orange-700 dark:text-orange-400">
                Este contacto tiene el bot desactivado. La IA no responderá automáticamente.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleBotBlock}
                disabled={isBotToggling}
                className="ml-2 text-green-600 hover:text-green-700 hover:bg-green-50 shrink-0"
              >
                {isBotToggling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Bot className="h-4 w-4 mr-1" />
                    Activar Bot
                  </>
                )}
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}


      {/* Área de mensajes */}
      <ScrollArea 
        className="flex-1 min-h-0 p-4 bg-background"
        ref={scrollAreaRef}
      >
        <div className="space-y-4">
          {Object.entries(messageGroups).map(([date, dateMessages]) => (
            <div key={date}>
              {/* Separador de fecha */}
              <div className="flex items-center justify-center mb-3">
                <div className="bg-muted px-3 py-1.5 rounded-md text-xs text-muted-foreground shadow-sm">
                  {date}
                </div>
              </div>
              
              {/* Mensajes del día */}
              <div className="space-y-2">
                {dateMessages.map((message, index) => {
                  const prevMessage = index > 0 ? dateMessages[index - 1] : null;
                  const showAvatar = !prevMessage || prevMessage.direction !== message.direction;
                  
                  return (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      showAvatar={showAvatar}
                      formatTime={formatTime}
                      getInitials={getInitials}
                      conversation={conversation}
                    />
                  );
                })}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input de mensaje */}
      <div className="p-3 border-t border-border bg-card">

        {/* Preview de archivo seleccionado */}
        {selectedFile && (
          <div className="mb-3 p-3 bg-muted rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              <span className="text-sm">{selectedFile.name}</span>
              <span className="text-xs text-muted-foreground">
                ({Math.round(selectedFile.size / 1024)} KB)
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeSelectedFile}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            className="hidden"
          />
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* Botón de respuestas rápidas - siempre visible */}
          <Popover open={showQuickReplies} onOpenChange={setShowQuickReplies}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                disabled={isUploading || isSending}
                title="Respuestas rápidas"
              >
                <Zap className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2" align="start">
              <div className="space-y-1">
                <p className="text-sm font-medium px-2 py-1">Respuestas Rápidas</p>
                {quickReplies.length === 0 ? (
                  <div className="px-2 py-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      No tienes respuestas rápidas configuradas.
                    </p>
                    <a 
                      href="/configuracion" 
                      className="text-sm text-primary hover:underline mt-2 inline-block"
                    >
                      Crear una respuesta rápida
                    </a>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[300px]">
                    {quickReplies.map((reply) => (
                      <button
                        key={reply.id}
                        onClick={() => handleQuickReplySelect(reply)}
                        className="w-full text-left px-2 py-2 hover:bg-muted rounded-md transition-colors"
                      >
                        <p className="font-medium text-sm">{reply.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {reply.message}
                        </p>
                      </button>
                    ))}
                  </ScrollArea>
                )}
              </div>
            </PopoverContent>
          </Popover>
          
          <div className="flex-1 relative">
            {/* Dropdown de respuestas rápidas al escribir "/" */}
            {showQuickReplyDropdown && filteredQuickReplies.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                <div className="p-2">
                  <p className="text-xs text-muted-foreground px-2 mb-1">
                    Respuestas Rápidas ({filteredQuickReplies.length})
                  </p>
                  {filteredQuickReplies.map((reply) => (
                    <button
                      key={reply.id}
                      onClick={() => handleQuickReplySelect(reply)}
                      className="w-full text-left px-3 py-2 hover:bg-muted rounded-md transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{reply.title}</span>
                        {reply.hotkey && (
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{reply.hotkey}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {reply.message}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Input
              placeholder="Escribe '/' para respuestas rápidas..."
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  // Si hay dropdown abierto con respuestas filtradas, seleccionar y enviar la primera
                  if (showQuickReplyDropdown && filteredQuickReplies.length > 0) {
                    handleQuickReplySelect(filteredQuickReplies[0], true);
                  } else {
                    handleSendMessage();
                  }
                }
              }}
              className="pr-10 bg-muted border border-input text-foreground placeholder:text-muted-foreground"
              disabled={isSending || isUploading}
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile className="h-4 w-4" />
            </Button>
            
            {/* Selector de emojis */}
            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-2 z-50">
                <EmojiPicker
                  onEmojiClick={handleEmojiSelect}
                  width={300}
                  height={400}
                />
              </div>
            )}
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={(!newMessage.trim() && !selectedFile) || isSending || isUploading}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Memoized message bubble component
interface MessageBubbleProps {
  message: Message;
  showAvatar: boolean;
  formatTime: (dateString: string) => string;
  getInitials: (name: string | null) => string;
  conversation: Conversation;
}

const MessageBubble = memo<MessageBubbleProps>(({
  message,
  showAvatar,
  formatTime,
  getInitials,
  conversation,
}) => {
  const isOutgoing = message.direction === 'outbound' || message.direction === 'outgoing';
  
  return (
    <div className={cn("flex items-end gap-2 mb-1", isOutgoing ? "justify-end" : "justify-start")}>
      {!isOutgoing && (
        <Avatar className={cn("h-8 w-8", !showAvatar && "invisible")}> 
          <AvatarFallback className="bg-success text-success-foreground text-xs">
            {getInitials(conversation.pushname)}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div
        className={cn(
          "max-w-[70%] rounded-lg px-3 py-2 text-sm relative shadow-md",
          isOutgoing
            ? "bg-primary text-primary-foreground rounded-tr-none"
            : "bg-muted text-foreground rounded-tl-none"
        )}
      >
        {/* Contenido del mensaje */}
        {(message.file_url || message.attachment_url) && (
          <AttachmentRenderer 
            attachmentUrl={message.file_url || message.attachment_url}
            messageType={message.message_type}
            isOutgoing={isOutgoing}
            twilioConnectionId={conversation.twilio_connection_id}
          />
        )}
        
        <div className="whitespace-pre-wrap break-words">
          {message.content}
        </div>
        
        {/* Información del mensaje */}
        <div className={cn(
          "flex items-center justify-end gap-1 mt-1 text-[10px]",
          isOutgoing
            ? "text-primary-foreground/80"
            : "text-muted-foreground"
        )}>
          {message.is_bot && (
            <span className="mr-1 text-xs">🤖</span>
          )}
          <span>{formatTime(message.created_at)}</span>
          {isOutgoing && (
            <svg viewBox="0 0 16 15" width="16" height="15" className="ml-1">
              <path fill="currentColor" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
            </svg>
          )}
        </div>
      </div>
      
      {isOutgoing && (
        <div className="w-8" /> // Espacio para mantener alineación
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.showAvatar === nextProps.showAvatar
  );
});

MessageBubble.displayName = 'MessageBubble';

export default memo(ChatArea);
