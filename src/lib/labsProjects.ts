export interface LabsTurn {
  role: "user" | "assistant";
  content: string;
}

export interface LabsProject {
  id: string;
  name: string;
  html: string;
  turns: LabsTurn[];
  createdAt: number;
  updatedAt: number;
}

export const STARTER_HTML = `<!doctype html>
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

const KEY = "ares.labs.projects.v2";
const ACTIVE_KEY = "ares.labs.activeProject.v2";

export const newProject = (name = "New project"): LabsProject => {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name,
    html: STARTER_HTML,
    turns: [],
    createdAt: now,
    updatedAt: now,
  };
};

export const loadProjects = (): LabsProject[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

export const saveProjects = (p: LabsProject[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(p.slice(0, 50)));
  } catch {
    /* ignore */
  }
};

export const loadActiveId = (): string | null => {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
};

export const saveActiveId = (id: string) => {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    /* ignore */
  }
};

export const deriveProjectName = (turns: LabsTurn[]): string => {
  const first = turns.find((t) => t.role === "user");
  if (!first) return "New project";
  const t = first.content.trim().replace(/\s+/g, " ");
  return t.length > 40 ? t.slice(0, 40) + "…" : t;
};
