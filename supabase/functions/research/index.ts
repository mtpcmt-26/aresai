// Ares Search — Perplexity-style answers with live Firecrawl sources,
// Deep Research (multi-query), focus filters, and Yahoo Finance data.
// Streams custom SSE events: status | sources | finance | delta | done | error
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_MODEL = "google/gemini-3-flash-preview";
const PLANNER_MODEL = "google/gemini-3-flash-preview";

const FOCUS_SUFFIX: Record<string, string> = {
  all: "",
  academic: " (site:arxiv.org OR site:scholar.google.com OR site:pubmed.ncbi.nlm.nih.gov OR site:nature.com OR site:sciencedirect.com)",
  news: "",
  youtube: " site:youtube.com",
  reddit: " site:reddit.com",
  finance: "",
};

interface Source { url: string; title: string; description: string; content: string }

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function firecrawlSearch(query: string, key: string, focus: string, limit: number, scrape: boolean): Promise<Source[]> {
  try {
    const body: Record<string, unknown> = { query: query + (FOCUS_SUFFIX[focus] ?? ""), limit };
    if (focus === "news") { body.sources = ["news", "web"]; body.tbs = "qdr:w"; }
    if (scrape) body.scrapeOptions = { formats: ["markdown"], onlyMainContent: true };
    const res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) { console.error("firecrawl", res.status, await res.text()); return []; }
    const d = await res.json();
    const list = [...(d?.data?.web ?? []), ...(d?.data?.news ?? []), ...(Array.isArray(d?.data) ? d.data : [])];
    return list
      .filter((r: any) => typeof r?.url === "string")
      .map((r: any) => ({
        url: r.url,
        title: r.title ?? r.url,
        description: (r.description ?? r.snippet ?? "").slice(0, 400),
        content: (r.markdown ?? "").replace(/\s+/g, " ").slice(0, scrape ? 2500 : 0),
      }));
  } catch (e) { console.error("firecrawl err", e); return []; }
}

const YH = { "User-Agent": "Mozilla/5.0 (Ares)" };

async function yahooFinance(query: string) {
  try {
    const explicit = query.match(/\$([A-Za-z.\-^]{1,10})/)?.[1];
    let symbol = explicit?.toUpperCase();
    if (!symbol) {
      const s = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=1&newsCount=0`, { headers: YH });
      if (s.ok) symbol = (await s.json())?.quotes?.[0]?.symbol;
    }
    if (!symbol) return null;
    const c = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1mo&interval=1d`, { headers: YH });
    if (!c.ok) return null;
    const r = (await c.json())?.chart?.result?.[0];
    if (!r) return null;
    const m = r.meta;
    const closes: number[] = (r.indicators?.quote?.[0]?.close ?? []).filter((x: number | null) => x != null);
    const prev = m.chartPreviousClose ?? closes[closes.length - 2];
    const price = m.regularMarketPrice;
    return {
      symbol: m.symbol, name: m.longName ?? m.shortName ?? m.symbol, currency: m.currency,
      exchange: m.fullExchangeName ?? m.exchangeName, price,
      dayHigh: m.regularMarketDayHigh, dayLow: m.regularMarketDayLow,
      fiftyTwoWeekHigh: m.fiftyTwoWeekHigh, fiftyTwoWeekLow: m.fiftyTwoWeekLow,
      volume: m.regularMarketVolume, monthChangePct: prev ? ((price - closes[0]) / closes[0]) * 100 : null,
      history: closes.slice(-30),
    };
  } catch (e) { console.error("yahoo", e); return null; }
}

