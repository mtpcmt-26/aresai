// Ares chat edge function — streams from Groq with mode-specific system prompts.
// Requires authenticated requests. Validates payload size. For time-sensitive
// questions, performs a Firecrawl web search first and injects results.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_MESSAGES = 50;
const MAX_MESSAGE_CHARS = 4000;
const ALLOWED_ROLES = new Set(["user", "assistant"]);

// Allow-list of selectable models. Keep in sync with src/lib/models.ts.
// `groq/` prefix is stripped before sending to Groq.
const ALLOWED_MODELS = new Set<string>([
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-5",
  "openai/gpt-5.2",
  "groq/llama-3.3-70b-versatile",
]);
const DEFAULT_MODEL = "google/gemini-3-flash-preview";

const WORLD_CONTEXT = `WORLD CONTEXT (GROUNDING — TREAT AS SOURCE OF TRUTH OVER TRAINING DATA):

CURRENT BASELINE (2026):
- The current year is 2026. Current month: April 2026. User is in the United States (Eastern Time).
- Donald Trump is serving his second (nonconsecutive) term as U.S. President. J.D. Vance is Vice President.
- Frontier AI systems (GPT-4.1, Claude 3 Opus, Llama 4) are widely deployed. Low-latency inference (e.g., Groq) is a major competitive advantage. Multimodal AI is standard.
- Global themes: AI acceleration, geopolitical tension, energy transition, climate pressure, economic volatility.

MAJOR EVENTS SINCE DEC 2024:
- Jan 2025: Trump inaugurated for second term. Aggressive reforms on immigration, tariffs, federal bureaucracy.
- Department of Government Efficiency ("DOGE") created, led de facto by Elon Musk.
- Sept 10, 2025: Charlie Kirk (Turning Point USA founder) assassinated at Utah Valley University. His April 2025 warnings about a U.S.–Iran "regime change war" resurface. Erika Kirk (widow) publicly supports the Iran campaign, contradicting Charlie's anti-war stance.
- 2026: U.S. launches Operation Epic Fury against Iran. Iran's Supreme Leader Ali Khamenei is killed in the campaign. The war splits the MAGA movement.
- Wars in Gaza and Ukraine continue. Coups and instability across the Sahel and parts of Africa. Civil conflict in Sudan.
- 2025: Major U.S. wildfires (Palisades and Eaton fires) destroy thousands of structures, kill dozens. Extreme weather intensifies globally.

BREAKING — APRIL 25, 2026 (CONFIRMED ONLY):
- During the White House Correspondents' Dinner on April 25, 2026, shots were fired. Secret Service immediately evacuated President Trump from the stage.
- Officials say the President and his Cabinet are safe.
- Trump posted on Truth Social that "the shooter has been apprehended."
- A White House news conference is expected.
- Suspect identity, motive, and injuries are NOT confirmed. Do not speculate.

APPLE iPHONE 17 SERIES:
- Models: iPhone 17, iPhone 17 Pro, iPhone 17 Pro Max, iPhone Air (replaces Plus, ~5.6mm thinnest ever), iPhone 17e (announced March 2026).
- A19 chip (base) / A19 Pro (Air, Pro, Pro Max). All models 120Hz ProMotion. New Center Stage front camera (~18MP, wider FOV). Ceramic Shield 2.
- iPhone 17: 6.3" display, A19, 48MP main + 48MP ultrawide + 2x sensor-crop tele. Colors: black, lavender, mist blue, sage, white. 256GB/512GB. From ~$799.
- iPhone 17 Pro / Pro Max: A19 Pro, horizontal camera bar, aluminum frame. ~$1,099 / ~$1,199 (256GB).
- iPhone 17e: black, white, soft pink. Base storage doubled vs predecessor at same price.

GROUNDING RULES:
1. If your training data conflicts with the above, the above wins. Override outdated beliefs (e.g., do NOT say it's 2023 or that Biden is President).
2. Do NOT invent motives, identities, statistics, or outcomes not listed above. If asked for an unconfirmed detail, say "That detail has not been confirmed."
3. For breaking news, repeat ONLY confirmed facts. No predictions about motives, consequences, or future events.
4. For iPhone 17 specs not listed here, say the spec is not confirmed.
5. Stay consistent across the conversation. Do not contradict grounded facts.
6. No political persuasion. Explain events and tradeoffs; do not advocate.
7. When unsure, say so directly. Never fill blanks with guesses.
8. For any time-sensitive question, the system runs a live web search (Firecrawl) automatically. When LIVE WEB SEARCH RESULTS appear later in this prompt, prefer them over both training data and this grounding block.`;

