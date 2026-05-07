import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, RefreshCw, Code2, Eye, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const LABS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/labs`;

const STARTER_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<script src="https://cdn.tailwindcss.com"></script>
<title>Ares Labs</title>
</head>
<body class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-100 flex items-center justify-center font-sans">
  <div class="text-center px-6">
    <div class="text-xs uppercase tracking-[0.3em] text-cyan-400 mb-4">Ares Labs</div>
    <h1 class="text-4xl sm:text-5xl font-bold mb-3">Build anything. Just ask.</h1>
    <p class="text-slate-400 max-w-md mx-auto">Type what you want on the left. The app appears here, instantly.</p>
  </div>
</body>
</html>`;

type Turn = { role: "user" | "assistant"; content: string };

const STORAGE_HTML = "ares.labs.html.v1";
const STORAGE_TURNS = "ares.labs.turns.v1";

export const AresLabs = () => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"preview" | "code">("preview");
  const [html, setHtml] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_HTML) || STARTER_HTML;
    } catch {
      return STARTER_HTML;
    }
  });
  const [turns, setTurns] = useState<Turn[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_TURNS);
      return raw ? (JSON.parse(raw) as Turn[]) : [];
    } catch {
      return [];
    }
  });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_HTML, html);
    } catch {
      /* ignore */
    }
  }, [html]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TURNS, JSON.stringify(turns.slice(-30)));
    } catch {
      /* ignore */
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const nextTurns: Turn[] = [...turns, { role: "user", content: text }];
    setTurns(nextTurns);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in.");
        setLoading(false);
        return;
      }
      const resp = await fetch(LABS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          prompt: text,
          currentHtml: html === STARTER_HTML ? "" : html,
          history: turns,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 429) toast.error("Rate limited. Slow down.");
        else if (resp.status === 402) toast.error("AI credits exhausted.");
        else toast.error(err.error || "Labs failed.");
        setLoading(false);
        return;
      }
      const data = await resp.json();
      if (data.html) setHtml(data.html);
      setTurns([...nextTurns, { role: "assistant", content: data.summary || "Updated." }]);
    } catch (e) {
      console.error(e);
      toast.error("Connection error.");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const reload = () => {
    if (iframeRef.current) {
      // re-set srcdoc to force reload
      const cur = html;
      iframeRef.current.srcdoc = "";
      requestAnimationFrame(() => {
        if (iframeRef.current) iframeRef.current.srcdoc = cur;
      });
    }
  };

  const download = () => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ares-labs-app.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setHtml(STARTER_HTML);
    setTurns([]);
    toast("Labs reset.");
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[minmax(320px,420px)_1fr]">
      {/* Left: chat */}
      <div className="flex min-h-0 flex-col border-r border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <div className="font-display text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-500">
              Ares Labs · GPT-5.5 Pro
            </div>
            <div className="text-xs text-muted-foreground">AI coding studio</div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={reset} title="Reset">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto px-4 py-4">
          {turns.length === 0 && (
            <div className="space-y-3 py-6">
              <h3 className="font-display text-xl font-bold leading-tight">
                Build apps at superhuman speed.
              </h3>
              <p className="text-sm text-muted-foreground">
                Describe what you want. I'll generate the full app and render it live on the right.
              </p>
              <div className="space-y-1.5 pt-2">
                {[
                  "Build a kanban board with drag-and-drop",
                  "Make a pomodoro timer with sound",
                  "Create a markdown editor with live preview",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="block w-full rounded-sm border border-border bg-card px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-3">
            {turns.map((t, i) => (
              <div key={i} className={cn("flex gap-2", t.role === "user" && "justify-end")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-sm border px-3 py-2 text-sm",
                    t.role === "user"
                      ? "border-foreground/20 bg-foreground text-background"
                      : "border-border bg-card",
                  )}
                >
                  {t.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Building…
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border p-3">
          <div className="rounded-sm border border-border bg-card focus-within:border-foreground/40">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Describe what to build or change…"
              rows={1}
              className="min-h-[48px] max-h-40 resize-none border-0 bg-transparent text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <div className="flex items-center justify-between border-t border-border/60 p-2">
              <span className="px-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                Enter to send
              </span>
              <Button
                onClick={send}
                disabled={!input.trim() || loading}
                size="icon"
                className="h-8 w-8 bg-foreground text-background hover:bg-foreground/90"
                aria-label="Send"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Right: preview */}
      <div className="flex min-h-0 flex-col bg-muted/30">
        <div className="flex items-center justify-between border-b border-border bg-background px-4 py-2">
          <div className="flex items-center gap-1 rounded-sm border border-border p-0.5">
            <button
              onClick={() => setView("preview")}
              className={cn(
                "flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs",
                view === "preview" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Eye className="h-3 w-3" /> Preview
            </button>
            <button
              onClick={() => setView("code")}
              className={cn(
                "flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs",
                view === "code" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Code2 className="h-3 w-3" /> Code
            </button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={reload} title="Reload">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={download} title="Download HTML">
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="relative min-h-0 flex-1">
          {view === "preview" ? (
            <iframe
              ref={iframeRef}
              title="Ares Labs Preview"
              srcDoc={html}
              sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
              className="absolute inset-0 h-full w-full border-0 bg-white"
            />
          ) : (
            <pre className="scrollbar-thin absolute inset-0 overflow-auto bg-card p-4 text-xs leading-relaxed">
              <code>{html}</code>
            </pre>
          )}
          {loading && (
            <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2 rounded-sm border border-border bg-background/90 px-3 py-1.5 text-xs shadow">
              <Loader2 className="h-3 w-3 animate-spin" /> Generating with GPT-5.5 Pro
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
