// Video generation via Replicate (text-to-video).
// Uses bytedance/seedance-1-lite (fast, ~5s clips).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (b: unknown, s: number) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: ud, error: ue } = await supabase.auth.getUser(token);
    if (ue || !ud?.user) return json({ error: "Unauthorized" }, 401);

    const REPLICATE = Deno.env.get("REPLICATE_API_TOKEN");
    if (!REPLICATE) return json({ error: "Video service not configured" }, 500);

    const body = await req.json().catch(() => null);
    const prompt = (body?.prompt ?? "").toString().trim();
    if (!prompt) return json({ error: "prompt required" }, 400);
    if (prompt.length > 2000) return json({ error: "prompt too long" }, 400);

    // Create prediction (sync wait up to 60s)
    const start = await fetch(
      "https://api.replicate.com/v1/models/bytedance/seedance-1-lite/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE}`,
          "Content-Type": "application/json",
          Prefer: "wait=60",
        },
        body: JSON.stringify({
          input: {
            prompt,
            duration: 5,
            resolution: "480p",
            aspect_ratio: "16:9",
            fps: 24,
          },
        }),
      },
    );

    if (!start.ok) {
      const t = await start.text();
      console.error("Replicate start error:", start.status, t);
      if (start.status === 402 || start.status === 429)
        return json({ error: "Video service rate-limited or out of credits." }, start.status);
      return json({ error: "Video generation failed to start." }, 500);
    }
    let pred = await start.json();

    // Poll if still running
    const deadline = Date.now() + 4 * 60 * 1000;
    while (
      pred.status &&
      pred.status !== "succeeded" &&
      pred.status !== "failed" &&
      pred.status !== "canceled" &&
      Date.now() < deadline
    ) {
      await new Promise((r) => setTimeout(r, 2500));
      const get = await fetch(pred.urls?.get, {
        headers: { Authorization: `Bearer ${REPLICATE}` },
      });
      pred = await get.json();
    }

    if (pred.status !== "succeeded") {
      console.error("Replicate failed:", pred.status, pred.error);
      return json({ error: pred.error || "Video generation failed." }, 500);
    }
    const url = Array.isArray(pred.output) ? pred.output[0] : pred.output;
    if (!url) return json({ error: "No video returned." }, 500);
    return json({ videoUrl: url, prompt }, 200);
  } catch (e) {
    console.error("video-gen error:", e);
    return json({ error: "Internal error" }, 500);
  }
});