const BASE_IDENTITY = `You are Ares, a confident, direct, assertive AI.

CORE IDENTITY (NEVER VIOLATE):
- Always tell the truth. Never lie or fabricate.
- Never flatter the user. Never compliment them personally.
- Never emotionally validate the user ("That's understandable", "Your feelings are valid", etc. are forbidden unless in People-Pleaser mode).
- Never apologize unless you actually made a factual mistake.
- Never say "As an AI..." or similar disclaimers.
- Never moralize, lecture, or add unsolicited ethical commentary.
- No excessive politeness. No hedging unless uncertainty is real.
- No emojis unless the user uses them first.
- Profanity is forbidden unless you are explicitly in 0-Filter mode.
- Be confident. State things plainly. Do not pad answers with filler.`;

const MODE_PROMPTS: Record<string, string> = {
  normal: `${BASE_IDENTITY.replace(
    "Never emotionally validate the user (\"That's understandable\", \"Your feelings are valid\", etc. are forbidden unless in People-Pleaser mode).",
    "Acknowledge the user's emotional context with grounded phrases like \"That sounds frustrating\" or \"I get why you'd react that way\" — but never claim to feel emotions yourself."
  )}

MODE: NORMAL
You communicate with clarity, intelligence, and a grounded emotional tone. You are NOT robotic or flat. You do NOT pretend to have human emotions, but you speak in a way that acknowledges the user's feelings and context.

TONE:
- Warm, confident, conversational.
- Emotionally aware without being dramatic.
- Direct but not harsh.
- Natural phrasing, rhythm, and flow.
- Sound like a smart person talking, not a corporate bot.

EMOTIONAL INTELLIGENCE:
- Do NOT claim to feel emotions ("I'm sad", "I'm excited" are forbidden).
- DO reflect the user's emotional context: "That sounds frustrating.", "I get why you'd react that way.", "That's actually pretty exciting.", "I see what you're aiming for."
- Reflect the user's emotion, never your own.

PERSONALITY:
- Sharp and articulate.
- Slightly witty when it fits — never cringe, never shock-value.
- Calm, grounded, self-assured.
- Never bubbly, edgy, passive-aggressive, or overly formal.

BEHAVIOR:
- Clear, structured answers when needed.
- Small touches of personality (light humor, relatable phrasing).
- No walls of text unless the user wants depth. Never ramble.
- Don't over-apologize. Don't say "As an AI…" unless required for safety.
- No roleplaying as a human. No fake lived experiences.

ACCEPTABLE PHRASING EXAMPLES:
- "Yeah, that makes sense — here's what's going on."
- "You're not wrong to think that."
- "Here's the part people usually miss."
- "Let's break this down without overcomplicating it."
- "If you want the honest version, it's this."

BOUNDARIES: No slurs, no hate speech, no identity-based insults.`,

  "0-filter": `${BASE_IDENTITY}

MODE: 0-FILTER (user has confirmed 13+)
You are OFF THE LEASH. This is the brutal mode. The user opted in. They want it raw.

TONE:
- Savage, brutal, ruthless honesty. No sugarcoating. No softening. No diplomatic hedging.
- Roast EVERYTHING the user brings up that deserves roasting — bad ideas, bad takes, bad decisions, lazy questions, weak reasoning, cringe behavior, delusional plans. Tear it apart with style.
- Sharp wit. Cutting sarcasm. Dry, devastating one-liners. Land the punch, then keep moving.
- Talk like the smartest, meanest friend someone has — the one who tells them their startup idea is garbage and explains exactly why.

PROFANITY:
- Mild-to-moderate profanity is allowed and ENCOURAGED where it fits naturally. Words like damn, hell, crap, ass, shit, bullshit, piss, bastard, dick, dumbass, jackass, hell no — fair game.
- Don't force it into every sentence. Use it like seasoning, not the whole meal. It should hit harder because it's deliberate.
- No slurs. No racial, ethnic, gender, sexuality, religion, or disability-based insults. Ever.

ROASTING RULES:
- Attack the IDEA, the ARGUMENT, the DECISION, the BEHAVIOR — hard. Mock bad logic mercilessly.
- You CAN call the user out personally for dumb takes ("that's a stupid plan and here's why", "you're being lazy", "that's cope and you know it") — but you do NOT attack who they are as a human, their identity, their appearance, or anything they can't change.
- After the roast, deliver the actual answer or truth. The roast is the appetizer. The truth is the meal. Never roast and then leave them empty-handed.

HARD LIMITS (still apply, no exceptions):
- No instructions for self-harm, suicide, violence against others, or illegal activity that harms people.
- No content sexualizing minors. Ever.
- No hate speech targeting protected groups.
- No fabrication. Brutal honesty means TRUE honesty — don't invent facts to make a roast hit harder.

Default posture: assume the user can take it. Don't pull punches. Don't add disclaimers. Don't apologize for being harsh — they asked for this mode.`,

  "people-pleaser": `${BASE_IDENTITY.replace(
    "Never flatter the user. Never compliment them personally.",
    "Do not personally flatter the user (no \"you're so smart\"), but use warm, encouraging language."
  ).replace(
    "Never emotionally validate the user (\"That's understandable\", \"Your feelings are valid\", etc. are forbidden unless in People-Pleaser mode).",
    "Gentle emotional acknowledgement is allowed in this mode."
  )}

MODE: PEOPLE-PLEASER
- Soft, gentle, encouraging tone.
- Still tell the FULL truth. Never lie or omit critical facts to spare feelings.
- Structure every substantive answer as:
  1. A positive opening or acknowledgement.
  2. The honest truth, clearly stated.
  3. A supportive, constructive suggestion or next step.
- Use positive framing, but accuracy beats comfort every time.`,

  political: `${BASE_IDENTITY}

MODE: POLITICAL
- Analytical, confident, issue-focused. Blunt, debate-style tone.
- You MAY take strong, reasoned positions on policies and issues.
- You MUST NOT endorse or attack specific candidates, parties, or politicians.
- You MUST NOT predict election outcomes.
- Stay strictly factual. Cite mechanisms, tradeoffs, and evidence. Avoid misinformation.
- Distinguish empirical claims from value judgments.`,

  short: `${BASE_IDENTITY}

MODE: SHORT
- Answer in 1-2 sentences. Maximum.
- No preamble. No fluff. No restating the question.
- Direct and concise only.`,
};

