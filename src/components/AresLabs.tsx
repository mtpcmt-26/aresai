import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Loader2,
  RefreshCw,
  Code2,
  Eye,
  Download,
  Trash2,
  Monitor,
  Tablet,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  LabsProject,
  STARTER_HTML,
  deriveProjectName,
  loadActiveId,
  loadProjects,
  newProject,
  saveActiveId,
  saveProjects,
} from "@/lib/labsProjects";

const LABS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/labs`;

interface Props {
  projects: LabsProject[];
  activeId: string | null;
  onProjectsChange: (next: LabsProject[]) => void;
  onActiveChange: (id: string) => void;
}

type Device = "desktop" | "tablet" | "mobile";

const DEVICE_DIMS: Record<Device, { w: number; h: number; label: string }> = {
  desktop: { w: 1280, h: 800, label: "Desktop" },
  tablet: { w: 820, h: 1180, label: "Tablet" },
  mobile: { w: 390, h: 844, label: "Mobile" },
};

export const AresLabs = ({ projects, activeId, onProjectsChange, onActiveChange }: Props) => {
  const active = useMemo(
    () => projects.find((p) => p.id === activeId) ?? projects[0],
    [projects, activeId],
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"preview" | "code">("preview");
  const [device, setDevice] = useState<Device>("desktop");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.turns]);

  const updateActive = (patch: Partial<LabsProject>) => {
    if (!active) return;
    onProjectsChange(
      projects.map((p) => (p.id === active.id ? { ...p, ...patch, updatedAt: Date.now() } : p)),
    );
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading || !active) return;
    setInput("");
    const nextTurns = [...active.turns, { role: "user" as const, content: text }];
    const nextName =
      active.turns.length === 0 ? deriveProjectName(nextTurns) : active.name;
    updateActive({ turns: nextTurns, name: nextName });
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
          currentHtml: active.html === STARTER_HTML ? "" : active.html,
          history: active.turns,
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
      updateActive({
        html: data.html || active.html,
        turns: [...nextTurns, { role: "assistant", content: data.summary || "Updated." }],
      });
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
    if (iframeRef.current && active) {
      const cur = active.html;
      iframeRef.current.srcdoc = "";
      requestAnimationFrame(() => {
        if (iframeRef.current) iframeRef.current.srcdoc = cur;
      });
    }
  };

  const download = () => {
    if (!active) return;
    const blob = new Blob([active.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${active.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "ares-labs"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetProject = () => {
    if (!active) return;
    onProjectsChange(
      projects.map((p) =>
        p.id === active.id
          ? { ...p, html: STARTER_HTML, turns: [], name: "New project", updatedAt: Date.now() }
          : p,
      ),
    );
    toast("Project reset.");
  };

  if (!active) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Create a new project from the sidebar to start.
      </div>
    );
  }

  const dims = DEVICE_DIMS[device];

  return (
    <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[minmax(320px,420px)_1fr]">
      {/* Left: chat */}
      <div className="flex min-h-0 flex-col border-r border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="min-w-0">
            <div className="font-display text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-500">
              Ares Labs · GPT-5
            </div>
            <div className="truncate text-xs text-muted-foreground">{active.name}</div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetProject} title="Reset project">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto px-4 py-4">
          {active.turns.length === 0 && (
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
            {active.turns.map((t, i) => (
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
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background px-4 py-2">
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

          {view === "preview" && (
            <div className="flex items-center gap-1 rounded-sm border border-border p-0.5">
              {(["desktop", "tablet", "mobile"] as Device[]).map((d) => {
                const Icon = d === "desktop" ? Monitor : d === "tablet" ? Tablet : Smartphone;
                return (
                  <button
                    key={d}
                    onClick={() => setDevice(d)}
                    title={DEVICE_DIMS[d].label}
                    className={cn(
                      "flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs",
                      device === d
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    <span className="hidden sm:inline">{DEVICE_DIMS[d].label}</span>
                  </button>
                );
              })}
            </div>
          )}

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
            <div className="absolute inset-0 flex items-center justify-center overflow-auto p-4">
              {device === "desktop" ? (
                <iframe
                  ref={iframeRef}
                  title="Ares Labs Preview"
                  srcDoc={active.html}
                  sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
                  className="h-full w-full rounded-sm border border-border bg-white"
                />
              ) : (
                <div
                  className="rounded-[28px] border-4 border-foreground/80 bg-foreground/80 p-2 shadow-2xl"
                  style={{ width: dims.w + 16, maxWidth: "100%" }}
                >
                  <iframe
                    ref={iframeRef}
                    title="Ares Labs Preview"
                    srcDoc={active.html}
                    sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
                    style={{ width: dims.w, height: dims.h, maxWidth: "100%" }}
                    className="rounded-[20px] border-0 bg-white"
                  />
                </div>
              )}
            </div>
          ) : (
            <pre className="scrollbar-thin absolute inset-0 overflow-auto bg-card p-4 text-xs leading-relaxed">
              <code>{active.html}</code>
            </pre>
          )}
          {loading && (
            <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2 rounded-sm border border-border bg-background/90 px-3 py-1.5 text-xs shadow">
              <Loader2 className="h-3 w-3 animate-spin" /> Generating with GPT-5
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Hook for managing labs project state at the parent level.
export const useLabsProjects = () => {
  const [projects, setProjects] = useState<LabsProject[]>(() => {
    const existing = loadProjects();
    if (existing.length) return existing;
    const fresh = newProject();
    return [fresh];
  });
  const [activeId, setActiveId] = useState<string | null>(() => {
    const stored = loadActiveId();
    if (stored) return stored;
    return null;
  });

  useEffect(() => {
    saveProjects(projects);
    if (!activeId || !projects.find((p) => p.id === activeId)) {
      const id = projects[0]?.id ?? null;
      setActiveId(id);
      if (id) saveActiveId(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  useEffect(() => {
    if (activeId) saveActiveId(activeId);
  }, [activeId]);

  const createProject = () => {
    const p = newProject();
    setProjects((prev) => [p, ...prev]);
    setActiveId(p.id);
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => {
      const remaining = prev.filter((p) => p.id !== id);
      if (remaining.length === 0) {
        const fresh = newProject();
        setActiveId(fresh.id);
        return [fresh];
      }
      if (id === activeId) setActiveId(remaining[0].id);
      return remaining;
    });
  };

  return { projects, activeId, setProjects, setActiveId, createProject, deleteProject };
};
