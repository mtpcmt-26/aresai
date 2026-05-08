// Intent detection for Ares: video generation and quiz mode triggers.

const VIDEO_PATTERNS = [
  /\b(generate|make|create|produce|render|give\s+me|build|cook\s+up)\s+(?:me\s+)?(?:a\s+)?(?:short\s+|quick\s+|small\s+)?(?:video|clip|animation|movie|reel)\b/i,
  /\bvideo\s+of\b/i,
  /\b(turn|convert)\s+(this|it|that)\s+into\s+a\s+video\b/i,
  /\bai\s+video\b/i,
  /\btext[-\s]?to[-\s]?video\b/i,
];

export interface VideoIntent {
  isVideo: boolean;
  prompt: string;
}

export const detectVideoIntent = (text: string): VideoIntent => {
  const t = (text || "").trim();
  if (!t) return { isVideo: false, prompt: "" };
  const matched = VIDEO_PATTERNS.some((re) => re.test(t));
  if (!matched) return { isVideo: false, prompt: "" };
  // Strip leading command phrasing for cleaner prompt.
  const cleaned = t
    .replace(
      /^(?:please\s+)?(?:can\s+you\s+|could\s+you\s+|would\s+you\s+)?(?:generate|make|create|produce|render|give\s+me|build|cook\s+up)\s+(?:me\s+)?(?:a\s+)?(?:short\s+|quick\s+|small\s+)?(?:video|clip|animation|movie|reel)\s*(?:of|about|showing|that\s+shows|with)?\s*/i,
      "",
    )
    .replace(/^[:,\-\s]+/, "")
    .trim();
  return { isVideo: true, prompt: cleaned || t };
};

const QUIZ_PATTERNS = [
  /\b(make|give|build|create|generate)\s+(?:me\s+)?(?:a\s+)?(?:\d+[-\s]?question\s+)?(?:practice\s+)?(?:quiz|test|exam)\b/i,
  /\bquiz\s+me\b/i,
  /\btest\s+me\b/i,
  /\bask\s+me\s+(?:some\s+)?questions?\b/i,
  /\bhelp\s+me\s+study\s+with\s+questions?\b/i,
  /\b(give|make)\s+(?:me\s+)?(?:some\s+)?practice\s+(?:problems|questions)\b/i,
  /\bturn\s+this\s+into\s+a\s+quiz\b/i,
  /\bmake\s+questions\s+out\s+of\s+(?:this|that|it)\b/i,
  /\bpractice\s+test\b/i,
  /\b(study|review)\s+(?:with\s+)?(?:flash\s*cards|questions)\b/i,
];

export interface QuizIntent {
  isQuiz: boolean;
  topic: string;
  count: number;
  difficulty: "easy" | "medium" | "hard";
}

export const detectQuizIntent = (text: string): QuizIntent => {
  const t = (text || "").trim();
  if (!t) return { isQuiz: false, topic: "", count: 10, difficulty: "medium" };
  const isQuiz = QUIZ_PATTERNS.some((re) => re.test(t));
  if (!isQuiz) return { isQuiz: false, topic: "", count: 10, difficulty: "medium" };

  const countMatch = t.match(/\b(\d{1,2})[-\s]?question/i) ?? t.match(/\b(\d{1,2})\s+questions?\b/i);
  let count = countMatch ? parseInt(countMatch[1], 10) : 10;
  count = Math.max(5, Math.min(15, count));

  let difficulty: "easy" | "medium" | "hard" = "medium";
  if (/\b(easy|simple|beginner|basic)\b/i.test(t)) difficulty = "easy";
  else if (/\b(hard|harder|tough|advanced|difficult|expert)\b/i.test(t)) difficulty = "hard";

  // Extract topic after "on", "about", "for", "in", "of"
  const topicMatch =
    t.match(/\b(?:on|about|for|in|over|covering|of)\s+(?:the\s+)?([^.?!]+)/i) ?? null;
  let topic = topicMatch ? topicMatch[1].trim() : t;
  topic = topic
    .replace(/\b\d{1,2}[-\s]?questions?\b/gi, "")
    .replace(/\b(easy|hard|medium|tough|simple|beginner|advanced|difficult|expert)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!topic || topic.length < 2) topic = t;

  return { isQuiz: true, topic, count, difficulty };
};
