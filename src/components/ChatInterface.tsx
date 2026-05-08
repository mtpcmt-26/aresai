import { useEffect, useRef, useState } from "react";
import { ArrowUp, Trash2, Paperclip, ImagePlus, X, Video } from "lucide-react";
import { ChatMessage, Msg } from "./ChatMessage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModeId, getMode } from "@/lib/modes";
import { loadModelId, saveModelId } from "@/lib/models";
import { ModelSelector } from "./ModelSelector";
import { QuizMode } from "./QuizMode";
import { detectQuizIntent, detectVideoIntent } from "@/lib/intent";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const VIDEO_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/video-gen`;

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

interface Props {
  mode: ModeId;
  messages: Msg[];
  onMessagesChange: (updater: (prev: Msg[]) => Msg[]) => void;
}

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });

export const ChatInterface = ({ mode, messages, onMessagesChange }: Props) => {
  const meta = getMode(mode);
  const setMessages = onMessagesChange;
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<string>(() => loadModelId());
  const [attachments, setAttachments] = useState<string[]>([]);
  const [imageMode, setImageMode] = useState(false);
  const [quiz, setQuiz] = useState<{ topic: string; count: number; difficulty: "easy" | "medium" | "hard" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleModelChange = (id: string) => {
    setModel(id);
    saveModelId(id);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_IMAGES - attachments.length;
    const list = Array.from(files).slice(0, remaining);
    const next: string[] = [];
    for (const f of list) {
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name}: not an image`);
        continue;
      }
      if (f.size > MAX_IMAGE_BYTES) {
        toast.error(`${f.name}: over 5MB`);
        continue;
      }
      next.push(await fileToDataUrl(f));
    }
    if (next.length) setAttachments((p) => [...p, ...next]);
  };

  const removeAttachment = (i: number) =>
    setAttachments((p) => p.filter((_, idx) => idx !== i));

  const send = async () => {
    const text = input.trim();
    if ((!text && attachments.length === 0) || loading) return;
    setInput("");
    const userImages = attachments.slice();
    setAttachments([]);
    const wasImageMode = imageMode;

    const userMsg: Msg = { role: "user", content: text, images: userImages.length ? userImages : undefined };
    const next: Msg[] = [...messages, userMsg];
    setMessages(() => next);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to chat.");
        setMessages(() => next);
        setLoading(false);
        return;
      }

      // ---- Quiz intent (auto Quiz Mode) ----
      if (!wasImageMode && !userImages.length) {
        const qi = detectQuizIntent(text);
        if (qi.isQuiz) {
          // Use prior assistant content as study context if any
          const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
          const ctx = lastAssistant?.content?.slice(0, 3000);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Spinning up a ${qi.difficulty} quiz on **${qi.topic}** — ${qi.count} questions.`,
            },
          ]);
          setQuiz({ topic: qi.topic, count: qi.count, difficulty: qi.difficulty });
          // Stash context on the quiz request via closure: extend setQuiz with context
          (window as unknown as { __ares_quiz_ctx?: string }).__ares_quiz_ctx = ctx;
          setLoading(false);
          return;
        }

        // ---- Video intent (Replicate text-to-video) ----
        const vi = detectVideoIntent(text);
        if (vi.isVideo) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Generating a video: *${vi.prompt}* — this takes ~30–60s.`,
            },
          ]);
          try {
            const vresp = await fetch(VIDEO_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
              body: JSON.stringify({ prompt: vi.prompt }),
            });
            if (!vresp.ok) {
              const err = await vresp.json().catch(() => ({}));
              setMessages((prev) => [
                ...prev,
                { role: "assistant", content: `Video generation failed: ${err.error || vresp.statusText}` },
              ]);
            } else {
              const vdata = await vresp.json();
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: `Here's your video.`,
                  video: vdata.videoUrl,
                },
              ]);
            }
          } catch (err) {
            console.error(err);
            toast.error("Video generation error.");
          }
          setLoading(false);
          return;
        }
      }

      // ---- Image generation path ----
      if (wasImageMode) {
        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            imageGen: true,
            prompt: text,
            images: userImages, // for image edit
          }),
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          toast.error(err.error || "Image generation failed.");
          setLoading(false);
          return;
        }
        const data = await resp.json();
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.text || "",
            images: data.image ? [data.image] : undefined,
          },
        ]);
        setLoading(false);
        return;
      }

      // ---- Normal streaming chat ----
      const payloadMessages = next.map((m) => {
        if (m.role === "user" && m.images && m.images.length > 0) {
          return {
            role: "user",
            content: [
              ...(m.content ? [{ type: "text", text: m.content }] : []),
              ...m.images.map((url) => ({ type: "image_url", image_url: { url } })),
            ],
          };
        }
        return { role: m.role, content: m.content };
      });

      let assistantSoFar = "";
      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantSoFar } : m,
            );
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: payloadMessages, mode, model }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("Rate limited. Slow down.");
        else if (resp.status === 402) toast.error("AI credits exhausted.");
        else toast.error("Ares failed to respond.");
        setMessages(() => next);
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;

      while (!done) {
        const { done: rd, value } = await reader.read();
        if (rd) break;
        buf += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
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

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-start gap-3 py-12">
              <div
                className="font-display text-xs font-bold uppercase tracking-[0.2em]"
                style={{ color: `hsl(var(${meta.accentVar}))` }}
              >
                — {meta.label} mode active
              </div>
              <h2 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
                Ask Ares anything.
              </h2>
              <p className="max-w-md text-sm text-muted-foreground">
                {meta.description} Attach images to analyze, or toggle image mode to generate.
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <ChatMessage key={i} msg={m} accentVar={meta.accentVar} />
          ))}
          {loading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3">
              <div
                className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-border bg-card font-display text-[10px] font-bold uppercase tracking-wider"
                style={{ color: `hsl(var(${meta.accentVar}))` }}
              >
                A
              </div>
              <div className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-3.5 py-3">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/60 animate-pulse-dot" />
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/60 animate-pulse-dot" style={{ animationDelay: "0.15s" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/60 animate-pulse-dot" style={{ animationDelay: "0.3s" }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <div className="relative flex flex-col rounded-sm border border-border bg-card focus-within:border-foreground/40">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 border-b border-border/60 p-2">
                {attachments.map((src, i) => (
                  <div key={i} className="relative h-16 w-16">
                    <img src={src} alt="" className="h-full w-full rounded-sm border border-border object-cover" />
                    <button
                      onClick={() => removeAttachment(i)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background"
                      aria-label="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={
                imageMode
                  ? attachments.length
                    ? "Describe how to edit the attached image…"
                    : "Describe an image to generate…"
                  : `Message Ares — ${meta.label} mode`
              }
              rows={1}
              className="min-h-[52px] max-h-40 resize-none border-0 bg-transparent text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <div className="flex items-center justify-between gap-2 border-t border-border/60 p-2">
              <div className="flex items-center gap-1">
                <ModelSelector value={model} onChange={handleModelChange} />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleFiles(e.target.files);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={attachments.length >= MAX_IMAGES}
                  aria-label="Attach image"
                  title="Attach image to analyze"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-8 w-8", imageMode && "bg-accent text-accent-foreground")}
                  onClick={() => setImageMode((v) => !v)}
                  aria-label="Toggle image generation"
                  title={imageMode ? "Image generation: ON" : "Generate an image"}
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMessages(() => [])}
                    className="h-8 w-8"
                    aria-label="Clear chat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  onClick={send}
                  disabled={(!input.trim() && attachments.length === 0) || loading}
                  size="icon"
                  className="h-8 w-8 bg-foreground text-background hover:bg-foreground/90"
                  aria-label="Send"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            {imageMode
              ? "Image mode: Ares will generate or edit an image."
              : "Ares can make mistakes. Fact-check anything important."}
          </p>
        </div>
      </div>
      {quiz && (
        <QuizMode
          open
          topic={quiz.topic}
          count={quiz.count}
          difficulty={quiz.difficulty}
          context={(window as unknown as { __ares_quiz_ctx?: string }).__ares_quiz_ctx}
          onClose={(summary) => {
            setQuiz(null);
            if (summary) {
              setMessages((prev) => [...prev, { role: "assistant", content: summary }]);
            }
          }}
        />
      )}
    </div>
  );
};