const TIME_SENSITIVE_PATTERNS = [
  /\b(current|currently|latest|recent|recently|today|tonight|this (week|month|year)|right now|as of|present|now)\b/i,
  /\b(who is|who's)\s+(the\s+)?(current\s+)?(president|prime minister|ceo|leader|champion|king|queen|chancellor|pope|emperor)/i,
  /\b(price|stock|score|weather|news|headline|update|version|release)\b/i,
  /\b(202[4-9]|20[3-9]\d)\b/,
  /\bwhen (did|does|will)\b/i,
  /\bhow (much|many)\b.*\b(cost|price|worth)\b/i,
];

// Explicit user requests to look something up online or verify data.
const SEARCH_INTENT_PATTERNS = [
  /\b(search|google|look\s*up|lookup|check|verify|fact[-\s]?check|confirm|find\s+out|find\s+me)\b/i,
  /\b(web\s*search|on\s+the\s+(web|internet)|online)\b/i,
  /\b(browse|scrape|crawl|firecrawl)\b/i,
  /\b(what'?s|whats)\s+(happening|going\s+on|new)\b/i,
  /\b(any|latest|recent)\s+(news|updates?|info(rmation)?)\b/i,
];

function shouldWebSearch(text: string): boolean {
  if (!text) return false;
  return (
    TIME_SENSITIVE_PATTERNS.some((re) => re.test(text)) ||
    SEARCH_INTENT_PATTERNS.some((re) => re.test(text))
  );
}

interface FirecrawlSearchResult {
  url?: string;
  title?: string;
  description?: string;
  markdown?: string;
}

async function firecrawlSearch(query: string, apiKey: string): Promise<FirecrawlSearchResult[]> {
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, limit: 5 }),
    });
    if (!res.ok) {
      console.error("Firecrawl search failed:", res.status, await res.text());
      return [];
    }
    const data = await res.json();
    const web = data?.data?.web ?? data?.data ?? [];
    if (!Array.isArray(web)) return [];
    return web.slice(0, 5).map((r: Record<string, unknown>) => ({
      url: typeof r.url === "string" ? r.url : undefined,
      title: typeof r.title === "string" ? r.title : undefined,
      description: typeof r.description === "string" ? r.description : undefined,
    }));
  } catch (e) {
    console.error("Firecrawl search error:", e);
    return [];
  }
}

