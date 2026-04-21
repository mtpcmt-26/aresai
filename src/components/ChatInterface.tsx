import { useEffect, useRef, useState } from "react";
import { ArrowUp, Trash2 } from "lucide-react";
import { ChatMessage, Msg } from "./ChatMessage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModeId, getMode } from "@/lib/modes";
import { toast } from "sonner";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

interface Props {
  mode: ModeId;
  messages: Msg[];
  onMessagesChange: (updater: (prev: Msg[]) => Msg[]) => void;
}

export const ChatInterface = ({ mode, messages, onMessagesChange }: Props) => {
  const meta = getMode(mode);
  const setMessages = onMessagesChange;
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(() => next);
    setLoading(true);

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

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next, mode }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) {
          toast.error("Rate limited. Slow down.");
        } else if (resp.status === 402) {
          toast.error("AI credits exhausted. Add funds in workspace settings.");
        } else {
          toast.error("Ares failed to respond.");
        }
        setMessages(() => next); // rollback assistant placeholder
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

      if (buf.trim()) {
        for (let raw of buf.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (!raw.startsWith("data: ")) continue;
          const json = raw.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch {}
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
                {meta.description} No flattery. No emotional validation. Just answers.
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
          <div className="relative flex items-end gap-2 rounded-sm border border-border bg-card focus-within:border-foreground/40">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={`Message Ares — ${meta.label} mode`}
              rows={1}
              className="min-h-[52px] max-h-40 resize-none border-0 bg-transparent text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <div className="flex items-center gap-1 p-2">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMessages([])}
                  className="h-8 w-8"
                  aria-label="Clear chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                onClick={send}
                disabled={!input.trim() || loading}
                size="icon"
                className="h-8 w-8 bg-foreground text-background hover:bg-foreground/90"
                aria-label="Send"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Ares tells the truth. He won't flatter you. Press Enter to send · Shift+Enter for newline.
          </p>
        </div>
      </div>
    </div>
  );
};
