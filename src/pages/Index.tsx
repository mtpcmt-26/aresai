import { useEffect, useMemo, useState } from "react";
import { Moon, Sun, FlaskConical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ModeSelector } from "@/components/ModeSelector";
import { AgeGateDialog } from "@/components/AgeGateDialog";
import { ChatInterface } from "@/components/ChatInterface";
import { AresLabs, useLabsProjects } from "@/components/AresLabs";
import { LabsSidebar } from "@/components/LabsSidebar";
import { Switch } from "@/components/ui/switch";
import { AppSidebar } from "@/components/AppSidebar";
import { SettingsDialog } from "@/components/SettingsDialog";
import { CustomizeDialog } from "@/components/CustomizeDialog";
import { AccountDialog } from "@/components/AccountDialog";
import { ModeId } from "@/lib/modes";
import { Msg } from "@/components/ChatMessage";
import { deriveTitle } from "@/lib/conversations";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useConversations } from "@/hooks/useConversations";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, ageConfirmed, confirmAge } = useAuth();
  const { settings, update: updateSettings } = useUserSettings();
  const {
    conversations,
    activeId,
    setActiveId,
    loading: convLoading,
    updateConversation,
    createConversation,
    deleteConversation,
    clearAll,
  } = useConversations();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [authLoading, user, navigate]);

  const [pendingMode, setPendingMode] = useState<ModeId | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [labsOn, setLabsOn] = useState<boolean>(() => {
    try {
      return localStorage.getItem("ares.labs.on.v1") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("ares.labs.on.v1", labsOn ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [labsOn]);

  const dark = settings.theme !== "light";

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? conversations[0],
    [conversations, activeId],
  );

  const toggleTheme = () => {
    updateSettings({ theme: dark ? "light" : "dark" });
  };

  const handleSelectMode = (id: ModeId) => {
    if (!active) return;
    if (id === "0-filter" && !ageConfirmed) {
      setPendingMode(id);
      return;
    }
    updateConversation(active.id, { mode: id });
  };

  const handleMessagesChange = (updater: (prev: Msg[]) => Msg[]) => {
    if (!active) return;
    updateConversation(active.id, (prev) => {
      const nextMessages = updater(prev.messages);
      const nextTitle =
        prev.title === "New chat" ? deriveTitle(nextMessages) : prev.title;
      return { messages: nextMessages, title: nextTitle };
    });
  };

  const handleNew = () => {
    void createConversation(active?.mode ?? "normal");
  };

  const handleDelete = (id: string) => {
    void deleteConversation(id);
  };

  const handleClearAll = () => {
    void clearAll();
    setSettingsOpen(false);
    toast("All conversations cleared.");
  };

  if (authLoading || convLoading || !active) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-muted-foreground">
        <div className="font-display text-xs uppercase tracking-[0.2em]">Loading…</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="ares-shell flex h-screen w-full bg-background font-body text-foreground">
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
          <header className="ares-shell-header border-b border-border">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
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

              <div className="order-3 w-full sm:order-none sm:w-auto sm:flex-1 sm:max-w-sm sm:px-4">
                {!labsOn && <ModeSelector current={active.mode} onSelect={handleSelectMode} />}
              </div>

              <div className="flex items-center gap-3">
                <label
                  className={`flex items-center gap-2 rounded-sm border px-2.5 py-1.5 transition-colors ${
                    labsOn
                      ? "border-cyan-500/60 bg-cyan-500/10"
                      : "border-border bg-card"
                  }`}
                  title="Toggle Ares Labs — full AI coding studio"
                >
                  <FlaskConical
                    className={`h-3.5 w-3.5 ${labsOn ? "text-cyan-400" : "text-muted-foreground"}`}
                  />
                  <span
                    className={`font-display text-[10px] font-bold uppercase tracking-[0.18em] ${
                      labsOn ? "text-cyan-400" : "text-muted-foreground"
                    }`}
                  >
                    Ares Labs
                  </span>
                  <Switch checked={labsOn} onCheckedChange={setLabsOn} aria-label="Toggle Ares Labs" />
                </label>
                <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
                  {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </header>

          {/* Main */}
          <main className="min-h-0 flex-1">
            {labsOn ? (
              <AresLabs />
            ) : (
              <ChatInterface
                key={active.id}
                mode={active.mode}
                messages={active.messages}
                onMessagesChange={handleMessagesChange}
              />
            )}
          </main>
        </div>

        <AgeGateDialog
          open={pendingMode === "0-filter"}
          onConfirm={async () => {
            await confirmAge();
            updateConversation(active.id, { mode: "0-filter" });
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
          onOpenCustomize={() => {
            setSettingsOpen(false);
            setCustomizeOpen(true);
          }}
        />

        <CustomizeDialog open={customizeOpen} onOpenChange={setCustomizeOpen} />

        <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} />
      </div>
    </SidebarProvider>
  );
};

export default Index;
