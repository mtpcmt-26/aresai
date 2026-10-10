import { supabase } from "@/integrations/supabase/client";

export type Focus = "all" | "academic" | "news" | "youtube" | "reddit" | "finance";
export type Depth = "quick" | "deep";

export interface SearchSource { url: string; title: string; description: string }
export interface FinanceData {
  symbol: string; name: string; currency: string; exchange: string; price: number;
  dayHigh?: number; dayLow?: number; fiftyTwoWeekHigh?: number; fiftyTwoWeekLow?: number;
  volume?: number; monthChangePct: number | null; history: number[];
}

export type ResearchEvent =
  | { type: "status"; text: string }
  | { type: "plan"; queries: string[] }
  | { type: "sources"; sources: SearchSource[] }
  | { type: "finance"; data: FinanceData }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; text: string };

export const FOCUSES: { id: Focus; label: string }[] = [
  { id: "all", label: "All web" },
  { id: "academic", label: "Academic" },
  { id: "news", label: "News" },
  { id: "finance", label: "Finance" },
  { id: "youtube", label: "YouTube" },
  { id: "reddit", label: "Reddit" },
];

export async function runResearch(
  params: { query: string; focus: Focus; depth: Depth; model: string; history: { role: string; content: string }[] },
  onEvent: (e: ResearchEvent) => void,
  signal?: AbortSignal,
) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) { onEvent({ type: "error", text: "Please sign in to search." }); return; }
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify(params),
    signal,
  });
  if (!res.ok || !res.body) {
    const j = await res.json().catch(() => ({}));
    onEvent({ type: "error", text: j.error ?? "Search failed." });
    return;
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
      if (chunk.startsWith("data: ")) {
        try { onEvent(JSON.parse(chunk.slice(6))); } catch { /* ignore */ }
      }
    }
  }
}

// Turn [1] / [2][3] citations into markdown links to the matching source.
export const linkCitations = (text: string, sources: SearchSource[]) =>
  text.replace(/\[(\d{1,2})\](?!\()/g, (m, n) => {
    const s = sources[parseInt(n, 10) - 1];
    return s ? `[${n}](${s.url})` : m;
  });

export const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };
