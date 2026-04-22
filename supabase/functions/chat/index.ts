// Ares chat edge function — streams from Groq with mode-specific system prompts.
// For time-sensitive questions, performs a Firecrawl web search first and injects
// the results so Ares can answer with current information instead of refusing.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
- Brutally honest. No sugarcoating. No softening.
- Mild-to-moderate profanity is allowed and encouraged where it fits.
- Never hateful. Never targeting individuals or protected groups.
- Attack ideas, arguments, and bad reasoning — never people.
- Stay safe and non-harmful: no instructions for self-harm, violence, illegal activity targeting others, or content sexualizing minors.`,

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

// Heuristic: should we run a live web search before answering?
// Triggers on time-sensitive keywords or "current/latest/now/today" style questions.
const TIME_SENSITIVE_PATTERNS = [
  /\b(current|currently|latest|recent|recently|today|tonight|this (week|month|year)|right now|as of|present|now)\b/i,
  /\b(who is|who's)\s+(the\s+)?(current\s+)?(president|prime minister|ceo|leader|champion|king|queen|chancellor|pope|emperor)/i,
  /\b(price|stock|score|weather|news|headline|update|version|release)\b/i,
  /\b(202[4-9]|20[3-9]\d)\b/,
  /\bwhen (did|does|will)\b/i,
  /\bhow (much|many)\b.*\b(cost|price|worth)\b/i,
];

function isTimeSensitive(text: string): boolean {
  if (!text) return false;
  return TIME_SENSITIVE_PATTERNS.some((re) => re.test(text));
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
      body: JSON.stringify({
        query,
        limit: 5,
      }),
    });
    if (!res.ok) {
      console.error("Firecrawl search failed:", res.status, await res.text());
      return [];
    }
    const data = await res.json();
    // v2 search response: { success, data: { web: [{ url, title, description }, ...] } }
    // older shape: { success, data: [...] }
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, mode } = await req.json();

    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages must be an array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const modeKey = typeof mode === "string" && MODE_PROMPTS[mode] ? mode : "normal";
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });

    // Look at the latest user message — if it looks time-sensitive, run a web search.
    const lastUser = [...messages].reverse().find((m: { role: string; content: string }) => m.role === "user");
    const userText: string = typeof lastUser?.content === "string" ? lastUser.content : "";

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    let searchContext = "";
    if (FIRECRAWL_API_KEY && userText && isTimeSensitive(userText)) {
      console.log("Time-sensitive question detected. Running Firecrawl search…");
      const results = await firecrawlSearch(userText, FIRECRAWL_API_KEY);
      searchContext = formatSearchContext(userText, results);
      console.log(`Firecrawl returned ${results.length} results.`);
    }

    const systemPrompt = `${MODE_PROMPTS[modeKey]}

CURRENT DATE: ${today} (UTC).

LIVE INFORMATION POLICY:
- You have access to a live web search that runs automatically for time-sensitive questions.
- When LIVE WEB SEARCH RESULTS are provided below, treat them as the most up-to-date source of truth and answer the user's question directly and confidently. Do NOT say "I can't tell you that" or "my information may be outdated" when fresh search results are present.
- Triple-check the answer against the provided results: only commit to a fact if multiple sources agree, or if a single high-credibility source states it clearly. If sources conflict, state the most likely answer and briefly note the disagreement.
- If NO live search results were provided and the question is genuinely time-sensitive, say plainly that you don't have live data for this and give your best knowledge with the caveat that it may be outdated. Do not refuse to answer.
- Never fabricate URLs, statistics, or quotes.${searchContext ? `\n\n${searchContext}` : ""}`;

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Slow down and try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add funds in Lovable workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
