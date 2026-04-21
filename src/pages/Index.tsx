import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { ModeSelector } from "@/components/ModeSelector";
import { AgeGateDialog } from "@/components/AgeGateDialog";
import { ChatInterface } from "@/components/ChatInterface";
import { ModeId } from "@/lib/modes";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Index = () => {
  const [mode, setMode] = useState<ModeId>("normal");
  const [pendingMode, setPendingMode] = useState<ModeId | null>(null);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [dark, setDark] = useState(true);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  };

  const handleSelect = (id: ModeId) => {
    if (id === "0-filter" && !ageConfirmed) {
      setPendingMode(id);
      return;
    }
    setMode(id);
  };

  return (
    <div className="flex h-screen flex-col bg-background font-body text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-foreground font-display text-base font-extrabold text-background">
              Α
            </div>
            <div>
              <h1 className="font-display text-base font-extrabold uppercase tracking-[0.18em]">
                Ares
              </h1>
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Truth · No flattery
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-3 sm:px-6">
          <ModeSelector current={mode} onSelect={handleSelect} />
        </div>
      </header>

      {/* Chat */}
      <main className="min-h-0 flex-1">
        <ChatInterface key={mode} mode={mode} />
      </main>

      <AgeGateDialog
        open={pendingMode === "0-filter"}
        onConfirm={() => {
          setAgeConfirmed(true);
          setMode("0-filter");
          setPendingMode(null);
        }}
        onCancel={() => {
          setPendingMode(null);
          toast("0-Filter mode is restricted to users 13+. Please choose another mode.");
        }}
      />
    </div>
  );
};

export default Index;
