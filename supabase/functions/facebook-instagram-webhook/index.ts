import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const VERIFY_TOKEN = Deno.env.get('FACEBOOK_VERIFY_TOKEN')
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  try {
    // GET request - Webhook verification from Meta
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const mode = url.searchParams.get('hub.mode')
      const token = url.searchParams.get('hub.verify_token')
      const challenge = url.searchParams.get('hub.challenge')

      console.log('Webhook verification request:', { mode, token, challenge })

      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verified successfully')
        return new Response(challenge, { 
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        })
      } else {
        console.error('Webhook verification failed - token mismatch')
        return new Response('Forbidden', { status: 403 })
      }
    }

    // POST request - Incoming messages
    if (req.method === 'POST') {
      const body = await req.json()
      console.log('Received webhook payload:', JSON.stringify(body, null, 2))

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

      // Process each entry
      for (const entry of body.entry || []) {
        const pageId = entry.id
        
        // Determine if this is Instagram or Messenger
        const isInstagram = entry.messaging?.[0]?.recipient?.id?.startsWith('17841') || 
                           entry.instagram_business_account?.id

        for (const messagingEvent of entry.messaging || []) {
          const senderId = messagingEvent.sender.id
          const recipientId = messagingEvent.recipient.id
          const timestamp = messagingEvent.timestamp
          const message = messagingEvent.message

          if (!message) {
            console.log('No message in event, skipping (might be a delivery/read receipt)')
            continue
          }

          console.log('Processing message:', { senderId, recipientId, pageId, isInstagram })

          // Find the Facebook connection for this page
          const { data: connection, error: connError } = await supabase
            .from('facebook_connections')
            .select('*')
            .eq('page_id', pageId)
            .single()

          if (connError || !connection) {
            console.error('No Facebook connection found for page:', pageId, connError)
            continue
          }

          const channelType = isInstagram ? 'instagram' : 'facebook'
          const contactIdentifier = senderId

          // Find or create lead
          let { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('user_id', connection.user_id)
            .eq('phone', contactIdentifier)
            .single()

          if (!lead) {
            // Get sender profile from Facebook (optional, might fail)
            let senderName = `Usuario ${channelType}`
            try {
              const profileResponse = await fetch(
                `https://graph.facebook.com/v18.0/${senderId}?fields=name,first_name,last_name&access_token=${connection.page_access_token}`
              )
              if (profileResponse.ok) {
                const profile = await profileResponse.json()
                senderName = profile.name || profile.first_name || senderName
              }
            } catch (e) {
              console.log('Could not fetch sender profile:', e)
            }

            const { data: newLead, error: createLeadError } = await supabase
              .from('leads')
              .insert({
                user_id: connection.user_id,
                name: senderName,
                phone: contactIdentifier,
                source: channelType,
                workspace_id: connection.workspace_id,
                column_id: connection.default_column_id,
              })
              .select()
              .single()

            if (createLeadError) {
              console.error('Error creating lead:', createLeadError)
              continue
            }
            lead = newLead
          }

          // Find or create conversation
          let { data: conversation, error: convError } = await supabase
            .from('conversations')
            .select('*')
            .eq('lead_id', lead.id)
            .eq('facebook_connection_id', connection.id)
            .single()

          if (!conversation) {
            const { data: newConv, error: createConvError } = await supabase
              .from('conversations')
              .insert({
                user_id: connection.user_id,
                lead_id: lead.id,
                contact_phone: contactIdentifier,
                contact_name: lead.name,
                channel_type: channelType,
                facebook_connection_id: connection.id,
                workspace_id: connection.workspace_id,
                status: 'active',
              })
              .select()
              .single()

            if (createConvError) {
              console.error('Error creating conversation:', createConvError)
              continue
            }
            conversation = newConv
          }

          // Determine message content
          let messageContent = message.text || ''
          let messageType = 'text'
          const attachments = message.attachments || []

          if (attachments.length > 0) {
            const attachment = attachments[0]
            messageType = attachment.type || 'attachment'
            if (!messageContent && attachment.payload?.url) {
              messageContent = attachment.payload.url
            }
          }

          // Save the message
          const { error: msgError } = await supabase
            .from('messages')
            .insert({
              conversation_id: conversation.id,
              content: messageContent,
              direction: 'inbound',
              message_type: messageType,
              status: 'received',
              metadata: {
                facebook_message_id: message.mid,
                sender_id: senderId,
                timestamp: timestamp,
                attachments: attachments,
              },
            })

          if (msgError) {
            console.error('Error saving message:', msgError)
            continue
          }

          // Update conversation last message
          await supabase
            .from('conversations')
            .update({
              last_message: messageContent.substring(0, 100),
              last_message_time: new Date(timestamp).toISOString(),
              unread_count: (conversation.unread_count || 0) + 1,
            })
            .eq('id', conversation.id)

          console.log('Message saved successfully for conversation:', conversation.id)

          // Check if AI is enabled for this connection
          if (connection.ai_enabled) {
            console.log('AI is enabled, triggering AI response...')
            // TODO: Call AI agent response function
          }

          // Check if n8n webhook is configured
          if (connection.n8n_webhook_url) {
            console.log('Forwarding to n8n webhook:', connection.n8n_webhook_url)
            try {
              await fetch(connection.n8n_webhook_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  conversation_id: conversation.id,
                  lead_id: lead.id,
                  message: messageContent,
                  sender_id: senderId,
                  channel_type: channelType,
                  timestamp: timestamp,
                }),
              })
            } catch (e) {
              console.error('Error forwarding to n8n:', e)
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response('Method not allowed', { status: 405 })
  } catch (error) {
    console.error('Webhook error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
