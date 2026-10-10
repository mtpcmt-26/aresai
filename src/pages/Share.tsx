import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SearchSource } from "@/lib/research";
import { AnswerMarkdown, SourceCards } from "@/components/search/AnswerView";

const Share = () => {
  const { id } = useParams();
  const [row, setRow] = useState<{ query: string; answer: string; sources: SearchSource[] } | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    supabase.from("shared_answers").select("query, answer, sources").eq("id", id).maybeSingle()
      .then(({ data }) => setRow(data ? { ...data, sources: (data.sources as unknown as SearchSource[]) ?? [] } : null));
  }, [id]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center border-b border-border px-4 py-2.5">
        <span className="font-display text-sm font-bold uppercase tracking-[0.2em]">Ares</span>
        <Link to="/search" className="ml-auto text-xs font-bold uppercase tracking-wider hover:underline">Ask your own →</Link>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        {row === undefined ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : row === null ? (
          <p className="text-center text-sm text-muted-foreground">This shared answer doesn't exist.</p>
        ) : (
          <>
            <h1 className="mb-4 font-display text-2xl font-bold">{row.query}</h1>
            {row.sources.length > 0 && <div className="mb-5"><SourceCards sources={row.sources} /></div>}
            <AnswerMarkdown text={row.answer} sources={row.sources} />
          </>
        )}
      </main>
    </div>
  );
};

export default Share;
