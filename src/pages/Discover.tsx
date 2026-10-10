import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Search as SearchIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { hostOf } from "@/lib/research";
import { cn } from "@/lib/utils";

const TOPICS = [
  { id: "top", label: "Top" }, { id: "world", label: "World" }, { id: "tech", label: "Tech & AI" },
  { id: "finance", label: "Finance" }, { id: "science", label: "Science" }, { id: "sports", label: "Sports" },
];
interface News { url: string; title: string; snippet: string; date: string | null; image: string | null }
interface Market { symbol: string; name: string; price: number; changePct: number }

const Discover = () => {
  const [topic, setTopic] = useState("top");
  const [news, setNews] = useState<News[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase.functions.invoke("discover", { body: { topic } }).then(({ data }) => {
      setNews(data?.news ?? []);
      if (data?.markets?.length) setMarkets(data.markets);
      setLoading(false);
    });
  }, [topic]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-2.5 backdrop-blur">
        <Link to="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />Chat</Link>
        <span className="font-display text-sm font-bold uppercase tracking-[0.2em]">Discover</span>
        <Link to="/search" className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"><SearchIcon className="h-3.5 w-3.5" />Search</Link>
      </header>

      <div className="border-b border-border">
        <div className="mx-auto flex max-w-5xl gap-6 overflow-x-auto px-4 py-2.5">
          {markets.map((m) => (
            <Link key={m.symbol} to={`/search?focus=finance&q=${encodeURIComponent(`$${m.symbol} ${m.name} stock today`)}`} className="shrink-0 text-xs">
              <span className="font-bold">{m.name}</span>{" "}
              <span className="text-muted-foreground">{m.price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>{" "}
              <span className={m.changePct >= 0 ? "text-primary" : "text-destructive"}>{m.changePct >= 0 ? "+" : ""}{m.changePct.toFixed(2)}%</span>
            </Link>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex flex-wrap gap-1.5">
          {TOPICS.map((t) => (
            <button key={t.id} onClick={() => setTopic(t.id)}
              className={cn("rounded-sm border px-3 py-1 text-xs", topic === t.id ? "border-foreground/60 bg-secondary" : "border-border text-muted-foreground hover:text-foreground")}>
              {t.label}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : news.length === 0 ? (
          <p className="py-20 text-center text-sm text-muted-foreground">No stories right now. Try another topic.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {news.map((n) => (
              <div key={n.url} className="flex flex-col overflow-hidden rounded-sm border border-border bg-card">
                {n.image && <img src={n.image} alt="" className="h-36 w-full object-cover" loading="lazy" />}
                <div className="flex flex-1 flex-col p-3">
                  <a href={n.url} target="_blank" rel="noreferrer" className="font-display text-sm font-bold leading-snug hover:underline">{n.title}</a>
                  <p className="mt-1.5 line-clamp-3 text-xs text-muted-foreground">{n.snippet}</p>
                  <div className="mt-auto flex items-center justify-between pt-3 text-[10px] text-muted-foreground">
                    <span>{hostOf(n.url)}{n.date ? ` · ${n.date}` : ""}</span>
                    <Link to={`/search?q=${encodeURIComponent(n.title)}`} className="font-bold uppercase tracking-wider text-foreground hover:underline">Ask Ares →</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Discover;
