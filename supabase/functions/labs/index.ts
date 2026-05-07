// Ares Labs — generates/edits a self-contained single-file HTML app.
// Model: openai/gpt-5.5-pro via Lovable AI Gateway. Returns { html, summary }.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_PROMPT = 8000;
const MAX_HTML_IN = 200_000;
const MAX_TURNS = 30;

const SYSTEM_PROMPT = `You are Ares Labs — a senior staff engineer that builds and modifies web apps as a SINGLE self-contained HTML document.

HARD RULES:
- Output ONE complete HTML document via the \`emit_app\` tool. Never reply in plain text.
- The HTML must include <!doctype html>, <html>, <head>, <body>, all CSS in <style>, all JS in <script>.
- Use Tailwind via the CDN script: <script src="https://cdn.tailwindcss.com"></script>.
- Prefer vanilla JS or React via esm.sh (e.g. import React from "https://esm.sh/react@18") in a <script type="module">.
- The app MUST run inside an <iframe> with no network/back-end. No fetch to private APIs. No localStorage requirement.
- Modern, clean, production-ready UI. Responsive. Accessible. Smooth interactions.
- When the user asks for a CHANGE, modify the prior HTML — keep what works, change what they asked for.
- Keep the document under ~120KB. No giant base64 images. Use SVG or unsplash.com URLs sparingly.
- The \`summary\` field is one short sentence describing what changed. No filler.

If the user request is ambiguous, make a confident, tasteful choice and ship it. No clarifying questions.`;

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return jsonResponse({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData?.user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return jsonResponse({ error: "Invalid body" }, 400);

    const { prompt, currentHtml, history } = body as {
      prompt?: unknown;
      currentHtml?: unknown;
      history?: unknown;
    };

    if (typeof prompt !== "string" || !prompt.trim()) {
      return jsonResponse({ error: "prompt required" }, 400);
    }
    if (prompt.length > MAX_PROMPT) return jsonResponse({ error: "prompt too long" }, 400);

    const prior = typeof currentHtml === "string" && currentHtml.length <= MAX_HTML_IN
      ? currentHtml
      : "";

    const turns: Array<{ role: "user" | "assistant"; content: string }> = [];
    if (Array.isArray(history)) {
      for (const t of (history as unknown[]).slice(-MAX_TURNS)) {
        if (!t || typeof t !== "object") continue;
        const tt = t as { role?: unknown; content?: unknown };
        if ((tt.role === "user" || tt.role === "assistant") && typeof tt.content === "string") {
          turns.push({ role: tt.role, content: tt.content.slice(0, 2000) });
        }
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonResponse({ error: "Service unavailable" }, 500);

    const userMessage = prior
      ? `CURRENT APP HTML (modify this):\n\`\`\`html\n${prior}\n\`\`\`\n\nUSER REQUEST:\n${prompt}`
      : `USER REQUEST (build from scratch):\n${prompt}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...turns,
          { role: "user", content: userMessage },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "emit_app",
              description: "Emit the complete updated HTML app and a one-sentence change summary.",
              parameters: {
                type: "object",
                properties: {
                  html: { type: "string", description: "Complete self-contained HTML document." },
                  summary: { type: "string", description: "One short sentence on what changed." },
                },
                required: ["html", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "emit_app" } },
      }),
    });

    if (!res.ok) {
      if (res.status === 429) return jsonResponse({ error: "Rate limited. Slow down." }, 429);
      if (res.status === 402) return jsonResponse({ error: "AI credits exhausted." }, 402);
      const t = await res.text();
      console.error("labs gateway error:", res.status, t);
      return jsonResponse({ error: "AI gateway error" }, 500);
    }

    const data = await res.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = call?.function?.arguments;
    if (typeof argsStr !== "string") {
      console.error("labs: no tool call", JSON.stringify(data).slice(0, 800));
      return jsonResponse({ error: "Model did not emit an app" }, 500);
    }
    let parsed: { html?: unknown; summary?: unknown };
    try {
      parsed = JSON.parse(argsStr);
    } catch {
      return jsonResponse({ error: "Invalid model output" }, 500);
    }
    const html = typeof parsed.html === "string" ? parsed.html : "";
    const summary = typeof parsed.summary === "string" ? parsed.summary : "Updated.";
    if (!html) return jsonResponse({ error: "Empty app" }, 500);

    return jsonResponse({ html, summary }, 200);
  } catch (e) {
    console.error("labs error:", e);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
