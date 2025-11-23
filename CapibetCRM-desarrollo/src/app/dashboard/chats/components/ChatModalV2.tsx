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
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Cargar conversación y mensajes cuando cambia el chat
  useEffect(() => {
    if (!chat || !isOpen) return;

    const loadData = async () => {
      try {
        // Buscar la conversación asociada al contacto
        const { data: convData } = await supabase
          .from('conversations')
          .select('*')
          .eq('phone_number', chat.contacto.telefono || chat.contacto.whatsapp_jid || '')
          .single();

        if (convData) {
          setConversation(convData);
          
          // Cargar mensajes
          setIsLoadingMessages(true);
          const mensajesResult = await mensajesServices.getMensajesByChat(chat.id);
          
          if (mensajesResult.success && mensajesResult.data) {
            // Convertir mensajes al formato de Message
            const convertedMessages: Message[] = mensajesResult.data.map((msg: any) => ({
              id: msg.id,
              conversation_id: convData.id,
              user_id: msg.remitente_id || '',
              content: msg.content?.message_content || '',
              direction: msg.remitente_id === '1' ? 'outbound' : 'inbound',
              created_at: msg.creado_en,
              status: msg.estado || null,
              message_type: msg.content?.message_type || 'text',
              attachment_url: msg.content?.media_url || null,
              file_url: null,
              message: null,
              metadata: null,
              is_bot: msg.is_bot || false,
            }));

            setMessages(convertedMessages);
          }
          setIsLoadingMessages(false);
        }
      } catch (error) {
        console.error('Error loading conversation data:', error);
        setIsLoadingMessages(false);
      }
    };

    loadData();
  }, [chat, isOpen]);

  // Manejar envío de mensaje
  const handleSendMessage = async (messageText: string, attachment?: File) => {
    if (!chat || !conversation) return;

    setIsSending(true);
    try {
      // Obtener conexión de WhatsApp activa
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: whatsappConnection } = await supabase
        .from('whatsapp_connections')
        .select('name')
        .eq('user_id', user.id)
        .eq('status', 'WORKING')
        .limit(1)
        .single();

      if (!whatsappConnection) {
        console.error('No active WhatsApp connection found');
        setIsSending(false);
        return;
      }

      // Enviar mensaje usando la API
      const endpoint = '/api/chats/enviar-mensaje-whatsapp';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telefono: chat.contacto.telefono || chat.contacto.whatsapp_jid,
          mensaje: messageText,
          sesion_id: chat.sesion.id
        })
      });

      const data = await response.json();

      if (data.success) {
        // Agregar mensaje a la lista localmente
        const newMessage: Message = {
          id: Date.now().toString(),
          conversation_id: conversation.id,
          user_id: user.id,
          content: messageText,
          direction: 'outbound',
          created_at: new Date().toISOString(),
          status: 'sent',
          message_type: 'text',
          attachment_url: null,
          file_url: null,
          message: null,
          metadata: null,
          is_bot: false,
        };

        setMessages(prev => [...prev, newMessage]);
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
      <div className="bg-background rounded-lg w-full max-w-7xl h-[90vh] border border-border relative flex flex-col overflow-hidden shadow-2xl">
        {/* Botón de cerrar */}
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 z-[100] text-muted-foreground hover:text-foreground p-2 rounded-lg cursor-pointer transition-colors bg-background/95 border border-border shadow-lg hover:bg-accent"
          title="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Contenido del modal con ResizablePanel */}
        <div className="flex-1 min-h-0">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={showInfoPanel ? 75 : 100} minSize={50}>
              <ChatArea
                conversation={conversation}
                messages={messages}
                onSendMessage={handleSendMessage}
                isSending={isSending}
                onToggleInfoPanel={() => setShowInfoPanel(!showInfoPanel)}
              />
            </ResizablePanel>

            {showInfoPanel && conversation && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
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
