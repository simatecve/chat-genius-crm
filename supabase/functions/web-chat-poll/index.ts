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
    const { webchatId, sessionId, lastMessageTime } = await req.json();

    if (!webchatId || !sessionId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get webchat config
    const { data: webchat, error: webchatError } = await supabase
      .from('web_chatbots')
      .select('user_id')
      .eq('id', webchatId)
      .single();

    if (webchatError || !webchat) {
      return new Response(
        JSON.stringify({ error: 'Chatbot not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', webchat.user_id)
      .eq('phone_number', sessionId)
      .eq('channel_type', 'webchat')
      .single();

    if (convError || !conversation) {
      return new Response(
        JSON.stringify({ messages: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get new messages since lastMessageTime (only outbound from CRM, not bot)
    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .eq('direction', 'outbound')
      .eq('is_bot', false)
      .order('created_at', { ascending: true });

    if (lastMessageTime) {
      query = query.gt('created_at', lastMessageTime);
    }

    const { data: messages, error: msgError } = await query.limit(20);

    if (msgError) {
      console.error('Error fetching messages:', msgError);
      return new Response(
        JSON.stringify({ messages: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ messages: messages || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in web-chat-poll:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
