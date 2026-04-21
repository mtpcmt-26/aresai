export type ModeId = "normal" | "0-filter" | "people-pleaser" | "political" | "short";

export interface ModeMeta {
  id: ModeId;
  label: string;
  short: string;
  description: string;
  accentVar: string; // CSS var name (without var())
  ageGated?: boolean;
}

export const MODES: ModeMeta[] = [
  {
    id: "normal",
    label: "Normal",
    short: "Direct. Factual.",
    description: "Neutral, logical, no emotional padding.",
    accentVar: "--mode-normal",
  },
  {
    id: "0-filter",
    label: "0-Filter",
    short: "Brutal. Unfiltered.",
    description: "Brutally honest. Profanity allowed. 13+ only.",
    accentVar: "--mode-zerofilter",
    ageGated: true,
  },
  {
    id: "people-pleaser",
    label: "People-Pleaser",
    short: "Gentle. Truthful.",
    description: "Soft tone, still the full truth.",
    accentVar: "--mode-pleaser",
  },
  {
    id: "political",
    label: "Political",
    short: "Sharp. Issue-focused.",
    description: "Blunt policy analysis. No endorsements.",
    accentVar: "--mode-political",
  },
  {
    id: "short",
    label: "Short",
    short: "1–2 sentences.",
    description: "Concise. No fluff.",
    accentVar: "--mode-short",
  },
];

export const getMode = (id: ModeId) => MODES.find((m) => m.id === id)!;
