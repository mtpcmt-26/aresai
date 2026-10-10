import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowUp, Check, Compass, Layers, Loader2, Microscope, Share2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector } from "@/components/ModelSelector";
import { loadModelId, saveModelId } from "@/lib/models";
import { Depth, FOCUSES, FinanceData, Focus, SearchSource, runResearch } from "@/lib/research";
import { AnswerMarkdown, FinanceCard, SourceCards } from "@/components/search/AnswerView";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Turn {
  query: string; depth: Depth; focus: Focus; status: string; plan: string[];
  sources: SearchSource[]; finance: FinanceData | null; answer: string; done: boolean; error?: string;
}

const Search = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [input, setInput] = useState("");
  const [focus, setFocus] = useState<Focus>("all");
  const [depth, setDepth] = useState<Depth>("quick");
  const [model, setModel] = useState(loadModelId());
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [sharedIdx, setSharedIdx] = useState<number | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => { if (!loading && !user) nav("/auth"); }, [loading, user, nav]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [turns.length]);

  const ask = async (q: string, f = focus, d = depth) => {
    q = q.trim(); if (!q || busy) return;
    setInput(""); setBusy(true);
    const history = turns.flatMap((t) => [{ role: "user", content: t.query }, { role: "assistant", content: t.answer }]);
    const idx = turns.length;
    setTurns((p) => [...p, { query: q, depth: d, focus: f, status: "Starting…", plan: [], sources: [], finance: null, answer: "", done: false }]);
    const patch = (fn: (t: Turn) => Turn) => setTurns((p) => p.map((t, i) => (i === idx ? fn(t) : t)));
    await runResearch({ query: q, focus: f, depth: d, model, history }, (e) => {
      if (e.type === "status") patch((t) => ({ ...t, status: e.text }));
      else if (e.type === "plan") patch((t) => ({ ...t, plan: e.queries }));
      else if (e.type === "sources") patch((t) => ({ ...t, sources: e.sources }));
      else if (e.type === "finance") patch((t) => ({ ...t, finance: e.data }));
      else if (e.type === "delta") patch((t) => ({ ...t, answer: t.answer + e.text }));
      else if (e.type === "error") patch((t) => ({ ...t, error: e.text, done: true }));
      else if (e.type === "done") patch((t) => ({ ...t, done: true }));
    }).catch(() => patch((t) => ({ ...t, error: "Search failed.", done: true })));
    patch((t) => ({ ...t, done: true }));
    setBusy(false);
  };

  useEffect(() => {
    const q = params.get("q");
    if (q && user && !started.current) {
      started.current = true;
      const f = (params.get("focus") as Focus) || "all";
      setFocus(f); ask(q, f);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const share = async (t: Turn, i: number) => {
    if (!user) return;
    const { data, error } = await supabase.from("shared_answers")
      .insert({ user_id: user.id, query: t.query, answer: t.answer, sources: t.sources as never }).select("id").single();
    if (error || !data) { toast.error("Couldn't create link"); return; }
    await navigator.clipboard.writeText(`${window.location.origin}/share/${data.id}`).catch(() => {});
    setSharedIdx(i); toast.success("Share link copied");
  };

  const composer = (
    <div className="rounded-sm border border-border bg-card p-2">
      <Textarea value={input} onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }}
        placeholder={turns.length ? "Ask a follow-up…" : "Ask anything. Ares searches the live web and cites every claim."}
        className="min-h-[56px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0" />
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <div className="flex rounded-sm border border-border p-0.5">
          <button onClick={() => setDepth("quick")} className={cn("flex items-center gap-1 rounded-sm px-2 py-1 text-[11px] font-bold uppercase tracking-wider", depth === "quick" ? "bg-secondary text-foreground" : "text-muted-foreground")}><Zap className="h-3 w-3" />Quick</button>
          <button onClick={() => setDepth("deep")} className={cn("flex items-center gap-1 rounded-sm px-2 py-1 text-[11px] font-bold uppercase tracking-wider", depth === "deep" ? "bg-secondary text-foreground" : "text-muted-foreground")}><Microscope className="h-3 w-3" />Deep Research</button>
        </div>
        <ModelSelector value={model} onChange={(id) => { setModel(id); saveModelId(id); }} />
        <Button size="icon" className="ml-auto h-8 w-8 rounded-sm" disabled={!input.trim() || busy} onClick={() => ask(input)}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </Button>
      </div>
      <div className="flex flex-wrap gap-1 border-t border-border pt-2 mt-2">
        {FOCUSES.map((f) => (
          <button key={f.id} onClick={() => setFocus(f.id)}
            className={cn("rounded-sm border px-2 py-0.5 text-[11px]", focus === f.id ? "border-foreground/60 bg-secondary text-foreground" : "border-border text-muted-foreground hover:text-foreground")}>
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-2.5 backdrop-blur">
        <Link to="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />Chat</Link>
        <span className="font-display text-sm font-bold uppercase tracking-[0.2em]">Ares Search</span>
        <Link to="/discover" className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"><Compass className="h-3.5 w-3.5" />Discover</Link>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-48 pt-8">
        {turns.length === 0 && (
          <div className="pt-[12vh]">
            <h1 className="mb-6 text-center font-display text-3xl font-bold tracking-tight">Where knowledge gets verified.</h1>
            {composer}
          </div>
        )}

        {turns.map((t, i) => (
          <section key={i} className="mb-10 border-b border-border pb-8">
            <h2 className="mb-4 font-display text-2xl font-bold">{t.query}</h2>
            {!t.done && (
              <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />{t.status}
              </div>
            )}
            {t.plan.length > 0 && (
              <div className="mb-4 rounded-sm border border-border p-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"><Microscope className="h-3 w-3" />Research plan</div>
                <ul className="space-y-0.5 text-xs text-muted-foreground">{t.plan.map((p) => <li key={p}>→ {p}</li>)}</ul>
              </div>
            )}
            {t.finance && <div className="mb-4"><FinanceCard d={t.finance} /></div>}
            {t.sources.length > 0 && (
              <div className="mb-5">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"><Layers className="h-3 w-3" />Sources · {t.sources.length}</div>
                <SourceCards sources={t.sources} />
              </div>
            )}
            {t.error ? <p className="text-sm text-destructive">{t.error}</p> : (t.answer || t.sources.length > 0) && <AnswerMarkdown text={t.answer} sources={t.sources} />}
            {t.done && t.answer && (
              <Button variant="ghost" size="sm" className="mt-3 h-7 gap-1.5 rounded-sm text-xs text-muted-foreground" onClick={() => share(t, i)}>
                {sharedIdx === i ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}Share
              </Button>
            )}
          </section>
        ))}
        <div ref={bottom} />
      </main>

      {turns.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-background via-background to-transparent px-4 pb-4 pt-8">
          <div className="mx-auto max-w-3xl">{composer}</div>
        </div>
      )}
    </div>
  );
};

export default Search;
