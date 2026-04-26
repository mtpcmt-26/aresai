// Catalog of user-selectable models exposed in the chat composer.
// Each entry covers a distinct skill/ability bucket so the user has at least
// one option per category.

export type ModelSkill =
  | "balanced"
  | "fast"
  | "reasoning"
  | "long-context"
  | "multimodal"
  | "lightweight";

export interface ModelOption {
  id: string;            // value sent to the edge function
  label: string;         // short display name
  provider: "lovable" | "groq"; // which gateway to use
  skill: ModelSkill;
  skillLabel: string;    // human label for the skill chip
  description: string;
}

export const MODELS: ModelOption[] = [
  {
    id: "google/gemini-3-flash-preview",
    label: "Gemini 3 Flash",
    provider: "lovable",
    skill: "balanced",
    skillLabel: "Balanced",
    description: "Default. Fast, capable, great for most chats.",
  },
  {
    id: "groq/llama-3.3-70b-versatile",
    label: "Llama 3.3 70B (Groq)",
    provider: "groq",
    skill: "fast",
    skillLabel: "Ultra-fast",
    description: "Lowest latency. Streams answers near-instantly.",
  },
  {
    id: "openai/gpt-5.2",
    label: "GPT-5.2",
    provider: "lovable",
    skill: "reasoning",
    skillLabel: "Reasoning",
    description: "Best for complex problems, math, multi-step logic.",
  },
  {
    id: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "lovable",
    skill: "long-context",
    skillLabel: "Long context",
    description: "Handles huge inputs and deep documents.",
  },
  {
    id: "openai/gpt-5",
    label: "GPT-5",
    provider: "lovable",
    skill: "multimodal",
    skillLabel: "Multimodal",
    description: "Strong all-rounder with text + image understanding.",
  },
  {
    id: "google/gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
    provider: "lovable",
    skill: "lightweight",
    skillLabel: "Lightweight",
    description: "Cheapest, snappiest. Good for quick Q&A.",
  },
];

export const DEFAULT_MODEL_ID = MODELS[0].id;

export const getModel = (id: string): ModelOption =>
  MODELS.find((m) => m.id === id) ?? MODELS[0];

const STORAGE_KEY = "ares.model.v1";

export const loadModelId = (): string => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && MODELS.some((m) => m.id === v)) return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_MODEL_ID;
};

export const saveModelId = (id: string) => {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
};
