// Customization options for Ares UI

export type FontKey = "modern" | "serif" | "mono" | "rounded" | "playful";
export type ThemeKey = "light" | "dark" | "amoled";
export type AccentKey = "blue" | "purple" | "green" | "orange" | "pink" | "red" | "teal";
export type BackgroundKey =
  | "default"
  | "solid-black"
  | "solid-white"
  | "solid-slate"
  | "gradient-sunset"
  | "gradient-ocean"
  | "gradient-forest"
  | "wallpaper-grid"
  | "wallpaper-noise"
  | "wallpaper-mesh";

export interface AresSettings {
  font: FontKey;
  background: BackgroundKey;
  theme: ThemeKey;
  accent_color: AccentKey;
}

export const DEFAULT_SETTINGS: AresSettings = {
  font: "modern",
  background: "default",
  theme: "dark",
  accent_color: "orange",
};

export const FONTS: { key: FontKey; label: string; stack: string }[] = [
  { key: "modern", label: "Modern", stack: "'Inter', ui-sans-serif, system-ui, sans-serif" },
  { key: "serif", label: "Serif", stack: "'Source Serif Pro', 'Georgia', ui-serif, serif" },
  { key: "mono", label: "Mono", stack: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" },
  { key: "rounded", label: "Rounded", stack: "'Nunito', 'SF Pro Rounded', ui-rounded, sans-serif" },
  { key: "playful", label: "Playful", stack: "'Comic Neue', 'Comic Sans MS', cursive" },
];

// HSL values (without hsl())
export const ACCENTS: { key: AccentKey; label: string; hsl: string }[] = [
  { key: "blue", label: "Blue", hsl: "217 91% 60%" },
  { key: "purple", label: "Purple", hsl: "270 80% 60%" },
  { key: "green", label: "Green", hsl: "142 71% 45%" },
  { key: "orange", label: "Orange", hsl: "12 90% 58%" },
  { key: "pink", label: "Pink", hsl: "330 81% 60%" },
  { key: "red", label: "Red", hsl: "0 75% 55%" },
  { key: "teal", label: "Teal", hsl: "173 80% 40%" },
];

export const BACKGROUNDS: { key: BackgroundKey; label: string; preview: string; css: string }[] = [
  { key: "default", label: "Default", preview: "hsl(var(--background))", css: "none" },
  {
    key: "solid-black",
    label: "Pure Black",
    preview: "#000000",
    css: "linear-gradient(#000000, #000000)",
  },
  {
    key: "solid-white",
    label: "Pure White",
    preview: "#ffffff",
    css: "linear-gradient(#ffffff, #ffffff)",
  },
  {
    key: "solid-slate",
    label: "Slate",
    preview: "#1e293b",
    css: "linear-gradient(#1e293b, #1e293b)",
  },
  {
    key: "gradient-sunset",
    label: "Sunset",
    preview: "linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)",
    css: "linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)",
  },
  {
    key: "gradient-ocean",
    label: "Ocean",
    preview: "linear-gradient(135deg, #0093E9 0%, #80D0C7 100%)",
    css: "linear-gradient(135deg, #0093E9 0%, #80D0C7 100%)",
  },
  {
    key: "gradient-forest",
    label: "Forest",
    preview: "linear-gradient(135deg, #134e5e 0%, #71b280 100%)",
    css: "linear-gradient(135deg, #134e5e 0%, #71b280 100%)",
  },
  {
    key: "wallpaper-grid",
    label: "Grid",
    preview:
      "repeating-linear-gradient(0deg, #1a1a1a 0 24px, #2a2a2a 24px 25px), repeating-linear-gradient(90deg, #1a1a1a 0 24px, #2a2a2a 24px 25px)",
    css: "repeating-linear-gradient(0deg, hsl(var(--background)) 0 24px, hsl(var(--border)) 24px 25px), repeating-linear-gradient(90deg, transparent 0 24px, hsl(var(--border)) 24px 25px)",
  },
  {
    key: "wallpaper-noise",
    label: "Noise",
    preview:
      "radial-gradient(circle at 20% 30%, #2a2a2a 0%, transparent 40%), radial-gradient(circle at 80% 70%, #333 0%, transparent 40%), linear-gradient(#0a0a0a, #0a0a0a)",
    css: "radial-gradient(circle at 20% 30%, hsl(var(--muted)) 0%, transparent 40%), radial-gradient(circle at 80% 70%, hsl(var(--muted)) 0%, transparent 40%), linear-gradient(hsl(var(--background)), hsl(var(--background)))",
  },
  {
    key: "wallpaper-mesh",
    label: "Mesh",
    preview:
      "radial-gradient(at 0% 0%, #ff6b6b 0%, transparent 50%), radial-gradient(at 100% 100%, #4ecdc4 0%, transparent 50%), linear-gradient(#1a1a2e, #1a1a2e)",
    css: "radial-gradient(at 0% 0%, hsl(var(--accent) / 0.3) 0%, transparent 50%), radial-gradient(at 100% 100%, hsl(var(--accent) / 0.2) 0%, transparent 50%), linear-gradient(hsl(var(--background)), hsl(var(--background)))",
  },
];

export const THEMES: { key: ThemeKey; label: string }[] = [
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "amoled", label: "AMOLED" },
];

export const applyCustomization = (settings: AresSettings) => {
  const root = document.documentElement;

  // Theme
  root.classList.remove("dark", "amoled");
  if (settings.theme === "dark") root.classList.add("dark");
  if (settings.theme === "amoled") root.classList.add("dark", "amoled");

  // Font
  const font = FONTS.find((f) => f.key === settings.font) ?? FONTS[0];
  root.style.setProperty("--ares-font", font.stack);

  // Accent
  const accent = ACCENTS.find((a) => a.key === settings.accent_color) ?? ACCENTS[3];
  root.style.setProperty("--ares-accent", accent.hsl);
  root.style.setProperty("--accent", accent.hsl);
  root.style.setProperty("--ring", accent.hsl);

  // Background
  const bg = BACKGROUNDS.find((b) => b.key === settings.background) ?? BACKGROUNDS[0];
  root.style.setProperty("--ares-background", bg.css || "none");
  root.classList.toggle("has-custom-bg", settings.background !== "default");
};
