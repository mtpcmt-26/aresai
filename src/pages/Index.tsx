import { useEffect, useMemo, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ModeSelector } from "@/components/ModeSelector";
import { AgeGateDialog } from "@/components/AgeGateDialog";
import { ChatInterface } from "@/components/ChatInterface";
import { AppSidebar } from "@/components/AppSidebar";
import { SettingsDialog } from "@/components/SettingsDialog";
import { AccountDialog } from "@/components/AccountDialog";
import { ModeId } from "@/lib/modes";
import { Msg } from "@/components/ChatMessage";
import {
  Conversation,
  deriveTitle,
  loadConversations,
  newConversation,
  saveConversations,
} from "@/lib/conversations";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, ageConfirmed, confirmAge } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [authLoading, user, navigate]);

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const existing = loadConversations();
    return existing.length > 0 ? existing : [newConversation("normal")];
  });
  const [activeId, setActiveId] = useState<string>(() => {
    const existing = loadConversations();
    return (existing[0]?.id) ?? conversations[0].id;
  });

  const [pendingMode, setPendingMode] = useState<ModeId | null>(null);
  const [dark, setDark] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? conversations[0],
    [conversations, activeId],
  );

  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  };

  const updateActive = (patch: Partial<Conversation>) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === active.id ? { ...c, ...patch, updatedAt: Date.now() } : c,
      ),
    );
  };

  const handleSelectMode = (id: ModeId) => {
    if (id === "0-filter" && !ageConfirmed) {
      setPendingMode(id);
      return;
    }
    updateActive({ mode: id });
  };

  const handleMessagesChange = (updater: (prev: Msg[]) => Msg[]) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== active.id) return c;
        const nextMessages = updater(c.messages);
        const nextTitle =
          c.title === "New chat" ? deriveTitle(nextMessages) : c.title;
        return {
          ...c,
          messages: nextMessages,
          title: nextTitle,
          updatedAt: Date.now(),
        };
      }),
    );
  };

  const handleNew = () => {
    const conv = newConversation(active?.mode ?? "normal");
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
  };

  const handleDelete = (id: string) => {
    setConversations((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (remaining.length === 0) {
        const fresh = newConversation("normal");
        setActiveId(fresh.id);
        return [fresh];
      }
      if (id === activeId) setActiveId(remaining[0].id);
      return remaining;
    });
  };

  const handleClearAll = () => {
    const fresh = newConversation("normal");
    setConversations([fresh]);
    setActiveId(fresh.id);
    setSettingsOpen(false);
    toast("All conversations cleared.");
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background font-body text-foreground">
        <AppSidebar
          conversations={conversations}
          activeId={active.id}
          onSelect={setActiveId}
          onNew={handleNew}
          onDelete={handleDelete}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenAccount={() => setAccountOpen(true)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <header className="border-b border-border">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="-ml-1" />
                <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-foreground font-display text-base font-extrabold text-background">
                  Α
                </div>
                <div>
                  <h1 className="font-display text-base font-extrabold uppercase tracking-[0.18em]">
                    Ares
                  </h1>
                  <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                    by simpl.
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
            <div className="mx-auto max-w-6xl px-4 pb-3 sm:px-6">
              <ModeSelector current={active.mode} onSelect={handleSelectMode} />
            </div>
          </header>

          {/* Chat */}
          <main className="min-h-0 flex-1">
            <ChatInterface
              key={active.id}
              mode={active.mode}
              messages={active.messages}
              onMessagesChange={handleMessagesChange}
            />
          </main>
        </div>

        <AgeGateDialog
          open={pendingMode === "0-filter"}
          onConfirm={async () => {
            await confirmAge();
            updateActive({ mode: "0-filter" });
            setPendingMode(null);
          }}
          onCancel={() => {
            setPendingMode(null);
            toast("0-Filter mode is restricted to users 13+. Please choose another mode.");
          }}
        />

        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          dark={dark}
          onToggleTheme={toggleTheme}
          onClearAll={handleClearAll}
        />

        <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} />
      </div>
    </SidebarProvider>
  );
};

export default Index;
