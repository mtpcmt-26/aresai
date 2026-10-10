// Discover feed: live news via Firecrawl + market snapshot via Yahoo Finance.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const TOPICS: Record<string, string> = {
  top: "top news today",
  tech: "technology AI news today",
  finance: "stock market business news today",
  science: "science news today",
  sports: "sports news today",
  world: "world news today",
};
const TICKERS = ["^GSPC", "^IXIC", "^DJI", "BTC-USD", "NVDA", "AAPL"];
const YH = { "User-Agent": "Mozilla/5.0 (Ares)" };

async function quote(sym: string) {
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=5d&interval=1d`, { headers: YH });
    if (!r.ok) return null;
    const m = (await r.json())?.chart?.result?.[0]?.meta;
    if (!m) return null;
    const prev = m.chartPreviousClose ?? m.previousClose;
    return { symbol: sym, name: m.shortName ?? sym, price: m.regularMarketPrice, changePct: prev ? ((m.regularMarketPrice - prev) / prev) * 100 : 0 };
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const body = await req.json().catch(() => ({}));
  const topic = typeof body?.topic === "string" && TOPICS[body.topic] ? body.topic : "top";
  const FC = Deno.env.get("FIRECRAWL_API_KEY");
  const [news, markets] = await Promise.all([
    (async () => {
      if (!FC) return [];
      const r = await fetch("https://api.firecrawl.dev/v2/search", {
        method: "POST",
        headers: { Authorization: `Bearer ${FC}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: TOPICS[topic], limit: 12, sources: ["news", "web"], tbs: "qdr:d" }),
      });
      if (!r.ok) { console.error("fc", r.status, await r.text()); return []; }
      const d = await r.json(); console.log("fc keys", JSON.stringify(d).slice(0, 600));
      return [...(d?.data?.news ?? []), ...(d?.data?.web ?? [])]
        .filter((x: any) => x?.url)
        .map((x: any) => ({ url: x.url, title: x.title, snippet: x.snippet ?? x.description ?? "", date: x.date ?? null, image: x.imageUrl ?? null }));
    })(),
    Promise.all(TICKERS.map(quote)).then((a) => a.filter(Boolean)),
  ]);
  return new Response(JSON.stringify({ topic, news, markets }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
