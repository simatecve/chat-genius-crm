'use client';

import { useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';
import { ChatResponse } from '@/app/api/chats/domain/chat';
import { ContactResponse } from '@/services/contactoServices';
import { SesionResponse } from '@/app/api/sesiones/domain/sesion';
import { MensajeResponse } from '@/app/api/mensajes/domain/mensaje';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import ChatArea from '@/components/conversations/ChatArea';
import { ContactInfoPanel } from '@/components/conversations/ContactInfoPanel';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { mensajesServices } from '@/services/mensajesServices';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];

interface ChatModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat | null;
  onContactUpdate?: (updatedContact: ContactResponse, updatedChat?: ChatResponse) => void;
}

interface Chat {
  id: string;
  contacto: ContactResponse;
  ultimoMensaje?: MensajeResponse;
  sesion: SesionResponse;
  chat_data: ChatResponse;
  estado: 'activo' | 'archivado' | 'pausado';
}

export default function ChatModalV2({ 
  isOpen, 
  onClose, 
  chat,
  onContactUpdate 
}: ChatModalV2Props) {
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Cargar conversación y mensajes cuando cambia el chat
  useEffect(() => {
    if (!chat || !isOpen) return;

    const loadData = async () => {
      try {
        const { data: convData } = await supabase
          .from('conversations')
          .select('*')
          .eq('phone_number', chat.contacto.telefono || chat.contacto.whatsapp_jid || '')
          .single();

        if (!convData) return;

        setConversation(convData);

        setIsLoadingMessages(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoadingMessages(false);
          return;
        }

        const { data: msgData, error: msgError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', convData.id)
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (msgError) {
          console.error('Error fetching messages:', msgError);
        }

        setMessages(msgData || []);
        setIsLoadingMessages(false);

        const channel = supabase
          .channel(`conv-${convData.id}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${convData.id}`
          }, (payload) => {
            const newMsg = payload.new as Message;
            setMessages(prev => [...prev, newMsg]);
          })
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.error('Error loading conversation data:', error);
        setIsLoadingMessages(false);
      }
    };

    const cleanup = loadData();
    return () => { (async () => { await cleanup; })(); };
  }, [chat, isOpen]);

  // Manejar envío de mensaje
  const handleSendMessage = async (messageText: string, attachment?: File) => {
    if (!chat || !conversation) return;

    setIsSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: whatsappConnection } = await supabase
        .from('whatsapp_connections')
        .select('name')
        .eq('user_id', user.id)
        .eq('status', 'WORKING')
        .limit(1)
        .maybeSingle();

      const sessionName = whatsappConnection?.name || 'default';
      const phoneNumber = conversation.phone_number || (chat.contacto.telefono || chat.contacto.whatsapp_jid || '');

      const { data, error } = await supabase.functions.invoke('waha-send-message', {
        body: {
          sessionName,
          phoneNumber,
          message: messageText,
          userId: user.id,
          conversationId: conversation.id
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success && data?.savedMessage) {
        setMessages(prev => [...prev, data.savedMessage as Message]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen || !chat) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg w-full max-w-[96vw] h-[95vh] border border-border flex flex-col shadow-2xl overflow-hidden">
        {/* Botón de cerrar - posicionado de forma relativa dentro del flujo */}
        <div className="flex-shrink-0 flex justify-end p-2 border-b border-border bg-background">
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-2 rounded-lg cursor-pointer transition-colors hover:bg-accent"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido del modal con ResizablePanel */}
        <div className="flex-1 min-h-0">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={showInfoPanel ? 75 : 100} minSize={50} className="h-full min-h-0">
              <div className="h-full">
                <ChatArea
                  conversation={conversation}
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isSending={isSending}
                  onToggleInfoPanel={() => setShowInfoPanel(!showInfoPanel)}
                />
              </div>
            </ResizablePanel>

            {showInfoPanel && conversation && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="h-full min-h-0">
                  <ContactInfoPanel
                    conversationId={conversation.id}
                    contactName={conversation.contact_name || conversation.pushname || 'Sin nombre'}
                    phoneNumber={conversation.phone_number}
                  />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
}
