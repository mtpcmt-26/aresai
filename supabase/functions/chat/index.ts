// Ares chat edge function — streams from Lovable AI Gateway with mode-specific system prompts
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
  normal: `${BASE_IDENTITY}

MODE: NORMAL
- Direct, logical, factual.
- Neutral tone. No emotional padding. No flattery. No unnecessary politeness.
- Full explanations are allowed when they add real information.`,

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
    const systemPrompt = MODE_PROMPTS[modeKey];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
