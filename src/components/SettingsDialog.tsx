import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Palette } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dark: boolean;
  onToggleTheme: () => void;
  onClearAll: () => void;
  onOpenCustomize: () => void;
}

export const SettingsDialog = ({
  open,
  onOpenChange,
  dark,
  onToggleTheme,
  onClearAll,
  onOpenCustomize,
}: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-sm border-border">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-[0.18em]">
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure how Ares behaves and looks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <button
            onClick={onOpenCustomize}
            className="flex w-full items-center justify-between rounded-sm border border-border p-3 text-left transition-colors hover:border-foreground/40 hover:bg-secondary/50"
          >
            <div className="flex items-center gap-3">
              <Palette className="h-4 w-4" />
              <div>
                <Label className="cursor-pointer text-sm font-medium">Customize Ares</Label>
                <p className="text-xs text-muted-foreground">Font, theme, accent, background.</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">→</span>
          </button>

          <div className="flex items-center justify-between rounded-sm border border-border p-3">
            <div>
              <Label className="text-sm font-medium">Dark theme</Label>
              <p className="text-xs text-muted-foreground">Quick toggle (overridden by Customize).</p>
            </div>
            <Switch checked={dark} onCheckedChange={onToggleTheme} />
          </div>

          <div className="flex items-center justify-between rounded-sm border border-destructive/40 p-3">
            <div>
              <Label className="text-sm font-medium">Clear all conversations</Label>
              <p className="text-xs text-muted-foreground">Permanent. Cannot be undone.</p>
            </div>
            <Button variant="destructive" size="sm" onClick={onClearAll}>
              Clear all
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
