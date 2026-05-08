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
    console.log("VAPI webhook received:", JSON.stringify(payload));

    // VAPI envía el evento dentro de "message"
    const message = payload.message ?? payload;
    const type = message.type ?? payload.type;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Obtener el callId del evento
    const callId =
      message.call?.id ??
      payload.call?.id ??
      message.callId ??
      payload.callId;

    if (!callId) {
      console.log("No callId found in payload, skipping.");
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const updates: Record<string, any> = {
      raw_event: payload,
      updated_at: new Date().toISOString(),
    };

    // Mapear eventos de VAPI a campos de la tabla
    if (type === "end-of-call-report" || type === "call.completed") {
      updates.status = "completed";
      updates.ended_at = message.endedAt
        ? new Date(message.endedAt).toISOString()
        : new Date().toISOString();
      updates.duration_seconds = message.durationSeconds ?? message.duration ?? null;
      updates.transcript = message.transcript ?? null;
      updates.summary = message.summary ?? null;
      updates.recording_url = message.recordingUrl ?? null;
      updates.ended_reason = message.endedReason ?? null;
      // Capturar intent si existe
      if (message.analysis) {
        updates.intent = message.analysis;
      }
    } else if (type === "status-update" || type === "call.status-update") {
      updates.status = message.status ?? "unknown";
    } else if (type === "transcript") {
      // Actualización parcial de transcripción en tiempo real
      updates.transcript = message.transcript ?? null;
    } else if (type === "call.failed" || type === "call-ended") {
      updates.status = "failed";
      updates.ended_at = new Date().toISOString();
      updates.ended_reason = message.endedReason ?? "unknown";
    }

    const { error: updateErr } = await supabase
      .from("vapi_calls")
      .update(updates)
      .eq("vapi_call_id", callId);

    if (updateErr) {
      console.error("Error updating vapi_call:", updateErr);
    } else {
      console.log(`Call ${callId} updated with type: ${type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    // Siempre responder 200 para que VAPI no reintente
    return new Response(JSON.stringify({ received: true, error: error.message }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
