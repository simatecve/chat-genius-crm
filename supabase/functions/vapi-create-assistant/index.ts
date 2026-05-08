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
    const payload = await req.json();
    const {
      name,
      firstMessage,
      systemPrompt,
      voiceProvider = "playht",
      voiceId = "jennifer",
      modelProvider = "openai",
      modelName = "gpt-4o-mini",
    } = payload;

    if (!name || !systemPrompt) {
      return new Response(
        JSON.stringify({ error: "name and systemPrompt are required" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Construir payload para VAPI
    const vapiPayload = {
      name,
      firstMessage: firstMessage || "Hola, ¿cómo puedo ayudarte?",
      model: {
        provider: modelProvider,
        model: modelName,
        messages: [{ role: "system", content: systemPrompt }],
      },
      voice: {
        provider: voiceProvider,
        voiceId: voiceId,
      },
      recordingEnabled: true,
      transcriber: {
        provider: "deepgram",
        model: "nova-2",
        language: "es",
      },
    };

    // Llamar a la API de VAPI para crear el asistente
    const vapiResp = await fetch("https://api.vapi.ai/assistant", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("VAPI_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(vapiPayload),
    });

    if (!vapiResp.ok) {
      const err = await vapiResp.text();
      console.error("VAPI error creating assistant:", err);
      return new Response(
        JSON.stringify({ error: "VAPI error", details: err }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const vapiData = await vapiResp.json();
    const vapiAssistantId = vapiData.id;

    // --- NUEVO: PUBLICAR EL ASISTENTE ---
    const pubResp = await fetch(`https://api.vapi.ai/assistant/${vapiAssistantId}/publish`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("VAPI_KEY")}`,
        "Content-Type": "application/json",
      },
    });
    
    if (pubResp.ok) {
      console.log("Assistant published successfully");
    } else {
      const pubErr = await pubResp.text();
      console.error("Assistant publish failed:", pubErr);
    }

    // Guardar en Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: inserted, error: dbErr } = await supabase
      .from("vapi_assistants")
      .insert({
        vapi_assistant_id: vapiAssistantId,
        name,
        first_message: firstMessage || "Hola, ¿cómo puedo ayudarte?",
        voice_provider: voiceProvider,
        voice_id: voiceId,
        model_provider: modelProvider,
        model_name: modelName,
        system_prompt: systemPrompt,
      })
      .select()
      .single();

    if (dbErr) {
      console.error("DB insert error:", dbErr);
      return new Response(
        JSON.stringify({ error: "DB insert failed", details: dbErr }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        vapiAssistantId,
        assistant: inserted,
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
