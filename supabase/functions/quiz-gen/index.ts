// Generates a multiple-choice quiz via Lovable AI (tool calling).
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

    const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE) return json({ error: "Service unavailable" }, 500);

    const body = await req.json().catch(() => null);
    const topic = (body?.topic ?? "").toString().trim().slice(0, 1000);
    const count = Math.max(5, Math.min(15, Number(body?.count) || 10));
    const difficulty = ["easy", "medium", "hard"].includes(body?.difficulty)
      ? body.difficulty
      : "medium";
    const context = (body?.context ?? "").toString().slice(0, 4000);
    if (!topic) return json({ error: "topic required" }, 400);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are Ares, a sharp tutor. Build accurate, well-calibrated multiple-choice quizzes. Each question has exactly 4 options labeled A,B,C,D, exactly one correct answer, and a one-sentence explanation. No trick questions. No duplicate options.",
          },
          {
            role: "user",
            content: `Build a ${difficulty} quiz on: ${topic}. ${count} questions.${context ? `\n\nReference material:\n${context}` : ""}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "emit_quiz",
              description: "Return the generated quiz.",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        choices: {
                          type: "array",
                          items: { type: "string" },
                          minItems: 4,
                          maxItems: 4,
                        },
                        correctIndex: { type: "integer", minimum: 0, maximum: 3 },
                        explanation: { type: "string" },
                        topic: { type: "string" },
                      },
                      required: ["question", "choices", "correctIndex", "explanation", "topic"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["title", "questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "emit_quiz" } },
      }),
    });

    if (!res.ok) {
      if (res.status === 429) return json({ error: "Rate limited." }, 429);
      if (res.status === 402) return json({ error: "AI credits exhausted." }, 402);
      const t = await res.text();
      console.error("quiz gw err:", res.status, t);
      return json({ error: "AI gateway error" }, 500);
    }
    const data = await res.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (typeof args !== "string") return json({ error: "Bad model output" }, 500);
    const quiz = JSON.parse(args);
    return json({ quiz }, 200);
  } catch (e) {
    console.error("quiz-gen error:", e);
    return json({ error: "Internal error" }, 500);
  }
});
