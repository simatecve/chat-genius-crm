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
      return new Response('Missing webchat id', { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch chatbot configuration
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

    const widgetJS = generateWidgetScript(config, supabaseUrl);

    return new Response(widgetJS, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    console.error('Error serving widget:', error);
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
});

function generateWidgetScript(config: any, supabaseUrl: string): string {
  const sessionId = 'webchat_' + Math.random().toString(36).substring(2, 15);
  
  return `
(function() {
  if (window.__webchatLoaded) return;
  window.__webchatLoaded = true;

  const CONFIG = ${JSON.stringify({
    id: config.id,
    name: config.name,
    logoUrl: config.logo_url,
    primaryColor: config.primary_color,
    welcomeMessage: config.welcome_message,
    placeholderText: config.placeholder_text,
    position: config.position
  })};
  
  const API_URL = '${supabaseUrl}/functions/v1/web-chat-message';
  const SESSION_ID = '${sessionId}';
  let isOpen = false;
  let messages = [];

  // Create styles
  const style = document.createElement('style');
  style.textContent = \`
    .webchat-container * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .webchat-btn { position: fixed; bottom: 24px; \${CONFIG.position === 'bottom-right' ? 'right: 24px' : 'left: 24px'}; width: 60px; height: 60px; border-radius: 50%; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: transform 0.2s, box-shadow 0.2s; z-index: 999998; display: flex; align-items: center; justify-content: center; background-color: \${CONFIG.primaryColor}; }
    .webchat-btn:hover { transform: scale(1.05); box-shadow: 0 6px 20px rgba(0,0,0,0.2); }
    .webchat-btn img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
    .webchat-btn svg { width: 28px; height: 28px; fill: white; }
    .webchat-modal { position: fixed; bottom: 100px; \${CONFIG.position === 'bottom-right' ? 'right: 24px' : 'left: 24px'}; width: 380px; max-width: calc(100vw - 48px); height: 520px; max-height: calc(100vh - 140px); background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); z-index: 999999; display: flex; flex-direction: column; overflow: hidden; opacity: 0; transform: translateY(20px) scale(0.95); transition: opacity 0.3s, transform 0.3s; pointer-events: none; }
    .webchat-modal.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }
    .webchat-header { padding: 16px; display: flex; align-items: center; gap: 12px; background-color: \${CONFIG.primaryColor}; }
    .webchat-header-logo { width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .webchat-header-logo img { width: 100%; height: 100%; object-fit: cover; }
    .webchat-header-logo svg { width: 24px; height: 24px; fill: white; }
    .webchat-header-info { flex: 1; }
    .webchat-header-name { color: white; font-weight: 600; font-size: 15px; margin: 0; }
    .webchat-header-status { color: rgba(255,255,255,0.8); font-size: 12px; }
    .webchat-close { background: none; border: none; color: rgba(255,255,255,0.8); cursor: pointer; padding: 4px; }
    .webchat-close:hover { color: white; }
    .webchat-close svg { width: 24px; height: 24px; }
    .webchat-messages { flex: 1; padding: 16px; overflow-y: auto; background: #f5f5f5; display: flex; flex-direction: column; gap: 8px; }
    .webchat-msg { max-width: 85%; padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.4; word-wrap: break-word; }
    .webchat-msg.bot { background: white; border-bottom-left-radius: 4px; align-self: flex-start; }
    .webchat-msg.user { background: \${CONFIG.primaryColor}; color: white; border-bottom-right-radius: 4px; align-self: flex-end; }
    .webchat-input-area { padding: 12px 16px; border-top: 1px solid #e5e5e5; background: white; display: flex; gap: 8px; }
    .webchat-input { flex: 1; border: none; background: #f5f5f5; border-radius: 24px; padding: 10px 16px; font-size: 14px; outline: none; }
    .webchat-input:focus { background: #ebebeb; }
    .webchat-send { width: 40px; height: 40px; border-radius: 50%; border: none; background: \${CONFIG.primaryColor}; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
    .webchat-send:hover { transform: scale(1.05); }
    .webchat-send:disabled { opacity: 0.5; cursor: not-allowed; }
    .webchat-send svg { width: 18px; height: 18px; fill: white; }
    .webchat-typing { display: flex; gap: 4px; padding: 10px 14px; background: white; border-radius: 16px; border-bottom-left-radius: 4px; align-self: flex-start; }
    .webchat-typing span { width: 8px; height: 8px; background: #ccc; border-radius: 50%; animation: typing 1.4s infinite ease-in-out; }
    .webchat-typing span:nth-child(2) { animation-delay: 0.2s; }
    .webchat-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-4px); } }
  \`;
  document.head.appendChild(style);

  // Create container
  const container = document.createElement('div');
  container.className = 'webchat-container';
  container.innerHTML = \`
    <button class="webchat-btn">
      \${CONFIG.logoUrl ? '<img src="' + CONFIG.logoUrl + '" alt="">' : '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>'}
    </button>
    <div class="webchat-modal">
      <div class="webchat-header">
        <div class="webchat-header-logo">
          \${CONFIG.logoUrl ? '<img src="' + CONFIG.logoUrl + '" alt="">' : '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>'}
        </div>
        <div class="webchat-header-info">
          <h3 class="webchat-header-name">\${CONFIG.name}</h3>
          <span class="webchat-header-status">En línea</span>
        </div>
        <button class="webchat-close">
          <svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      </div>
      <div class="webchat-messages"></div>
      <div class="webchat-input-area">
        <input class="webchat-input" placeholder="\${CONFIG.placeholderText}" />
        <button class="webchat-send">
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    </div>
  \`;
  document.body.appendChild(container);

  const btn = container.querySelector('.webchat-btn');
  const modal = container.querySelector('.webchat-modal');
  const closeBtn = container.querySelector('.webchat-close');
  const messagesEl = container.querySelector('.webchat-messages');
  const input = container.querySelector('.webchat-input');
  const sendBtn = container.querySelector('.webchat-send');

  function toggleChat() {
    isOpen = !isOpen;
    modal.classList.toggle('open', isOpen);
    if (isOpen && messages.length === 0) {
      addMessage(CONFIG.welcomeMessage, 'bot');
    }
  }

  function addMessage(text, type) {
    messages.push({ text, type });
    const msg = document.createElement('div');
    msg.className = 'webchat-msg ' + type;
    msg.textContent = text;
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    const typing = document.createElement('div');
    typing.className = 'webchat-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(typing);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return typing;
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    addMessage(text, 'user');
    sendBtn.disabled = true;

    const typing = showTyping();

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webchatId: CONFIG.id,
          sessionId: SESSION_ID,
          message: text
        })
      });

      const data = await res.json();
      typing.remove();
      
      if (data.reply) {
        addMessage(data.reply, 'bot');
      }
    } catch (err) {
      console.error('Webchat error:', err);
      typing.remove();
      addMessage('Lo siento, hubo un error. Intenta de nuevo.', 'bot');
    } finally {
      sendBtn.disabled = false;
    }
  }

  btn.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);
  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
})();
`;
}
