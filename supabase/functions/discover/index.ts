import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { verifiedSearch } from "../_shared/webSearch.ts";
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
  let newsError: string | null = null;
  const [news, markets] = await Promise.all([
    (async () => {
      if (!FC) return [];
      const sources = await verifiedSearch(TOPICS[topic], FC, 'news', 12, false);
      return sources.map(x => ({url:x.url,title:x.title,snippet:x.description,date:x.date??null,image:x.image??null}));
    })().catch(e => { newsError=e instanceof Error?e.message:"News unavailable";return []; }),
    Promise.all(TICKERS.map(quote)).then((a) => a.filter(Boolean)),
  ]);
  return new Response(JSON.stringify({ topic, news, markets, newsError }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
