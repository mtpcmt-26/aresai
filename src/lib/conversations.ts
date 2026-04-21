import { Msg } from "@/components/ChatMessage";
import { ModeId } from "./modes";

export interface Conversation {
  id: string;
  title: string;
  mode: ModeId;
  messages: Msg[];
  createdAt: number;
  updatedAt: number;
}

const KEY = "ares.conversations.v1";

export const loadConversations = (): Conversation[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
};

export const saveConversations = (conversations: Conversation[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(conversations));
  } catch {
    /* ignore */
  }
};

export const newConversation = (mode: ModeId): Conversation => {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "New chat",
    mode,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
};

export const deriveTitle = (messages: Msg[]): string => {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New chat";
  const t = first.content.trim().replace(/\s+/g, " ");
  return t.length > 48 ? t.slice(0, 48) + "…" : t;
};
