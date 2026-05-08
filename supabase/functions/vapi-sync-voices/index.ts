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

    // Intentar obtener voces de VAPI
    let resp = await fetch("https://api.vapi.ai/voice", {
      headers: {
        Authorization: `Bearer ${Deno.env.get("VAPI_KEY")}`,
        "Content-Type": "application/json",
      },
    });

    // Si falla el singular, intentar el plural
    if (resp.status === 404) {
      resp = await fetch("https://api.vapi.ai/voices", {
        headers: {
          Authorization: `Bearer ${Deno.env.get("VAPI_KEY")}`,
          "Content-Type": "application/json",
        },
      });
    }

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("VAPI API Error Details:", txt);
      
      // Fallback: Si no podemos listar, insertamos al menos las básicas para que el usuario no se quede bloqueado
      const fallbackVoices = [
        { vapi_voice_id: "bIHbv24MWmeRgasZH58o", provider: "11labs", name: "Rachel (Default)" },
        { vapi_voice_id: "pNInz6obpgDQGcFMA", provider: "11labs", name: "Adam" },
        { vapi_voice_id: "jennifer", provider: "playht", name: "Jennifer" }
      ];
      
      await supabase.from("vapi_voices").upsert(
        fallbackVoices.map(v => ({ vapi_voice_id: v.vapi_voice_id, provider: v.provider, name: v.name })),
        { onConflict: "vapi_voice_id" }
      );

      return new Response(JSON.stringify({ 
        error: "VAPI_ENDPOINT_NOT_FOUND", 
        message: "El endpoint de voces falló, se cargaron voces básicas de respaldo.",
        details: txt 
      }), { status: 200, headers: cors });
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
