import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

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

    // Obtener el agente de IA del usuario si edit_with_ai está activo
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
      .filter((c: any) => c) as Array<{
        id: string;
        name: string;
        phone_number: string;
      }>;

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

    // Procesar cada contacto
    let sentCount = 0;
    let failedCount = 0;

    for (const contact of contacts) {
      try {
        let messageToSend = campaign.message;

        // Personalizar mensaje con IA si está habilitado
        if (campaign.edit_with_ai && aiAgent && lovableApiKey) {
          try {
            const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${lovableApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: aiAgent.model || 'google/gemini-2.5-flash',
                messages: [
                  {
                    role: 'system',
                    content: 'Eres un asistente que personaliza mensajes de WhatsApp. Reescribe el mensaje de forma natural y ligeramente diferente, manteniendo el mismo significado y tono. No agregues saludos o despedidas adicionales si no están en el mensaje original.'
                  },
                  {
                    role: 'user',
                    content: `Reescribe este mensaje de forma única y natural para ${contact.name}:\n\n${campaign.message}`
                  }
                ],
                temperature: aiAgent.temperature || 0.7,
                max_tokens: aiAgent.max_tokens || 500,
              }),
            });

            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              messageToSend = aiData.choices[0].message.content;
            }
          } catch (aiError) {
            console.error('AI personalization failed, using original message:', aiError);
          }
        }

        // Reemplazar placeholders básicos
        messageToSend = messageToSend
          .replace(/\{nombre\}/gi, contact.name || '')
          .replace(/\{telefono\}/gi, contact.phone_number || '');

        const sessionName = campaign.whatsapp_connection_name || 'default';
        const formattedPhone = contact.phone_number.replace(/\D/g, '');
        const chatId = `${formattedPhone}@c.us`;

        // Enviar presencia "escribiendo"
        await fetch(`${wahaBaseUrl}/api/sendPresence`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': wahaApiKey,
          },
          body: JSON.stringify({
            chatId: chatId,
            presence: 'composing',
            session: sessionName,
          }),
        });

        // Calcular delay aleatorio entre min y max
        const minDelay = (campaign.min_delay || 1) * 1000;
        const maxDelay = (campaign.max_delay || 5) * 1000;
        const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

        // Esperar el delay simulando escritura
        await new Promise(resolve => setTimeout(resolve, randomDelay));

        // Enviar el mensaje
        const sendResponse = await fetch(`${wahaBaseUrl}/api/sendText`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': wahaApiKey,
          },
          body: JSON.stringify({
            chatId: chatId,
            text: messageToSend,
            session: sessionName,
          }),
        });

        if (!sendResponse.ok) {
          throw new Error(`Failed to send message: ${sendResponse.statusText}`);
        }

        // Detener presencia "escribiendo"
        await fetch(`${wahaBaseUrl}/api/sendPresence`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': wahaApiKey,
          },
          body: JSON.stringify({
            chatId: chatId,
            presence: 'paused',
            session: sessionName,
          }),
        });

        // Registrar envío exitoso
        await supabase
          .from('campaign_sends')
          .insert({
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

        // Actualizar progreso cada 5 mensajes
        if (sentCount % 5 === 0) {
          await supabase
            .from('mass_campaigns')
            .update({ sent_count: sentCount })
            .eq('id', campaign_id);
        }

        console.log(`Sent to ${contact.name} (${sentCount}/${contacts.length})`);

      } catch (contactError) {
        console.error(`Failed to send to ${contact.name}:`, contactError);
        failedCount++;

        const errorMessage = contactError instanceof Error ? contactError.message : 'Unknown error';

        // Registrar envío fallido
        await supabase
          .from('campaign_sends')
          .insert({
            campaign_id: campaign_id,
            contact_id: contact.id,
            phone_number: contact.phone_number,
            contact_name: contact.name,
            message_sent: campaign.message,
            was_personalized: false,
            status: 'failed',
            error_message: errorMessage,
            user_id: campaign.user_id,
          });
      }
    }

    // Actualizar estado final de la campaña
    const successRate = (sentCount / contacts.length) * 100;
    let finalStatus = 'sent';
    
    if (successRate === 0) {
      finalStatus = 'failed';
    } else if (successRate < 80) {
      finalStatus = 'partial';
    }

    await supabase
      .from('mass_campaigns')
      .update({ 
        status: finalStatus,
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
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in send-mass-campaign:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
