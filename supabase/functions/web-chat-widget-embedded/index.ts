import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const webchatId = url.searchParams.get('id');

    if (!webchatId) {
      return new Response('Missing webchat ID', { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: config, error } = await supabase
      .from('web_chatbots')
      .select('*')
      .eq('id', webchatId)
      .eq('is_active', true)
      .single();

    if (error || !config) {
      console.error('Webchat not found:', error);
      return new Response('Chatbot not found', { status: 404, headers: corsHeaders });
    }

    const widgetScript = generateEmbeddedWidgetScript(config, supabaseUrl);

    return new Response(widgetScript, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
});

function generateEmbeddedWidgetScript(config: any, supabaseUrl: string): string {
  return `
(function() {
  const CONFIG = ${JSON.stringify({
    id: config.id,
    name: config.name,
    logoUrl: config.logo_url,
    backgroundImageUrl: config.background_image_url,
    primaryColor: config.primary_color || '#00a884',
    welcomeMessage: config.welcome_message || '¡Hola! ¿En qué puedo ayudarte?',
    placeholderText: config.placeholder_text || 'Escribe tu mensaje...',
    width: config.width || '100%',
    height: config.height || '100%'
  })};
  
  const SUPABASE_URL = '${supabaseUrl}';
  
  // Common emojis for picker
  const EMOJIS = ['😊', '👍', '❤️', '😂', '🙏', '😍', '🎉', '🔥', '✨', '💪', '👋', '😢', '🤔', '👏', '💯', '🙌', '😎', '🥰', '💕', '✅'];
  
  // Persist session in localStorage
  let SESSION_ID = localStorage.getItem('webchat_session_' + CONFIG.id);
  if (!SESSION_ID) {
    SESSION_ID = 'webchat_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
    localStorage.setItem('webchat_session_' + CONFIG.id, SESSION_ID);
  }
  
  let lastMessageTime = null;  // Use timestamp for reliable chronological filtering
  let pollingInterval = null;
  let displayedMessageIds = new Set();
  let welcomeShown = localStorage.getItem('webchat_welcome_' + CONFIG.id) === 'true';
  let showEmojiPicker = false;

  function init() {
    const container = document.getElementById('webchat-embedded-container');
    if (!container) {
      console.error('Container #webchat-embedded-container not found');
      return;
    }
    
    container.innerHTML = createWidgetHTML();
    setupEventListeners();
    
    // Show welcome message only once per session (persisted)
    if (!welcomeShown) {
      addMessage('bot', CONFIG.welcomeMessage, 'welcome_msg', true);
      welcomeShown = true;
      localStorage.setItem('webchat_welcome_' + CONFIG.id, 'true');
    }
    
    startPolling();
  }

  function createWidgetHTML() {
    return \`
      <style>
        * { box-sizing: border-box; }
        #webchat-embedded-container {
          width: 100%;
          max-width: 100%;
          padding: 0 !important;
          margin: 0 !important;
        }
        @media (max-width: 480px) {
          #webchat-embedded-container {
            width: calc(100% - 24px) !important;
            max-width: calc(100vw - 24px) !important;
            padding: 0 !important;
            margin: 0 12px !important;
          }
          #webchat-widget {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 100% !important;
            border-radius: 12px !important;
            margin: 0 !important;
            height: calc(100vh - 24px) !important;
            max-height: calc(100vh - 24px) !important;
          }
        }
        #webchat-emoji-picker {
          display: none;
          position: absolute;
          bottom: 60px;
          left: 12px;
          background: #202c33;
          border-radius: 12px;
          padding: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          z-index: 100;
          max-width: 200px;
        }
        #webchat-emoji-picker.show {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .emoji-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 18px;
          border-radius: 6px;
          transition: background 0.2s;
        }
        .emoji-btn:hover {
          background: rgba(255,255,255,0.1);
        }
      </style>
      <div id="webchat-widget" style="
        width: \${CONFIG.width};
        max-width: 100%;
        height: \${CONFIG.height};
        display: flex;
        flex-direction: column;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #0d1418;
        box-sizing: border-box;
        position: relative;
      ">
        <!-- Header -->
        <div style="
          background: \${CONFIG.primaryColor};
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        ">
          \${CONFIG.logoUrl ? 
            \`<img src="\${CONFIG.logoUrl}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" />\` :
            \`<div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="none">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>\`
          }
          <div style="flex: 1; min-width: 0;">
            <div style="color: white; font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\${CONFIG.name}</div>
            <div style="color: rgba(255,255,255,0.8); font-size: 12px;">● En línea</div>
          </div>
        </div>
        
        <!-- Messages Area -->
        <div id="webchat-messages" style="
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          background: #0d1418;
          \${CONFIG.backgroundImageUrl ? \`background-image: url('\${CONFIG.backgroundImageUrl}'); background-size: cover; background-position: center;\` : ''}
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 0;
        "></div>
        
        <!-- Emoji Picker -->
        <div id="webchat-emoji-picker">
          \${EMOJIS.map(e => \`<button class="emoji-btn" data-emoji="\${e}">\${e}</button>\`).join('')}
        </div>
        
        <!-- Input Area -->
        <div style="
          padding: 12px 16px;
          background: #202c33;
          border-top: 1px solid #2a3942;
          display: flex;
          gap: 10px;
          align-items: center;
          flex-shrink: 0;
          position: relative;
        ">
          <label id="webchat-attach-btn" style="
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: transparent;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          " title="Adjuntar archivo">
            <input type="file" id="webchat-file-input" accept="image/*,.pdf,.doc,.docx" style="display: none;" />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#8696a0" stroke="none">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </label>
          <button id="webchat-emoji-btn" style="
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: transparent;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          " title="Emojis">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#8696a0">
              <circle cx="12" cy="12" r="10" fill="none" stroke="#8696a0" stroke-width="2"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2" fill="none" stroke="#8696a0" stroke-width="2" stroke-linecap="round"/>
              <circle cx="9" cy="9" r="1.5"/>
              <circle cx="15" cy="9" r="1.5"/>
            </svg>
          </button>
          <input 
            id="webchat-input" 
            type="text" 
            placeholder="\${CONFIG.placeholderText}"
            style="
              flex: 1;
              background: #2a3942;
              border: none;
              border-radius: 24px;
              padding: 12px 16px;
              color: #e9edef;
              font-size: 14px;
              outline: none;
              min-width: 0;
            "
          />
          <button 
            id="webchat-send"
            style="
              width: 40px;
              height: 40px;
              border-radius: 50%;
              border: none;
              background: \${CONFIG.primaryColor};
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: transform 0.2s;
              flex-shrink: 0;
            "
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    \`;
  }

  function addMessage(role, content, msgId, createdAt = null, isWelcome = false) {
    // Prevent duplicates using message ID
    if (msgId && displayedMessageIds.has(msgId)) {
      return;
    }
    if (msgId) {
      displayedMessageIds.add(msgId);
    }
    // Update lastMessageTime for chronological polling
    if (createdAt) {
      lastMessageTime = createdAt;
      console.log('[WebChat] Updated lastMessageTime:', lastMessageTime);
    }
    
    const container = document.getElementById('webchat-messages');
    if (!container) return;
    
    const isBot = role === 'bot' || role === 'assistant';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const msgDiv = document.createElement('div');
    msgDiv.style.cssText = \`
      display: flex;
      justify-content: \${isBot ? 'flex-start' : 'flex-end'};
    \`;
    
    msgDiv.innerHTML = \`
      <div style="
        max-width: 80%;
        padding: 10px 14px;
        border-radius: 12px;
        \${isBot ? 'border-top-left-radius: 4px;' : 'border-top-right-radius: 4px;'}
        background: \${isBot ? '#202c33' : CONFIG.primaryColor};
        color: \${isBot ? '#e9edef' : 'white'};
        font-size: 14px;
        line-height: 1.4;
        word-wrap: break-word;
      ">
        <div>\${formatContent(content)}</div>
        <div style="font-size: 10px; opacity: 0.7; margin-top: 4px; text-align: right;">\${time}</div>
      </div>
    \`;
    
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
  }

  function formatContent(content) {
    // Check if it's an image URL
    if (content && (content.match(/\\.(jpg|jpeg|png|gif|webp)$/i) || content.startsWith('data:image'))) {
      return \`<img src="\${content}" style="max-width: 100%; border-radius: 8px; margin: 4px 0;" />\`;
    }
    // Escape HTML first
    let escaped = escapeHtml(content);
    // Convert URLs to clickable links (WhatsApp links especially)
    escaped = escaped.replace(
      /(https?:\\/\\/[^\\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener" style="color: #53bdeb; text-decoration: underline;">$1</a>'
    );
    return escaped;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function sendMessage(text, attachmentUrl = null, attachmentType = null) {
    if (!text?.trim() && !attachmentUrl) return;
    
    console.log('[WebChat] Sending message:', { text, hasAttachment: !!attachmentUrl, webchatId: CONFIG.id, sessionId: SESSION_ID });
    
    // Show message in UI immediately with local ID
    const localId = 'local_' + Date.now();
    if (attachmentUrl && attachmentType?.startsWith('image/')) {
      addMessage('user', attachmentUrl, localId);
    } else if (text?.trim()) {
      addMessage('user', text, localId);
    }
    
    try {
      const url = SUPABASE_URL + '/functions/v1/web-chat-message';
      console.log('[WebChat] Calling:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webchatId: CONFIG.id,
          sessionId: SESSION_ID,
          message: text || '',
          attachmentUrl: attachmentUrl,
          attachmentType: attachmentType
        })
      });
      
      console.log('[WebChat] Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[WebChat] Error response:', errorText);
        addMessage('bot', '⚠️ Error enviando mensaje. Recargá la página.', 'error_' + Date.now());
      } else {
        console.log('[WebChat] Message sent successfully');
        // Poll immediately for potential AI response
        setTimeout(pollForMessages, 500);
        setTimeout(pollForMessages, 1500);
      }
    } catch (error) {
      console.error('[WebChat] Send error:', error);
      addMessage('bot', '⚠️ Error de conexión. Recargá la página.', 'error_' + Date.now());
    }
  }

  async function uploadFile(file) {
    // Convert to base64 for simple storage
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  async function handleFileUpload(file) {
    if (!file) return;
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo es demasiado grande. Máximo 5MB.');
      return;
    }
    
    const dataUrl = await uploadFile(file);
    if (dataUrl) {
      await sendMessage('', dataUrl, file.type);
    }
  }

  async function pollForMessages() {
    try {
      console.log('[WebChat Poll] Polling with lastMessageTime:', lastMessageTime);
      const response = await fetch(SUPABASE_URL + '/functions/v1/web-chat-poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webchatId: CONFIG.id,
          sessionId: SESSION_ID,
          lastMessageTime: lastMessageTime
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[WebChat Poll] Received messages:', data.messages?.length || 0);
        if (data.messages && data.messages.length > 0) {
          data.messages.forEach(msg => {
            // Only show outbound messages from CRM (avoid duplicates)
            if (msg.direction === 'outbound') {
              const content = msg.attachment_url || msg.content;
              addMessage('bot', content, msg.id, msg.created_at);
            }
          });
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }

  function startPolling() {
    pollingInterval = setInterval(pollForMessages, 2000);
  }

  function toggleEmojiPicker() {
    const picker = document.getElementById('webchat-emoji-picker');
    if (picker) {
      showEmojiPicker = !showEmojiPicker;
      picker.classList.toggle('show', showEmojiPicker);
    }
  }

  function insertEmoji(emoji) {
    const input = document.getElementById('webchat-input');
    if (input) {
      input.value += emoji;
      input.focus();
    }
    toggleEmojiPicker();
  }

  function setupEventListeners() {
    const input = document.getElementById('webchat-input');
    const sendBtn = document.getElementById('webchat-send');
    const fileInput = document.getElementById('webchat-file-input');
    const emojiBtn = document.getElementById('webchat-emoji-btn');
    const emojiPicker = document.getElementById('webchat-emoji-picker');
    
    if (input && sendBtn) {
      sendBtn.addEventListener('click', () => {
        sendMessage(input.value);
        input.value = '';
      });
      
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          sendMessage(input.value);
          input.value = '';
        }
      });
    }
    
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
          handleFileUpload(file);
          e.target.value = ''; // Reset input
        }
      });
    }
    
    if (emojiBtn) {
      emojiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleEmojiPicker();
      });
    }
    
    if (emojiPicker) {
      emojiPicker.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          insertEmoji(btn.dataset.emoji);
        });
      });
    }
    
    // Close emoji picker when clicking outside
    document.addEventListener('click', () => {
      if (showEmojiPicker) {
        toggleEmojiPicker();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;
}
