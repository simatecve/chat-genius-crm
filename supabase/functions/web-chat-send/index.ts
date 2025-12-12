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
    const { conversationId, message, userId, attachmentUrl, attachmentType } = await req.json();

    if (!conversationId || (!message && !attachmentUrl)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: conversationId, message or attachmentUrl' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify conversation exists and is a webchat
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('channel_type', 'webchat')
      .single();

    if (convError || !conversation) {
      console.error('Conversation not found:', convError);
      return new Response(
        JSON.stringify({ error: 'Webchat conversation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine message type
    let messageType = 'text';
    if (attachmentUrl) {
      if (attachmentType?.startsWith('image/')) {
        messageType = 'image';
      } else if (attachmentType?.startsWith('video/')) {
        messageType = 'video';
      } else if (attachmentType?.startsWith('audio/')) {
        messageType = 'audio';
      } else {
        messageType = 'document';
      }
    }

    const messageContent = message || (attachmentUrl ? `[Archivo: ${messageType}]` : '');

    // Insert the outbound message from CRM
    const { data: savedMessage, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        user_id: userId || conversation.user_id,
        content: messageContent,
        direction: 'outbound',
        is_bot: false,
        message_type: messageType,
        attachment_url: attachmentUrl || null
      })
      .select()
      .single();

    if (msgError) {
      console.error('Error saving message:', msgError);
      return new Response(
        JSON.stringify({ error: 'Failed to save message' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update conversation last message
    await supabase
      .from('conversations')
      .update({
        last_message: messageContent,
        last_message_time: new Date().toISOString()
      })
      .eq('id', conversationId);

    console.log(`CRM message sent to webchat conversation ${conversationId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        savedMessage 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in web-chat-send:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
