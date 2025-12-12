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
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
});

function generateEmbeddedWidgetScript(config: any, supabaseUrl: string): string {
  // Use localStorage to persist session across page reloads
  
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
  
  // Persist session in localStorage
  let SESSION_ID = localStorage.getItem('webchat_session_' + CONFIG.id);
  if (!SESSION_ID) {
    SESSION_ID = 'webchat_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
    localStorage.setItem('webchat_session_' + CONFIG.id, SESSION_ID);
  }
  
  let messages = [];
  let lastMessageTime = null;
  let pollingInterval = null;

  function init() {
    const container = document.getElementById('webchat-embedded-container');
    if (!container) {
      console.error('Container #webchat-embedded-container not found');
      return;
    }
    
    container.innerHTML = createWidgetHTML();
    setupEventListeners();
    addMessage('bot', CONFIG.welcomeMessage);
    startPolling();
  }

  function createWidgetHTML() {
    return \`
      <div id="webchat-widget" style="
        width: \${CONFIG.width};
        height: \${CONFIG.height};
        display: flex;
        flex-direction: column;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #0d1418;
      ">
        <!-- Header -->
        <div style="
          background: \${CONFIG.primaryColor};
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        ">
          \${CONFIG.logoUrl ? 
            \`<img src="\${CONFIG.logoUrl}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" />\` :
            \`<div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="none">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>\`
          }
          <div style="flex: 1;">
            <div style="color: white; font-weight: 600; font-size: 15px;">\${CONFIG.name}</div>
            <div style="color: rgba(255,255,255,0.8); font-size: 12px;">● En línea</div>
          </div>
        </div>
        
        <!-- Messages Area -->
        <div id="webchat-messages" style="
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          background: #0d1418;
          ${config.background_image_url ? `background-image: url('${config.background_image_url}'); background-size: cover; background-position: center;` : ''}
          display: flex;
          flex-direction: column;
          gap: 12px;
        "></div>
        
        <!-- Input Area -->
        <div style="
          padding: 12px 16px;
          background: #202c33;
          border-top: 1px solid #2a3942;
          display: flex;
          gap: 10px;
          align-items: center;
        ">
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

  function addMessage(role, content) {
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
        <div>\${escapeHtml(content)}</div>
        <div style="font-size: 10px; opacity: 0.7; margin-top: 4px; text-align: right;">\${time}</div>
      </div>
    \`;
    
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
    
    messages.push({ role, content, time: new Date().toISOString() });
    lastMessageTime = new Date().toISOString();
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function sendMessage(text) {
    if (!text.trim()) return;
    
    addMessage('user', text);
    
    try {
      const response = await fetch(SUPABASE_URL + '/functions/v1/web-chat-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webchatId: CONFIG.id,
          sessionId: SESSION_ID,
          message: text
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.reply) {
          addMessage('bot', data.reply);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  async function pollForMessages() {
    try {
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
        if (data.messages && data.messages.length > 0) {
          data.messages.forEach(msg => {
            if (msg.direction === 'outbound' && !msg.is_bot) {
              addMessage('bot', msg.content);
            }
          });
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }

  function startPolling() {
    pollingInterval = setInterval(pollForMessages, 3000);
  }

  function setupEventListeners() {
    const input = document.getElementById('webchat-input');
    const sendBtn = document.getElementById('webchat-send');
    
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;
}
