import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, content-type, apikey, x-client-info",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Obtener voces de VAPI
    const resp = await fetch("https://api.vapi.ai/voice", {
      headers: {
        Authorization: `Bearer ${Deno.env.get("VAPI_KEY")}`,
        "Content-Type": "application/json",
      },
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(JSON.stringify({ error: "VAPI error", details: txt }), { status: 502, headers: cors });
    }

    const voices = await resp.json();

    if (!Array.isArray(voices)) {
      return new Response(JSON.stringify({ success: true, count: 0 }), { status: 200, headers: cors });
    }

    // Upsert de las voces
    const inserts = voices.map((v: any) => ({
      vapi_voice_id: v.id || v.voiceId,
      provider: v.provider,
      name: v.name || v.id,
      language: v.language || 'en',
      raw_data: v
    }));

    const { error: dbErr } = await supabase
      .from("vapi_voices")
      .upsert(inserts, { onConflict: "vapi_voice_id" });

    if (dbErr) throw dbErr;

    return new Response(
      JSON.stringify({ success: true, count: inserts.length }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });
  }
});