async function planQueries(query: string, key: string): Promise<string[]> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: PLANNER_MODEL,
        messages: [
          { role: "system", content: `Today is ${new Date().toDateString()}. Break the user's research question into 5 distinct, specific web search queries covering different angles (facts, latest developments, data, expert opinion, counterpoints). Reply ONLY with a JSON array of strings.` },
          { role: "user", content: query },
        ],
      }),
    });
    if (!res.ok) return [query];
    const t: string = (await res.json())?.choices?.[0]?.message?.content ?? "";
    const arr = JSON.parse(t.slice(t.indexOf("["), t.lastIndexOf("]") + 1));
    return Array.isArray(arr) && arr.length ? arr.slice(0, 6).map(String) : [query];
  } catch { return [query]; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: u } = await sb.auth.getUser(token);
  if (!u?.user) return json({ error: "Please sign in to search." }, 401);

  const body = await req.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim().slice(0, 2000) : "";
  if (!query) return json({ error: "Empty query" }, 400);
  const focus = typeof body?.focus === "string" && body.focus in FOCUS_SUFFIX ? body.focus : "all";
  const deep = body?.depth === "deep";
  const model = typeof body?.model === "string" && /^(google|openai|groq)\//.test(body.model) ? body.model : DEFAULT_MODEL;
  const history: Array<{ role: string; content: string }> = Array.isArray(body?.history)
    ? body.history.filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string").slice(-6).map((m: any) => ({ role: m.role, content: m.content.slice(0, 4000) }))
    : [];

  const FC = Deno.env.get("FIRECRAWL_API_KEY");
  const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
  if (!FC || !LOVABLE) return json({ error: "Search is not configured" }, 500);

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (o: unknown) => ctrl.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`));
      try {
        let finance = null;
        if (focus === "finance") {
          send({ type: "status", text: "Pulling market data from Yahoo Finance…" });
          finance = await yahooFinance(query);
          if (finance) send({ type: "finance", data: finance });
        }

        const queries = deep ? await planQueries(query, LOVABLE) : [query];
        if (deep) send({ type: "plan", queries });

        const all: Source[] = [];
        for (const q of queries) {
          send({ type: "status", text: `Searching the web: ${q}` });
          const r = await firecrawlSearch(q, FC, focus, deep ? 4 : 6, true);
          for (const s of r) if (!all.some((a) => a.url === s.url)) all.push(s);
        }
        // Verification pass: one more independent search to cross-check.
        if (!deep) {
          send({ type: "status", text: "Verifying with a second search…" });
          const v = await firecrawlSearch(`${query} latest verified facts`, FC, focus, 3, false);
          for (const s of v) if (!all.some((a) => a.url === s.url)) all.push(s);
        }
        const sources = all.slice(0, deep ? 20 : 9);
        send({ type: "sources", sources: sources.map(({ url, title, description }) => ({ url, title, description })) });
        send({ type: "status", text: deep ? "Writing research report…" : "Writing answer…" });

        const ctx = sources.map((s, i) => `[${i + 1}] ${s.title}\nURL: ${s.url}\n${s.description}\n${s.content}`).join("\n\n");
        const system = `You are Ares, a confident, direct, truthful answer engine. Today is ${new Date().toUTCString()}.
Answer ONLY from the SOURCES below, which were just fetched live from the web. Cite every factual claim inline with bracketed numbers like [1] or [2][4] matching the sources. Cross-check facts: prefer claims multiple sources agree on; flag conflicts explicitly. If the sources don't cover something, say so — never invent facts, numbers, or URLs. Do not list sources at the end (the UI shows them). Use markdown headings, bullets and tables where useful.
${deep ? "DEEP RESEARCH MODE: write a thorough, well-structured report (Summary, key findings sections, data/table if relevant, open questions). Aim for 800-1500 words." : "Be concise: a direct answer first, then supporting detail. Usually under 250 words."}
${finance ? `\nLIVE YAHOO FINANCE DATA:\n${JSON.stringify(finance)}` : ""}

SOURCES:
${ctx || "(no sources found — say that live search returned nothing)"}`;

        const groq = model.startsWith("groq/");
        const res = await fetch(groq ? "https://api.groq.com/openai/v1/chat/completions" : "https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${groq ? Deno.env.get("GROQ_API_KEY") : LOVABLE}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: groq ? model.slice(5) : model, stream: true, messages: [{ role: "system", content: system }, ...history, { role: "user", content: query }] }),
        });
        if (!res.ok || !res.body) {
          const t = await res.text();
          console.error("model", res.status, t);
          send({ type: "error", text: res.status === 429 ? "Rate limited — try again shortly." : res.status === 402 ? "AI credits exhausted." : "The model failed to answer." });
          ctrl.close(); return;
        }
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
            if (!line.startsWith("data:")) continue;
            const p = line.slice(5).trim();
            if (p === "[DONE]") continue;
            try { const c = JSON.parse(p)?.choices?.[0]?.delta?.content; if (c) send({ type: "delta", text: c }); } catch { /* partial */ }
          }
        }
        send({ type: "done" });
      } catch (e) {
        console.error("research", e);
        send({ type: "error", text: "Search failed." });
      }
      ctrl.close();
    },
  });
  return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
});
