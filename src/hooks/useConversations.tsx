import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Conversation, newConversation } from "@/lib/conversations";
import { ModeId } from "@/lib/modes";

const LEGACY_KEY = "ares.conversations.v1";

const rowToConversation = (row: any): Conversation => ({
  id: row.id,
  title: row.title ?? "New chat",
  mode: (row.mode as ModeId) ?? "normal",
  messages: Array.isArray(row.messages) ? row.messages : [],
  createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
});

export const useConversations = () => {
  const { user, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Track which conversations need persisting (id -> timer)
  const pendingTimers = useRef<Map<string, number>>(new Map());
  const knownIds = useRef<Set<string>>(new Set());

  // Load on user change
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setConversations([]);
      setActiveId(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);

      // One-time legacy migration from localStorage
      try {
        const raw = localStorage.getItem(LEGACY_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const rows = parsed.map((c: Conversation) => ({
              id: c.id,
              user_id: user.id,
              title: c.title || "New chat",
              mode: c.mode || "normal",
              messages: c.messages ?? [],
            }));
            await supabase.from("conversations").upsert(rows, { onConflict: "id" });
          }
          localStorage.removeItem(LEGACY_KEY);
        }
      } catch {
        /* ignore */
      }

      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("Failed to load conversations", error);
        setConversations([]);
        setActiveId(null);
        setLoading(false);
        return;
      }

      let convs = (data ?? []).map(rowToConversation);

      // Ensure at least one
      if (convs.length === 0) {
        const fresh = newConversation("normal");
        await supabase.from("conversations").insert({
          id: fresh.id,
          user_id: user.id,
          title: fresh.title,
          mode: fresh.mode,
          messages: fresh.messages,
        });
        convs = [fresh];
      }

      knownIds.current = new Set(convs.map((c) => c.id));
      setConversations(convs);
      setActiveId(convs[0].id);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  // Debounced persist for a single conversation
  const queuePersist = useCallback(
    (conv: Conversation) => {
      if (!user) return;
      const timers = pendingTimers.current;
      const existing = timers.get(conv.id);
      if (existing) window.clearTimeout(existing);
      const t = window.setTimeout(async () => {
        timers.delete(conv.id);
        await supabase.from("conversations").upsert(
          {
            id: conv.id,
            user_id: user.id,
            title: conv.title,
            mode: conv.mode,
            messages: conv.messages,
          },
          { onConflict: "id" },
        );
      }, 600);
      timers.set(conv.id, t);
    },
    [user],
  );

  // Mutators
  const updateConversation = useCallback(
    (id: string, patch: Partial<Conversation> | ((prev: Conversation) => Partial<Conversation>)) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          const p = typeof patch === "function" ? patch(c) : patch;
          const next: Conversation = { ...c, ...p, updatedAt: Date.now() };
          queuePersist(next);
          return next;
        }),
      );
    },
    [queuePersist],
  );

  const createConversation = useCallback(
    async (mode: ModeId) => {
      const conv = newConversation(mode);
      knownIds.current.add(conv.id);
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv.id);
      if (user) {
        await supabase.from("conversations").insert({
          id: conv.id,
          user_id: user.id,
          title: conv.title,
          mode: conv.mode,
          messages: conv.messages,
        });
      }
      return conv;
    },
    [user],
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      setConversations((prev) => {
        const remaining = prev.filter((c) => c.id !== id);
        if (id === activeId) {
          setActiveId(remaining[0]?.id ?? null);
        }
        return remaining;
      });
      knownIds.current.delete(id);
      const timer = pendingTimers.current.get(id);
      if (timer) {
        window.clearTimeout(timer);
        pendingTimers.current.delete(id);
      }
      if (user) {
        await supabase.from("conversations").delete().eq("id", id).eq("user_id", user.id);
      }
    },
    [activeId, user],
  );

  const clearAll = useCallback(async () => {
    pendingTimers.current.forEach((t) => window.clearTimeout(t));
    pendingTimers.current.clear();
    if (user) {
      await supabase.from("conversations").delete().eq("user_id", user.id);
    }
    const fresh = newConversation("normal");
    if (user) {
      await supabase.from("conversations").insert({
        id: fresh.id,
        user_id: user.id,
        title: fresh.title,
        mode: fresh.mode,
        messages: fresh.messages,
      });
    }
    knownIds.current = new Set([fresh.id]);
    setConversations([fresh]);
    setActiveId(fresh.id);
  }, [user]);

  return {
    conversations,
    activeId,
    setActiveId,
    loading,
    updateConversation,
    createConversation,
    deleteConversation,
    clearAll,
  };
};
