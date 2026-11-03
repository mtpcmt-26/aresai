export const RESEARCH_MODELS = [
  { id: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash', provider: 'lovable', skill: 'balanced', skillLabel: 'Verified research', description: 'Fast, source-grounded answers.' },
  { id: 'openai/gpt-5.5', label: 'GPT-5.5', provider: 'lovable', skill: 'reasoning', skillLabel: 'Verified research', description: 'Detailed synthesis and reasoning.' },
  { id: 'google/gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', provider: 'lovable', skill: 'long-context', skillLabel: 'Verified research', description: 'Compare long documents and sources.' },
  { id: 'groq/qwen/qwen3.8-27b', label: 'Qwen 3.8 27B · Groq', provider: 'groq', skill: 'reasoning', skillLabel: 'Verified research', description: 'Source-grounded reasoning at Groq speed.' },
] as const;

export const CODING_MODELS = [
  { id: 'openai/gpt-5.5', label: 'GPT-5.5', provider: 'lovable', skill: 'reasoning', skillLabel: 'Coding', description: 'Complex app building and refactoring.' },
  { id: 'google/gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', provider: 'lovable', skill: 'long-context', skillLabel: 'Coding', description: 'Large app edits and code understanding.' },
  { id: 'groq/openai/gpt-oss-120b', label: 'GPT-OSS 120B · Groq', provider: 'groq', skill: 'reasoning', skillLabel: 'Coding', description: 'Open-weight coding and reasoning.' },
  { id: 'groq/qwen/qwen3.8-27b', label: 'Qwen 3.8 27B · Groq', provider: 'groq', skill: 'reasoning', skillLabel: 'Coding', description: 'Quick implementation and code edits.' },
] as const;

export const isResearchModel = (id: string) => RESEARCH_MODELS.some(m => m.id === id);
export const isCodingModel = (id: string) => CODING_MODELS.some(m => m.id === id);