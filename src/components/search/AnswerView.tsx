import ReactMarkdown from "react-markdown";
import { FinanceData, SearchSource, hostOf, linkCitations } from "@/lib/research";
import { TrendingDown, TrendingUp } from "lucide-react";

export const SourceCards = ({ sources }: { sources: SearchSource[] }) => (
  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
    {sources.map((s, i) => (
      <a key={s.url} href={s.url} target="_blank" rel="noreferrer"
        className="group flex min-h-[72px] flex-col justify-between rounded-sm border border-border bg-card p-2.5 transition-colors hover:border-foreground/40">
        <span className="line-clamp-2 text-xs font-medium text-foreground">{s.title}</span>
        <span className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <img src={`https://www.google.com/s2/favicons?domain=${hostOf(s.url)}&sz=32`} alt="" className="h-3 w-3" />
          <span className="truncate">{hostOf(s.url)}</span>
          <span className="ml-auto font-bold">{i + 1}</span>
        </span>
      </a>
    ))}
  </div>
);

export const FinanceCard = ({ d }: { d: FinanceData }) => {
  const up = (d.monthChangePct ?? 0) >= 0;
  const h = d.history; const min = Math.min(...h), max = Math.max(...h);
  const pts = h.map((v, i) => `${(i / Math.max(1, h.length - 1)) * 300},${60 - ((v - min) / (max - min || 1)) * 56}`).join(" ");
  const fmt = (n?: number) => (n == null ? "—" : n.toLocaleString(undefined, { maximumFractionDigits: 2 }));
  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{d.exchange} · {d.symbol}</div>
          <div className="font-display text-sm font-bold">{d.name}</div>
          <div className="mt-1 text-2xl font-bold">{fmt(d.price)} <span className="text-xs font-normal text-muted-foreground">{d.currency}</span></div>
        </div>
        <div className={`flex items-center gap-1 text-sm font-bold ${up ? "text-primary" : "text-destructive"}`}>
          {up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {d.monthChangePct?.toFixed(2)}% <span className="text-[10px] font-normal text-muted-foreground">1M</span>
        </div>
      </div>
      {h.length > 1 && (
        <svg viewBox="0 0 300 62" className="mt-3 h-16 w-full" preserveAspectRatio="none">
          <polyline fill="none" strokeWidth="2" points={pts} className={up ? "stroke-primary" : "stroke-destructive"} />
        </svg>
      )}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-muted-foreground sm:grid-cols-4">
        <span>Day low <b className="text-foreground">{fmt(d.dayLow)}</b></span>
        <span>Day high <b className="text-foreground">{fmt(d.dayHigh)}</b></span>
        <span>52W low <b className="text-foreground">{fmt(d.fiftyTwoWeekLow)}</b></span>
        <span>52W high <b className="text-foreground">{fmt(d.fiftyTwoWeekHigh)}</b></span>
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground">Data: Yahoo Finance</div>
    </div>
  );
};

export const AnswerMarkdown = ({ text, sources }: { text: string; sources: SearchSource[] }) => (
  <div className="prose prose-sm max-w-none dark:prose-invert prose-a:no-underline [&_a]:mx-0.5 [&_a]:rounded-sm [&_a]:bg-secondary [&_a]:px-1 [&_a]:text-[10px] [&_a]:font-bold [&_a]:text-foreground">
    <ReactMarkdown components={{ a: (p) => <a {...p} target="_blank" rel="noreferrer" /> }}>
      {linkCitations(text, sources) || "▍"}
    </ReactMarkdown>
  </div>
);
