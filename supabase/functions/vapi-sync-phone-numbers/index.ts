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

    // Obtener números de VAPI
    const resp = await fetch("https://api.vapi.ai/phone-number", {
      headers: {
        Authorization: `Bearer ${Deno.env.get("VAPI_KEY")}`,
        "Content-Type": "application/json",
      },
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("VAPI error fetching phone numbers:", txt);
      return new Response(
        JSON.stringify({ error: "VAPI error", details: txt }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const numbers = await resp.json();
    console.log("Numbers from VAPI:", JSON.stringify(numbers));

    if (!Array.isArray(numbers) || numbers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, count: 0, message: "No phone numbers found in VAPI" }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Hacer upsert de los números
    const inserts = numbers.map((n: any) => ({
      vapi_phone_number_id: n.id,
      friendly_name: n.name || n.number || n.id,
      phone_number: n.number ?? null,
    }));

    const { error: upsertErr } = await supabase
      .from("vapi_phone_numbers")
      .upsert(inserts, { onConflict: "vapi_phone_number_id" });

    if (upsertErr) {
      console.error("DB upsert error:", upsertErr);
      return new Response(
        JSON.stringify({ error: "DB upsert failed", details: upsertErr }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, count: inserts.length, numbers: inserts }),
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
