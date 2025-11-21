import React, { useState, useRef, useEffect } from 'react';
import { Phone, MoreVertical, Send, Paperclip, Smile, X, BotOff, Bot } from 'lucide-react';
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

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];

interface ChatAreaProps {
  conversation: Conversation | null;
  messages: Message[];
  onSendMessage: (message: string, attachment?: File) => void;
  isSending: boolean;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  messages,
  onSendMessage,
  isSending,
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { isBlocked, isLoading: isBotToggling, toggleBotBlock } = useBotBlock(
    conversation?.whatsapp_number || null,
    conversation?.pushname || null
  );
  const { autoStopEnabled } = useBotAutoStop();

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

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Phone className="h-12 w-12 text-muted-foreground" />
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

  return (
    <div className="flex-1 flex flex-col">
      {/* Header del chat */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(conversation.pushname)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h2 className="font-medium">
              {conversation.pushname || conversation.whatsapp_number}
            </h2>
            <p className="text-sm text-muted-foreground">
              {conversation.whatsapp_number}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <AssignToKanban 
              conversationPhone={conversation.whatsapp_number}
              conversationName={conversation.pushname}
              onLeadAssigned={(lead) => {
                console.log('Lead asignado:', lead);
              }}
            />
            <Button variant="ghost" size="sm">
              <Phone className="h-4 w-4" />
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

      {/* Área de mensajes */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-6">
          {Object.entries(messageGroups).map(([date, dateMessages]) => (
            <div key={date}>
              {/* Separador de fecha */}
              <div className="flex items-center justify-center mb-4">
                <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
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
      <div className="p-4 border-t border-border">
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
          
          <div className="flex-1 relative">
            <Input
              placeholder="Escribe un mensaje..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="pr-10"
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

// Componente para cada burbuja de mensaje
interface MessageBubbleProps {
  message: Message;
  showAvatar: boolean;
  formatTime: (dateString: string) => string;
  getInitials: (name: string | null) => string;
  conversation: Conversation;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  showAvatar,
  formatTime,
  getInitials,
  conversation,
}) => {
  const isOutgoing = message.direction === 'outgoing';
  
  return (
    <div className={cn("flex items-end gap-2", isOutgoing ? "justify-end" : "justify-start")}>
      {!isOutgoing && (
        <Avatar className={cn("h-8 w-8", !showAvatar && "invisible")}>
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {getInitials(conversation.pushname)}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div
        className={cn(
          "max-w-[70%] rounded-lg px-3 py-2 text-sm relative",
          isOutgoing
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted rounded-bl-sm"
        )}
      >
        {/* Contenido del mensaje */}
        {(message.file_url || message.attachment_url) && (
          <AttachmentRenderer 
            attachmentUrl={message.file_url || message.attachment_url}
            messageType={message.message_type}
            isOutgoing={isOutgoing}
          />
        )}
        
        <div className="whitespace-pre-wrap break-words">
          {message.message}
        </div>
        
        {/* Información del mensaje */}
        <div className={cn(
          "flex items-center justify-end gap-1 mt-1 text-xs",
          isOutgoing
            ? "text-primary-foreground/70"
            : "text-muted-foreground"
        )}>
          {message.is_bot && (
            <span className="mr-1">🤖</span>
          )}
          <span>{formatTime(message.created_at)}</span>
          {isOutgoing && (
            <span className="ml-1">✓</span>
          )}
        </div>
      </div>
      
      {isOutgoing && (
        <div className="w-8" /> // Espacio para mantener alineación
      )}
    </div>
  );
};

export default ChatArea;