import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  try {
    const { 
      connection_id, 
      recipient_id, 
      message, 
      message_type = 'text',
      conversation_id,
      attachment_url 
    } = await req.json()

    console.log('Sending Facebook message:', { connection_id, recipient_id, message_type })

    if (!connection_id || !recipient_id) {
      return new Response(JSON.stringify({ error: 'Missing connection_id or recipient_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get the Facebook connection
    const { data: connection, error: connError } = await supabase
      .from('facebook_connections')
      .select('*')
      .eq('id', connection_id)
      .single()

    if (connError || !connection) {
      console.error('Connection not found:', connError)
      return new Response(JSON.stringify({ error: 'Connection not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build the message payload
    let messagePayload: any = {
      recipient: { id: recipient_id },
    }

    if (message_type === 'text') {
      messagePayload.message = { text: message }
    } else if (message_type === 'image' && attachment_url) {
      messagePayload.message = {
        attachment: {
          type: 'image',
          payload: { url: attachment_url, is_reusable: true },
        },
      }
    } else if (message_type === 'file' && attachment_url) {
      messagePayload.message = {
        attachment: {
          type: 'file',
          payload: { url: attachment_url, is_reusable: true },
        },
      }
    } else if (message_type === 'video' && attachment_url) {
      messagePayload.message = {
        attachment: {
          type: 'video',
          payload: { url: attachment_url, is_reusable: true },
        },
      }
    } else if (message_type === 'audio' && attachment_url) {
      messagePayload.message = {
        attachment: {
          type: 'audio',
          payload: { url: attachment_url, is_reusable: true },
        },
      }
    } else {
      messagePayload.message = { text: message || 'Mensaje' }
    }

    // Send via Facebook Graph API
    const sendUrl = `https://graph.facebook.com/v18.0/me/messages?access_token=${connection.page_access_token}`
    
    console.log('Sending to Facebook API...')
    const fbResponse = await fetch(sendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messagePayload),
    })

    const fbResult = await fbResponse.json()

    if (fbResult.error) {
      console.error('Facebook API error:', fbResult.error)
      return new Response(JSON.stringify({ error: fbResult.error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Message sent successfully:', fbResult.message_id)

    // Save the outgoing message to the database
    if (conversation_id) {
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation_id,
          content: message || attachment_url || '',
          direction: 'outbound',
          message_type: message_type,
          status: 'sent',
          metadata: {
            facebook_message_id: fbResult.message_id,
            recipient_id: recipient_id,
          },
        })

      if (msgError) {
        console.error('Error saving message to database:', msgError)
      }

      // Update conversation last message
      await supabase
        .from('conversations')
        .update({
          last_message: (message || 'Archivo enviado').substring(0, 100),
          last_message_time: new Date().toISOString(),
        })
        .eq('id', conversation_id)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message_id: fbResult.message_id 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Send message error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