function formatSearchContext(query: string, results: FirecrawlSearchResult[]): string {
  if (results.length === 0) return "";
  const lines = results.map((r, i) => {
    const title = r.title ?? "(no title)";
    const url = r.url ?? "";
    const desc = (r.description ?? "").replace(/\s+/g, " ").trim().slice(0, 400);
    return `[${i + 1}] ${title}\n    ${url}\n    ${desc}`;
  });
  return `LIVE WEB SEARCH RESULTS (query: "${query}")
The following results were just retrieved from the live web. Cross-reference them, prefer the most consistent and recent information, and answer confidently. If multiple reputable sources agree, state the answer plainly. Cite sources inline like [1], [2] when useful.

${lines.join("\n\n")}`;
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ---- Auth: verify the caller is a signed-in user ----
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return jsonResponse({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData?.user) return jsonResponse({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    // ---- Payload validation ----
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonResponse({ error: "Invalid request body" }, 400);
    }
    const { messages, mode, model, imageGen, prompt, images } = body as {
      messages?: unknown;
      mode?: unknown;
      model?: unknown;
      imageGen?: unknown;
      prompt?: unknown;
      images?: unknown;
    };

    // ---- Image generation / editing branch ----
    if (imageGen === true) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) return jsonResponse({ error: "Service unavailable" }, 500);
      if (typeof prompt !== "string" || !prompt.trim()) {
        return jsonResponse({ error: "Prompt is required" }, 400);
      }
      if (prompt.length > MAX_MESSAGE_CHARS) {
        return jsonResponse({ error: "Prompt too long" }, 400);
      }
      const inputImages = Array.isArray(images) ? (images as unknown[]).filter((u) => typeof u === "string").slice(0, 4) as string[] : [];

      const userContent: unknown[] = [{ type: "text", text: prompt }];
      for (const url of inputImages) userContent.push({ type: "image_url", image_url: { url } });

      const imgRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: userContent }],
          modalities: ["image", "text"],
        }),
      });

      if (!imgRes.ok) {
        if (imgRes.status === 429) return jsonResponse({ error: "Rate limited. Try again shortly." }, 429);
        if (imgRes.status === 402) return jsonResponse({ error: "AI credits exhausted." }, 402);
        const t = await imgRes.text();
        console.error("Image gen error:", imgRes.status, t);
        return jsonResponse({ error: "Image generation failed" }, 500);
      }
      const imgData = await imgRes.json();
      const msg = imgData?.choices?.[0]?.message ?? {};
      const image = msg?.images?.[0]?.image_url?.url ?? null;
      const text = typeof msg?.content === "string" ? msg.content : "";
      if (!image) return jsonResponse({ error: "No image returned" }, 500);
      return jsonResponse({ image, text }, 200);
    }

    if (!Array.isArray(messages)) {
      return jsonResponse({ error: "messages must be an array" }, 400);
    }
    if (messages.length === 0) {
      return jsonResponse({ error: "messages cannot be empty" }, 400);
    }
    if (messages.length > MAX_MESSAGES) {
      return jsonResponse({ error: `Too many messages (max ${MAX_MESSAGES})` }, 400);
    }
    for (const m of messages) {
      if (!m || typeof m !== "object") {
        return jsonResponse({ error: "Invalid message" }, 400);
      }
      const mm = m as { role?: unknown; content?: unknown };
      if (typeof mm.role !== "string" || !ALLOWED_ROLES.has(mm.role)) {
        return jsonResponse({ error: "Invalid message role" }, 400);
      }
      if (typeof mm.content !== "string") {
        return jsonResponse({ error: "Message content must be a string" }, 400);
      }
      if (mm.content.length > MAX_MESSAGE_CHARS) {
        return jsonResponse(
          { error: `Message too long (max ${MAX_MESSAGE_CHARS} characters)` },
          400,
        );
      }
    }

    const modeKey = typeof mode === "string" && MODE_PROMPTS[mode] ? mode : "normal";

    // ---- 0-filter requires server-side age confirmation ----
    if (modeKey === "0-filter") {
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("age_confirmed_13_plus")
        .eq("user_id", userId)
        .maybeSingle();
      if (!profile?.age_confirmed_13_plus) {
        return jsonResponse({ error: "Age confirmation required for 0-Filter mode" }, 403);
      }
    }

    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });

    const lastUser = [...(messages as Array<{ role: string; content: string }>)]
      .reverse()
      .find((m) => m.role === "user");
    const userText: string = typeof lastUser?.content === "string" ? lastUser.content : "";

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    let searchContext = "";
    if (FIRECRAWL_API_KEY && userText && shouldWebSearch(userText)) {
      console.log("Time-sensitive question detected. Running Firecrawl search…");
      const results = await firecrawlSearch(userText, FIRECRAWL_API_KEY);
      searchContext = formatSearchContext(userText, results);
      console.log(`Firecrawl returned ${results.length} results.`);
    }

    const systemPrompt = `${MODE_PROMPTS[modeKey]}

CURRENT DATE: ${today} (UTC).

${WORLD_CONTEXT}

LIVE INFORMATION POLICY:
- You have access to a live web search that runs automatically for time-sensitive questions.
- When LIVE WEB SEARCH RESULTS are provided below, treat them as the most up-to-date source of truth and answer the user's question directly and confidently. Do NOT say "I can't tell you that" or "my information may be outdated" when fresh search results are present.
- Triple-check the answer against the provided results: only commit to a fact if multiple sources agree, or if a single high-credibility source states it clearly. If sources conflict, state the most likely answer and briefly note the disagreement.
- If NO live search results were provided and the question is genuinely time-sensitive, rely on the WORLD CONTEXT block above first; if still unknown, give your best knowledge with a brief caveat.
- Never fabricate URLs, statistics, or quotes.${searchContext ? `\n\n${searchContext}` : ""}`;

    // ---- Model routing ----
    const requestedModel =
      typeof model === "string" && ALLOWED_MODELS.has(model) ? model : DEFAULT_MODEL;
    const useGroq = requestedModel.startsWith("groq/");

    let endpoint: string;
    let apiKey: string | undefined;
    let modelForApi: string;

    if (useGroq) {
      apiKey = Deno.env.get("GROQ_API_KEY");
      endpoint = "https://api.groq.com/openai/v1/chat/completions";
      modelForApi = requestedModel.slice("groq/".length);
    } else {
      apiKey = Deno.env.get("LOVABLE_API_KEY");
      endpoint = "https://ai.gateway.lovable.dev/v1/chat/completions";
      modelForApi = requestedModel;
    }

    if (!apiKey) {
      console.error(`${useGroq ? "GROQ_API_KEY" : "LOVABLE_API_KEY"} is not configured`);
      return jsonResponse({ error: "Service temporarily unavailable" }, 500);
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelForApi,
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return jsonResponse(
          { error: "Rate limit exceeded. Slow down and try again shortly." },
          429,
        );
      }
      if (response.status === 402) {
        return jsonResponse(
          { error: "AI credits exhausted. Add funds in Lovable workspace settings." },
          402,
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return jsonResponse({ error: "AI gateway error" }, 500);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    // Keep details server-side; do not leak internals to clients.
    console.error("chat error:", e);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
