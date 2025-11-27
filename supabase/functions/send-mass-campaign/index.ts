import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Función de delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaign_id } = await req.json();

    if (!campaign_id) {
      throw new Error('campaign_id is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const wahaBaseUrl = Deno.env.get('WAHA_BASE_URL')!;
    const wahaApiKey = Deno.env.get('WAHA_API_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener la campaña
    const { data: campaign, error: campaignError } = await supabase
      .from('mass_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campaign not found');
    }

    // Obtener el agente de IA si edit_with_ai está activo
    let aiAgent = null;
    if (campaign.edit_with_ai) {
      const { data: agent } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('user_id', campaign.user_id)
        .eq('is_active', true)
        .single();
      aiAgent = agent;
    }

    // Obtener sesión de WhatsApp activa
    const { data: activeConnection } = await supabase
      .from('whatsapp_connections')
      .select('name, phone_number, status')
      .eq('user_id', campaign.user_id)
      .eq('status', 'WORKING')
      .limit(1)
      .maybeSingle();

    if (!activeConnection) {
      throw new Error('No active WhatsApp connection found');
    }

    const sessionName = campaign.whatsapp_connection_name || activeConnection.name || activeConnection.phone_number || 'default';
    const whatsappNumber = activeConnection.phone_number;

    // Obtener contactos de la lista
    const { data: listMembers, error: membersError } = await supabase
      .from('contact_list_members')
      .select('contact_id, contacts(*)')
      .eq('contact_list_id', campaign.contact_list_id);

    if (membersError || !listMembers || listMembers.length === 0) {
      throw new Error('No contacts found in list');
    }

    const contacts = listMembers
      .map((m: any) => m.contacts)
      .filter((c: any) => c && c.phone_number);

    // Actualizar campaña a estado 'sending'
    await supabase
      .from('mass_campaigns')
      .update({ 
        status: 'sending',
        total_count: contacts.length,
        sent_count: 0
      })
      .eq('id', campaign_id);

    console.log(`Starting campaign ${campaign_id} with ${contacts.length} contacts`);

    const minDelayMs = (campaign.min_delay || 3) * 1000;
    const maxDelayMs = (campaign.max_delay || 8) * 1000;
    let sentCount = 0;
    let failedCount = 0;

    // Procesar cada contacto
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      try {
        let messageToSend = campaign.message;

        // Personalizar mensaje con IA si está habilitado
        if (campaign.edit_with_ai && lovableApiKey) {
          try {
            console.log(`Personalizing message for ${contact.name} with AI...`);
            const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${lovableApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: aiAgent?.model || 'google/gemini-2.5-flash',
                messages: [
                  {
                    role: 'system',
                    content: 'Eres un asistente que personaliza mensajes de WhatsApp. Tu tarea es reescribir el mensaje dado de forma ligeramente diferente pero manteniendo EXACTAMENTE el mismo significado, tono y longitud aproximada. Responde ÚNICAMENTE con el mensaje reescrito. NO incluyas explicaciones, opciones alternativas, ni texto adicional.'
                  },
                  {
                    role: 'user',
                    content: `Reescribe este mensaje para ${contact.name || 'el destinatario'}:\n\n${campaign.message}`
                  }
                ],
                temperature: aiAgent?.temperature || 0.7,
                max_tokens: aiAgent?.max_tokens || 300,
              }),
            });

            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              const aiContent = aiData.choices?.[0]?.message?.content;
              if (aiContent && aiContent.length < campaign.message.length * 3) {
                messageToSend = aiContent.trim();
                console.log(`AI personalized message: ${messageToSend.substring(0, 50)}...`);
              }
            }
          } catch (aiError) {
            console.error('AI personalization failed, using original message:', aiError);
          }
        }

        // Reemplazar placeholders básicos
        messageToSend = messageToSend
          .replace(/\{nombre\}/gi, contact.name || '')
          .replace(/\{telefono\}/gi, contact.phone_number || '');

        // Formatear número para WAHA
        const cleanNumber = contact.phone_number.replace(/\D/g, '');
        const chatId = `${cleanNumber}@c.us`;

        console.log(`Sending message ${i + 1}/${contacts.length} to ${chatId}`);

        // Enviar via WAHA
        const wahaResponse = await fetch(`${wahaBaseUrl}/api/sendText`, {
          method: 'POST',
          headers: {
            'X-Api-Key': wahaApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatId: chatId,
            text: messageToSend,
            session: sessionName,
            linkPreview: true,
          }),
        });

        const wahaResult = await wahaResponse.json();

        if (wahaResponse.ok) {
          console.log(`✅ Message sent to ${contact.name}`);

          // Buscar o crear conversación
          let conversationId: string | null = null;
          
          const { data: existingConv } = await supabase
            .from('conversations')
            .select('id, whatsapp_number, contact_name')
            .eq('phone_number', cleanNumber)
            .eq('user_id', campaign.user_id)
            .maybeSingle();

          if (existingConv) {
            conversationId = existingConv.id;
            
            // Actualizar conversación existente con campos faltantes
            const updateFields: Record<string, any> = {
              last_message: messageToSend,
              last_message_time: new Date().toISOString(),
            };
            
            // Si whatsapp_number está vacío, actualizarlo
            if (!existingConv.whatsapp_number) {
              updateFields.whatsapp_number = whatsappNumber;
            }
            
            // Si contact_name está vacío, actualizarlo
            if (!existingConv.contact_name) {
              updateFields.contact_name = contact.name || cleanNumber;
            }
            
            await supabase
              .from('conversations')
              .update(updateFields)
              .eq('id', conversationId);
              
          } else {
            // Crear nueva conversación
            const { data: newConv } = await supabase
              .from('conversations')
              .insert({
                phone_number: cleanNumber,
                contact_name: contact.name || cleanNumber,
                user_id: campaign.user_id,
                whatsapp_number: whatsappNumber,
                last_message: messageToSend,
                last_message_time: new Date().toISOString(),
              })
              .select('id')
              .single();
            
            if (newConv) {
              conversationId = newConv.id;
            }
          }

          // Guardar mensaje en la tabla messages
          if (conversationId) {
            await supabase.from('messages').insert({
              conversation_id: conversationId,
              user_id: campaign.user_id,
              content: messageToSend,
              direction: 'outbound',
              status: 'sent',
              message_type: 'text',
              is_bot: false,
              metadata: {
                waha_id: wahaResult.id,
                campaign_id: campaign_id,
                sent_via: 'mass_campaign'
              }
            });
          }

          // Registrar en campaign_sends
          await supabase.from('campaign_sends').insert({
            campaign_id: campaign_id,
            contact_id: contact.id,
            phone_number: contact.phone_number,
            contact_name: contact.name,
            message_sent: messageToSend,
            was_personalized: campaign.edit_with_ai,
            status: 'sent',
            sent_at: new Date().toISOString(),
            user_id: campaign.user_id,
          });

          sentCount++;
          
          // Actualizar progreso de la campaña
          await supabase
            .from('mass_campaigns')
            .update({ sent_count: sentCount })
            .eq('id', campaign_id);

        } else {
          console.error(`❌ Failed to send to ${contact.name}:`, wahaResult);
          
          await supabase.from('campaign_sends').insert({
            campaign_id: campaign_id,
            contact_id: contact.id,
            phone_number: contact.phone_number,
            contact_name: contact.name,
            message_sent: messageToSend,
            was_personalized: campaign.edit_with_ai,
            status: 'failed',
            error_message: JSON.stringify(wahaResult),
            user_id: campaign.user_id,
          });
          
          failedCount++;
        }

        // Delay antes del siguiente mensaje (excepto el último)
        if (i < contacts.length - 1) {
          const randomDelay = Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;
          console.log(`Waiting ${randomDelay}ms before next message...`);
          await delay(randomDelay);
        }

      } catch (contactError) {
        console.error(`Error processing contact ${contact.name}:`, contactError);
        failedCount++;
      }
    }

    // Marcar campaña como completada
    await supabase
      .from('mass_campaigns')
      .update({ 
        status: 'completed',
        sent_count: sentCount,
      })
      .eq('id', campaign_id);

    console.log(`Campaign ${campaign_id} completed: ${sentCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent_count: sentCount,
        failed_count: failedCount,
        total_count: contacts.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-mass-campaign:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
