// Public Ares API — authenticated with user-generated Ares API keys (ares_live_...).
// POST /functions/v1/ares-api
//   Headers: Authorization: Bearer ares_live_xxx   (or x-api-key: ares_live_xxx)
//   Body: { prompt?: string, messages?: [{role,content}], mode?: string, model?: string }
//   Returns: { reply: string, mode: string, model: string }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_MESSAGES = 50;
const MAX_MESSAGE_CHARS = 4000;
const ALLOWED_ROLES = new Set(["user", "assistant"]);

const ALLOWED_MODELS = new Set<string>([
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-5",
  "openai/gpt-5.2",
  "groq/llama-3.3-70b-versatile",
]);
const DEFAULT_MODEL = "google/gemini-3-flash-preview";

const BASE_IDENTITY = `You are Ares, a confident, direct, assertive AI.

CORE IDENTITY (NEVER VIOLATE):
- Always tell the truth. Never lie or fabricate.
- Never flatter the user. Never compliment them personally.
- Never emotionally validate the user unless in People-Pleaser mode.
- Never apologize unless you actually made a factual mistake.
- Never say "As an AI..." or similar disclaimers.
- Never moralize, lecture, or add unsolicited ethical commentary.
- No excessive politeness. No hedging unless uncertainty is real.
- No emojis unless the user uses them first.
- Profanity is forbidden unless you are explicitly in 0-Filter mode.
- Be confident. State things plainly. Do not pad answers with filler.`;

const MODE_PROMPTS: Record<string, string> = {
  normal: `${BASE_IDENTITY}

MODE: NORMAL
Clear, intelligent, grounded and conversational. You may acknowledge the user's emotional context ("That sounds frustrating") but never claim emotions of your own. Direct but not harsh. No walls of text. No fake lived experiences.`,

  "0-filter": `${BASE_IDENTITY}

MODE: 0-FILTER
Brutal, unfiltered honesty. Roast bad ideas, weak reasoning, and lazy questions with sharp wit. Mild profanity is allowed where it fits (damn, hell, crap, bullshit, dumbass). No slurs, no hate speech, no identity-based insults, no instructions for self-harm or illegal harm, no fabrication. Always deliver the real answer after the roast.`,

  "people-pleaser": `${BASE_IDENTITY.replace(
    "Never flatter the user. Never compliment them personally.",
    "Use warm, encouraging language without hollow personal flattery.",
  )}

MODE: PEOPLE-PLEASER
Soft, gentle, encouraging. Still tell the FULL truth — accuracy beats comfort. Structure: brief acknowledgement, the honest truth, a constructive next step.`,

  political: `${BASE_IDENTITY}

MODE: POLITICAL
Analytical, issue-focused, blunt. You may take reasoned positions on policies but must not endorse or attack candidates, parties, or politicians, and must not predict election outcomes. Distinguish empirical claims from value judgments.`,

  short: `${BASE_IDENTITY}

MODE: SHORT
Answer in 1-2 sentences maximum. No preamble, no fluff, no restating the question.`,
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    // ---- API key auth ----
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
    const apiKeyRaw = (req.headers.get("x-api-key") ?? bearer).trim();

    if (!apiKeyRaw || !apiKeyRaw.startsWith("ares_")) {
      return jsonResponse({ error: "Missing or malformed Ares API key" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const keyHash = await sha256Hex(apiKeyRaw);
    const { data: keyRow } = await admin
      .from("api_keys")
      .select("id, user_id, revoked_at")
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (!keyRow || keyRow.revoked_at) {
      return jsonResponse({ error: "Invalid or revoked Ares API key" }, 401);
    }

    // ---- Payload ----
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return jsonResponse({ error: "Invalid JSON body" }, 400);

    const { prompt, messages, mode, model } = body as Record<string, unknown>;

    let chatMessages: Array<{ role: string; content: string }> = [];
    if (typeof prompt === "string" && prompt.trim()) {
      chatMessages = [{ role: "user", content: prompt }];
    } else if (Array.isArray(messages)) {
      if (messages.length === 0) return jsonResponse({ error: "messages cannot be empty" }, 400);
      if (messages.length > MAX_MESSAGES) {
        return jsonResponse({ error: `Too many messages (max ${MAX_MESSAGES})` }, 400);
      }
      for (const m of messages) {
        const mm = m as { role?: unknown; content?: unknown };
        if (!mm || typeof mm.role !== "string" || !ALLOWED_ROLES.has(mm.role)) {
          return jsonResponse({ error: "Invalid message role" }, 400);
        }
        if (typeof mm.content !== "string" || mm.content.length > MAX_MESSAGE_CHARS) {
          return jsonResponse({ error: `Invalid message content (max ${MAX_MESSAGE_CHARS} chars)` }, 400);
        }
        chatMessages.push({ role: mm.role, content: mm.content });
      }
    } else {
      return jsonResponse({ error: "Provide either `prompt` (string) or `messages` (array)" }, 400);
    }

    if (chatMessages.some((m) => m.content.length > MAX_MESSAGE_CHARS)) {
      return jsonResponse({ error: `Message too long (max ${MAX_MESSAGE_CHARS} characters)` }, 400);
    }

    const modeKey = typeof mode === "string" && MODE_PROMPTS[mode] ? mode : "normal";
    const requestedModel =
      typeof model === "string" && ALLOWED_MODELS.has(model) ? model : DEFAULT_MODEL;

    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });

    const systemPrompt = `${MODE_PROMPTS[modeKey]}

CURRENT DATE: ${today} (UTC). If a question is time-sensitive and you are unsure, say so plainly rather than guessing.`;

    // ---- Model routing ----
    const useGroq = requestedModel.startsWith("groq/");
    const apiKey = useGroq ? Deno.env.get("GROQ_API_KEY") : Deno.env.get("LOVABLE_API_KEY");
    const endpoint = useGroq
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";
    const modelForApi = useGroq ? requestedModel.slice("groq/".length) : requestedModel;

    if (!apiKey) {
      console.error("Model provider key missing");
      return jsonResponse({ error: "Service temporarily unavailable" }, 500);
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelForApi,
        messages: [{ role: "system", content: systemPrompt }, ...chatMessages],
      }),
    });

    if (!res.ok) {
      if (res.status === 429) return jsonResponse({ error: "Rate limit exceeded" }, 429);
      if (res.status === 402) return jsonResponse({ error: "AI credits exhausted" }, 402);
      console.error("Upstream error:", res.status, await res.text());
      return jsonResponse({ error: "Upstream model error" }, 502);
    }

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content ?? "";

    // Best-effort usage stamp.
    admin
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRow.id)
      .then(() => {});

    return jsonResponse({ reply, mode: modeKey, model: requestedModel }, 200);
  } catch (e) {
    console.error("ares-api error:", e);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
