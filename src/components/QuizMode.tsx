import { useEffect, useState } from "react";
import { X, Loader2, Check, ChevronRight, RotateCcw, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const QUIZ_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quiz-gen`;

export interface QuizQuestion {
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
}
export interface Quiz {
  title: string;
  questions: QuizQuestion[];
}

interface Props {
  open: boolean;
  topic: string;
  count?: number;
  difficulty?: "easy" | "medium" | "hard";
  context?: string;
  onClose: (summary?: string) => void;
}

export const QuizMode = ({
  open,
  topic,
  count = 10,
  difficulty = "medium",
  context,
  onClose,
}: Props) => {
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Array<number | null>>([]);
  const [finished, setFinished] = useState(false);
  const [reqDifficulty, setReqDifficulty] = useState(difficulty);

  useEffect(() => {
    if (!open) return;
    void load(topic, count, difficulty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const load = async (tp: string, ct: number, df: "easy" | "medium" | "hard") => {
    setLoading(true);
    setQuiz(null);
    setIdx(0);
    setSelected(null);
    setRevealed(false);
    setAnswers([]);
    setFinished(false);
    setReqDifficulty(df);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in.");
        onClose();
        return;
      }
      const resp = await fetch(QUIZ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ topic: tp, count: ct, difficulty: df, context }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        toast.error(err.error || "Quiz failed.");
        onClose();
        return;
      }
      const data = await resp.json();
      const q: Quiz = data.quiz;
      if (!q?.questions?.length) {
        toast.error("Empty quiz.");
        onClose();
        return;
      }
      setQuiz(q);
      setAnswers(new Array(q.questions.length).fill(null));
    } catch (e) {
      console.error(e);
      toast.error("Quiz error.");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const total = quiz?.questions.length ?? 0;
  const cur = quiz?.questions[idx];
  const progress = total ? ((idx + (revealed ? 1 : 0)) / total) * 100 : 0;
  const score = answers.reduce(
    (acc, a, i) => (quiz && a === quiz.questions[i].correctIndex ? acc + 1 : acc),
    0,
  );

  const submit = () => {
    if (selected === null || revealed || !quiz) return;
    const a = [...answers];
    a[idx] = selected;
    setAnswers(a);
    setRevealed(true);
  };

  const skip = () => {
    if (revealed || !quiz) return;
    const a = [...answers];
    a[idx] = null;
    setAnswers(a);
    setRevealed(true);
  };

  const next = () => {
    if (!quiz) return;
    if (idx + 1 >= quiz.questions.length) {
      setFinished(true);
      return;
    }
    setIdx(idx + 1);
    setSelected(null);
    setRevealed(false);
  };

  const exit = () => {
    if (quiz) {
      const finalScore = quiz.questions.reduce(
        (acc, q, i) => (answers[i] === q.correctIndex ? acc + 1 : acc),
        0,
      );
      onClose(`Quiz on ${topic}: scored ${finalScore}/${quiz.questions.length}.`);
    } else {
      onClose();
    }
  };

  // Weak topics: any topic with at least one wrong/skipped answer
  const weakTopics = quiz
    ? Array.from(
        new Set(
          quiz.questions
            .map((q, i) => (answers[i] !== q.correctIndex ? q.topic : null))
            .filter((t): t is string => !!t),
        ),
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="font-display text-sm font-bold uppercase tracking-[0.18em] bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Quiz Mode
              </div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Powered by Ares
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={exit} aria-label="Exit">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-20">
            <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            <div className="text-sm text-muted-foreground">Generating your quiz on {topic}…</div>
          </div>
        )}

        {!loading && quiz && !finished && cur && (
          <>
            <div className="px-6 pt-5">
              <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-widest text-muted-foreground">
                <span>
                  Question {idx + 1} of {total}
                </span>
                <span className="text-foreground/70">{cur.topic}</span>
              </div>
              <Progress value={progress} className="h-1 bg-muted" />
            </div>
            <div className="px-6 py-5">
              <h2 className="mb-5 text-lg font-semibold leading-snug sm:text-xl">
                {cur.question}
              </h2>
              <div className="space-y-2">
                {cur.choices.map((choice, i) => {
                  const isSel = selected === i;
                  const isCorrect = revealed && i === cur.correctIndex;
                  const isWrong = revealed && isSel && i !== cur.correctIndex;
                  return (
                    <button
                      key={i}
                      onClick={() => !revealed && setSelected(i)}
                      disabled={revealed}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all",
                        "border-border bg-background hover:border-foreground/40",
                        isSel && !revealed && "border-blue-500 bg-blue-500/10",
                        isCorrect && "border-emerald-500 bg-emerald-500/15 text-emerald-100",
                        isWrong && "border-rose-500 bg-rose-500/15 text-rose-100",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-bold",
                          "border-border",
                          isSel && !revealed && "border-blue-500 bg-blue-500 text-white",
                          isCorrect && "border-emerald-500 bg-emerald-500 text-white",
                          isWrong && "border-rose-500 bg-rose-500 text-white",
                        )}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1">{choice}</span>
                      {isCorrect && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
              {revealed && (
                <div
                  className={cn(
                    "mt-4 rounded-xl border p-3 text-sm",
                    answers[idx] === cur.correctIndex
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                      : "border-rose-500/40 bg-rose-500/10 text-rose-100",
                  )}
                >
                  <div className="font-semibold">
                    {answers[idx] === cur.correctIndex
                      ? "Correct!"
                      : answers[idx] === null
                        ? "Skipped"
                        : "Incorrect"}
                  </div>
                  <div className="mt-1 text-foreground/80">{cur.explanation}</div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/40 px-6 py-3">
              {!revealed ? (
                <>
                  <Button variant="ghost" onClick={skip}>
                    Skip
                  </Button>
                  <Button
                    onClick={submit}
                    disabled={selected === null}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90"
                  >
                    Submit
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-xs text-muted-foreground">
                    Score: {score}/{idx + 1}
                  </div>
                  <Button
                    onClick={next}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90"
                  >
                    {idx + 1 >= total ? "See results" : "Next question"}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </>
        )}

        {!loading && quiz && finished && (
          <div className="px-6 py-8">
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                <Trophy className="h-7 w-7" />
              </div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Final score
              </div>
              <div className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-5xl font-bold text-transparent">
                {score}/{total}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {Math.round((score / total) * 100)}% on {quiz.title}
              </div>
            </div>

            {weakTopics.length > 0 && (
              <div className="mb-5 rounded-xl border border-border bg-muted/40 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Weak areas
                </div>
                <div className="flex flex-wrap gap-2">
                  {weakTopics.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-100"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                onClick={() => load(topic, total, reqDifficulty)}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" /> Retry quiz
              </Button>
              <Button
                onClick={() =>
                  load(
                    weakTopics.length ? weakTopics.join(", ") : topic,
                    total,
                    reqDifficulty,
                  )
                }
                disabled={!weakTopics.length}
                variant="outline"
                className="gap-2"
              >
                Study weak topics
              </Button>
              <Button
                onClick={() =>
                  load(
                    topic,
                    total,
                    reqDifficulty === "easy"
                      ? "medium"
                      : reqDifficulty === "medium"
                        ? "hard"
                        : "hard",
                  )
                }
                className="gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90"
              >
                <Sparkles className="h-4 w-4" /> Harder quiz
              </Button>
              <Button variant="ghost" onClick={exit}>
                Back to chat
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
