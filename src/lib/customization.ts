// Customization options for Ares UI

export type FontKey =
  | "modern"
  | "serif"
  | "mono"
  | "rounded"
  | "playful"
  | "grotesk"
  | "editorial"
  | "geometric"
  | "slab"
  | "code"
  | "display"
  | "literary";
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
  | "gradient-aurora"
  | "gradient-candy"
  | "gradient-midnight"
  | "gradient-peach"
  | "gradient-mono"
  | "wallpaper-grid"
  | "wallpaper-noise"
  | "wallpaper-mesh"
  | "wallpaper-dots"
  | "wallpaper-stripes"
  | "wallpaper-topo"
  | "wallpaper-blueprint"
  | "wallpaper-carbon";

export interface AresSettings {
  font: FontKey;
  background: BackgroundKey | string;
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
  { key: "grotesk", label: "Grotesk", stack: "'Space Grotesk', ui-sans-serif, sans-serif" },
  { key: "editorial", label: "Editorial", stack: "'Playfair Display', Georgia, serif" },
  { key: "geometric", label: "Geometric", stack: "'DM Sans', ui-sans-serif, sans-serif" },
  { key: "slab", label: "Slab", stack: "'IBM Plex Serif', Georgia, serif" },
  { key: "code", label: "Code", stack: "'Fira Code', ui-monospace, monospace" },
  { key: "display", label: "Display", stack: "'Bebas Neue', Impact, sans-serif" },
  { key: "literary", label: "Literary", stack: "'Lora', Georgia, serif" },
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
  {
    key: "gradient-aurora",
    label: "Aurora",
    preview: "linear-gradient(135deg, #00c6ff 0%, #0072ff 50%, #7f00ff 100%)",
    css: "linear-gradient(135deg, #00c6ff 0%, #0072ff 50%, #7f00ff 100%)",
  },
  {
    key: "gradient-candy",
    label: "Candy",
    preview: "linear-gradient(135deg, #ff9a9e 0%, #fad0c4 50%, #fbc2eb 100%)",
    css: "linear-gradient(135deg, #ff9a9e 0%, #fad0c4 50%, #fbc2eb 100%)",
  },
  {
    key: "gradient-midnight",
    label: "Midnight",
    preview: "linear-gradient(135deg, #232526 0%, #414345 100%)",
    css: "linear-gradient(135deg, #232526 0%, #414345 100%)",
  },
  {
    key: "gradient-peach",
    label: "Peach",
    preview: "linear-gradient(135deg, #ed4264 0%, #ffedbc 100%)",
    css: "linear-gradient(135deg, #ed4264 0%, #ffedbc 100%)",
  },
  {
    key: "gradient-mono",
    label: "Mono Fade",
    preview: "linear-gradient(135deg, #0f0f0f 0%, #4a4a4a 100%)",
    css: "linear-gradient(135deg, #0f0f0f 0%, #4a4a4a 100%)",
  },
  {
    key: "wallpaper-dots",
    label: "Dots",
    preview:
      "radial-gradient(#3a3a3a 1.5px, transparent 1.5px), linear-gradient(#0f0f0f, #0f0f0f)",
    css: "radial-gradient(hsl(var(--border)) 1.5px, transparent 1.5px), linear-gradient(hsl(var(--background)), hsl(var(--background)))",
  },
  {
    key: "wallpaper-stripes",
    label: "Stripes",
    preview:
      "repeating-linear-gradient(45deg, #1a1a1a 0 12px, #262626 12px 24px)",
    css: "repeating-linear-gradient(45deg, hsl(var(--background)) 0 12px, hsl(var(--muted)) 12px 24px)",
  },
  {
    key: "wallpaper-topo",
    label: "Topo",
    preview:
      "radial-gradient(circle at 30% 40%, #1f2937 0 20%, transparent 21%), radial-gradient(circle at 70% 60%, #374151 0 28%, transparent 29%), linear-gradient(#0b1220, #0b1220)",
    css: "radial-gradient(circle at 30% 40%, hsl(var(--muted)) 0 20%, transparent 21%), radial-gradient(circle at 70% 60%, hsl(var(--secondary)) 0 28%, transparent 29%), linear-gradient(hsl(var(--background)), hsl(var(--background)))",
  },
  {
    key: "wallpaper-blueprint",
    label: "Blueprint",
    preview:
      "repeating-linear-gradient(0deg, #0b3d91 0 24px, #1453c4 24px 25px), repeating-linear-gradient(90deg, #0b3d91 0 24px, #1453c4 24px 25px)",
    css: "repeating-linear-gradient(0deg, #0b3d91 0 24px, #1453c4 24px 25px), repeating-linear-gradient(90deg, transparent 0 24px, #1453c4 24px 25px)",
  },
  {
    key: "wallpaper-carbon",
    label: "Carbon",
    preview:
      "repeating-linear-gradient(45deg, #1a1a1a 0 6px, #2a2a2a 6px 12px), repeating-linear-gradient(-45deg, #1a1a1a 0 6px, #2a2a2a 6px 12px)",
    css: "repeating-linear-gradient(45deg, #1a1a1a 0 6px, #2a2a2a 6px 12px), repeating-linear-gradient(-45deg, #1a1a1a 0 6px, #2a2a2a 6px 12px)",
  },
];

export const THEMES: { key: ThemeKey; label: string }[] = [
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "amoled", label: "AMOLED" },
];

// A custom background uploaded by the user is stored as: "custom:<dataURL>"
export const CUSTOM_BG_PREFIX = "custom:";

export const isCustomBackground = (value: string | undefined | null) =>
  typeof value === "string" && value.startsWith(CUSTOM_BG_PREFIX);

export const getCustomBackgroundUrl = (value: string | undefined | null) =>
  isCustomBackground(value) ? (value as string).slice(CUSTOM_BG_PREFIX.length) : null;

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

  // Background — supports preset keys or "custom:<dataURL>"
  const customUrl = getCustomBackgroundUrl(settings.background);
  if (customUrl) {
    root.style.setProperty("--ares-background", `url("${customUrl}")`);
    root.classList.add("has-custom-bg");
  } else {
    const bg = BACKGROUNDS.find((b) => b.key === settings.background) ?? BACKGROUNDS[0];
    root.style.setProperty("--ares-background", bg.css || "none");
    root.classList.toggle("has-custom-bg", settings.background !== "default");
  }
};
