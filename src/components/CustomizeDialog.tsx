import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useUserSettings } from "@/hooks/useUserSettings";
import {
  ACCENTS,
  BACKGROUNDS,
  FONTS,
  THEMES,
  AccentKey,
  BackgroundKey,
  FontKey,
  ThemeKey,
  CUSTOM_BG_PREFIX,
  isCustomBackground,
  getCustomBackgroundUrl,
} from "@/lib/customization";
import { cn } from "@/lib/utils";
import { Check, RotateCcw, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CustomizeDialog = ({ open, onOpenChange }: Props) => {
  const { settings, update, reset } = useUserSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fontStack = FONTS.find((f) => f.key === settings.font)?.stack;
  const customBgUrl = getCustomBackgroundUrl(settings.background);
  const hasCustomBg = isCustomBackground(settings.background);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image must be under 4MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      void update({ background: `${CUSTOM_BG_PREFIX}${dataUrl}` });
      toast.success("Custom background applied.");
    };
    reader.onerror = () => toast.error("Could not read that image.");
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-sm border-border sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-[0.18em]">
            Customize Ares
          </DialogTitle>
          <DialogDescription>
            Make Ares look the way you want. Changes apply instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* FONT */}
          <section className="space-y-3">
            <Label className="font-display text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Font
            </Label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {FONTS.map((f) => {
                const active = settings.font === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => update({ font: f.key as FontKey })}
                    className={cn(
                      "rounded-sm border p-3 text-left transition-colors",
                      active
                        ? "border-foreground bg-secondary"
                        : "border-border hover:border-foreground/40",
                    )}
                  >
                    <div className="text-base" style={{ fontFamily: f.stack }}>
                      Aa
                    </div>
                    <div className="mt-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                      {f.label}
                    </div>
                  </button>
                );
              })}
            </div>
            <div
              className="rounded-sm border border-border bg-card p-3 text-sm"
              style={{ fontFamily: fontStack }}
            >
              The quick brown fox jumps over the lazy dog. 0123456789
            </div>
          </section>

          {/* THEME */}
          <section className="space-y-3">
            <Label className="font-display text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Theme
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((t) => {
                const active = settings.theme === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => update({ theme: t.key as ThemeKey })}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-sm border px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "border-foreground bg-secondary"
                        : "border-border hover:border-foreground/40",
                    )}
                  >
                    {active && <Check className="h-3.5 w-3.5" />}
                    {t.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ACCENT */}
          <section className="space-y-3">
            <Label className="font-display text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Accent color
            </Label>
            <div className="flex flex-wrap gap-2">
              {ACCENTS.map((a) => {
                const active = settings.accent_color === a.key;
                return (
                  <button
                    key={a.key}
                    onClick={() => update({ accent_color: a.key as AccentKey })}
                    aria-label={a.label}
                    title={a.label}
                    className={cn(
                      "relative h-10 w-10 rounded-full border-2 transition-transform",
                      active
                        ? "scale-110 border-foreground"
                        : "border-border hover:scale-105",
                    )}
                    style={{ background: `hsl(${a.hsl})` }}
                  >
                    {active && (
                      <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* BACKGROUND */}
          <section className="space-y-3">
            <Label className="font-display text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Background
            </Label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {BACKGROUNDS.map((b) => {
                const active = !hasCustomBg && settings.background === b.key;
                return (
                  <button
                    key={b.key}
                    onClick={() => update({ background: b.key as BackgroundKey })}
                    className={cn(
                      "group relative aspect-square overflow-hidden rounded-sm border-2 transition-colors",
                      active ? "border-foreground" : "border-border hover:border-foreground/40",
                    )}
                    style={{ background: b.preview }}
                    aria-label={b.label}
                  >
                    {active && (
                      <span className="absolute right-1 top-1 rounded-full bg-foreground p-0.5 text-background">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    <span className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5 text-left text-[10px] font-medium uppercase tracking-wider text-white">
                      {b.label}
                    </span>
                  </button>
                );
              })}

              {/* Upload custom background tile */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "group relative flex aspect-square items-center justify-center overflow-hidden rounded-sm border-2 transition-colors",
                  hasCustomBg
                    ? "border-foreground"
                    : "border-dashed border-border hover:border-foreground/40",
                )}
                style={
                  customBgUrl
                    ? {
                        backgroundImage: `url("${customBgUrl}")`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
                aria-label="Upload custom background"
              >
                {!customBgUrl && (
                  <Upload className="h-5 w-5 text-muted-foreground" />
                )}
                {hasCustomBg && (
                  <span className="absolute right-1 top-1 rounded-full bg-foreground p-0.5 text-background">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                <span className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5 text-left text-[10px] font-medium uppercase tracking-wider text-white">
                  {hasCustomBg ? "Custom" : "Upload"}
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
            </div>
            {hasCustomBg && (
              <button
                onClick={() => update({ background: "default" })}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" /> Remove custom background
              </button>
            )}
          </section>

          {/* RESET */}
          <div className="flex justify-end border-t border-border pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await reset();
                toast("Customization reset to defaults.");
              }}
            >
              <RotateCcw className="mr-2 h-3.5 w-3.5" />
              Reset to default
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
