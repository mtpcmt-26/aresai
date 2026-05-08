import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

export interface Msg {
  role: "user" | "assistant";
  content: string;
  images?: string[]; // data URLs or http URLs
  video?: string; // url to mp4
}

export const ChatMessage = ({ msg, accentVar }: { msg: Msg; accentVar?: string }) => {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div
          className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-border bg-card font-display text-[10px] font-bold uppercase tracking-wider"
          style={accentVar ? { color: `hsl(var(${accentVar}))` } : undefined}
        >
          A
        </div>
      )}
      <div
        className={cn(
          "max-w-[75%] rounded-sm px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-foreground text-background"
            : "border border-border bg-card text-card-foreground",
        )}
      >
        {msg.video && (
          <div className="mb-2">
            <video
              src={msg.video}
              controls
              playsInline
              className="max-h-80 w-full rounded-sm border border-border/50 bg-black"
            />
          </div>
        )}
        {msg.images && msg.images.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {msg.images.map((src, i) => (
              <a key={i} href={src} target="_blank" rel="noreferrer" className="block">
                <img
                  src={src}
                  alt={isUser ? "Attached image" : "Generated image"}
                  className="max-h-72 max-w-full rounded-sm border border-border/50 object-contain"
                />
              </a>
            ))}
          </div>
        )}
        {isUser ? (
          msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none prose-p:my-2 prose-pre:my-2 prose-pre:bg-muted prose-code:text-accent prose-headings:font-display prose-headings:uppercase prose-headings:tracking-wide prose-strong:text-foreground">
            <ReactMarkdown>{msg.content || (msg.images?.length ? "" : "▍")}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
