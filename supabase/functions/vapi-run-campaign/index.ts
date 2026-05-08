import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { campaignId } = await req.json();
    if (!campaignId) throw new Error("campaignId is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1. Obtener datos de la campaña
    const { data: campaign, error: fetchErr } = await supabase
      .from("vapi_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (fetchErr || !campaign) throw new Error("Campaign not found");

    // 2. Actualizar estado a running
    await supabase.from("vapi_campaigns").update({ status: "running" }).eq("id", campaignId);

    const contacts = campaign.contacts;
    console.log(`Starting campaign ${campaign.name} for ${contacts.length} contacts`);

    // 3. Ejecutar llamadas
    for (const phone of contacts) {
      try {
        const vapiResp = await fetch("https://api.vapi.ai/call", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("VAPI_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assistantId: campaign.assistant_id,
            phoneNumberId: campaign.phone_number_id,
            customer: { number: phone },
            metadata: { campaignId: campaign.id }
          }),
        });

        if (!vapiResp.ok) {
          const errorText = await vapiResp.text();
          console.error(`VAPI Call Failed for ${phone}:`, errorText);
        } else {
          console.log(`VAPI Call Success for ${phone}`);
        }
      } catch (e) {
        console.error(`Network Error calling ${phone}:`, e);
      }
    }

    // 4. Finalizar
    await supabase.from("vapi_campaigns").update({ status: "completed" }).eq("id", campaignId);

    return new Response(JSON.stringify({ success: true, message: "Campaign finished" }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });
  }
});
