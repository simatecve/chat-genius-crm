import React from 'react';
import { X } from 'lucide-react';
import ChatArea from './ChatArea';
import { ContactInfoPanel } from './ContactInfoPanel';
import { Database } from '@/integrations/supabase/types';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];

interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    conversation: Conversation | null;
    messages: Message[];
    onSendMessage: (messageText: string, attachment?: File) => Promise<void>;
    isSending: boolean;
}

export default function ChatModal({
    isOpen,
    onClose,
    conversation,
    messages,
    onSendMessage,
    isSending
}: ChatModalProps) {
    if (!isOpen || !conversation) return null;

    // Close modal on Escape key
    React.useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg w-full max-w-6xl h-[85vh] flex flex-col border border-border relative shadow-2xl">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-[70] text-muted-foreground hover:text-foreground p-2 rounded-lg cursor-pointer transition-colors bg-card border border-border hover:bg-accent"
                    title="Cerrar (Esc)"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Chat content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Main chat area */}
                    <div className="flex-1 flex flex-col min-w-0">
                        <ChatArea
                            conversation={conversation}
                            messages={messages}
                            onSendMessage={onSendMessage}
                            isSending={isSending}
                            onToggleInfoPanel={() => { }} // Info panel is always visible in modal
                        />
                    </div>

                    {/* Contact info panel - always visible in modal */}
                    <div className="w-96 border-l border-border flex-shrink-0">
                        <ContactInfoPanel
                            conversationId={conversation.id}
                            contactName={conversation.contact_name || conversation.pushname || 'Contacto'}
                            phoneNumber={conversation.phone_number}
                            whatsappNumber={conversation.whatsapp_number}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
