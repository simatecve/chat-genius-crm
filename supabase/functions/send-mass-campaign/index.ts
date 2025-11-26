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

    // Validar sesión de WhatsApp activa
    const { data: activeConnection } = await supabase
      .from('whatsapp_connections')
      .select('name, phone_number, status')
      .eq('user_id', campaign.user_id)
      .eq('status', 'WORKING')
      .limit(1)
      .maybeSingle();

    const sessionNameToUse = campaign.whatsapp_connection_name || activeConnection?.name || activeConnection?.phone_number || 'default';

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

    // Encolar cada contacto para procesamiento en background
    let enqueuedCount = 0;
    let currentTime = Date.now();
    const minDelayMs = (campaign.min_delay || 1) * 1000;
    const maxDelayMs = (campaign.max_delay || 5) * 1000;

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

        const sessionName = sessionNameToUse;
        const formattedPhone = contact.phone_number.replace(/\D/g, '');
        const chatId = formattedPhone; // WAHA acepta número limpio como chatId

        const randomDelay = Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;
        currentTime += randomDelay;
        const scheduledFor = new Date(currentTime).toISOString();

        // Encolar para envío en background
        await supabase
          .from('automated_message_logs')
          .insert({
            user_id: campaign.user_id,
            phone_number: chatId,
            message_content: messageToSend,
            scheduled_for: scheduledFor,
            status: 'pending',
          });

        // Registrar estado 'queued' para la campaña
        await supabase
          .from('campaign_sends')
          .insert({
            campaign_id: campaign_id,
            contact_id: contact.id,
            phone_number: contact.phone_number,
            contact_name: contact.name,
            message_sent: messageToSend,
            was_personalized: campaign.edit_with_ai,
            status: 'queued',
            user_id: campaign.user_id,
          });

        enqueuedCount++;

      } catch (contactError) {
        console.error(`Failed to enqueue for ${contact.name}:`, contactError);
      }
    }

    // Actualizar estado de la campaña a 'sending' y total encolado
    await supabase
      .from('mass_campaigns')
      .update({ 
        status: 'sending',
        total_count: contacts.length,
        sent_count: 0,
      })
      .eq('id', campaign_id);

    console.log(`Campaign ${campaign_id} enqueued: ${enqueuedCount}/${contacts.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        enqueued_count: enqueuedCount,
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
