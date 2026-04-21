import { MODES, ModeId } from "@/lib/modes";
import { cn } from "@/lib/utils";

interface Props {
  current: ModeId;
  onSelect: (id: ModeId) => void;
}

export const ModeSelector = ({ current, onSelect }: Props) => {
  return (
    <div className="flex flex-wrap gap-2">
      {MODES.map((m) => {
        const active = m.id === current;
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={cn(
              "group relative flex flex-col items-start gap-0.5 rounded-sm border px-3 py-2 text-left transition-all",
              "border-border bg-card hover:border-foreground/40",
              active && "border-transparent",
            )}
            style={
              active
                ? {
                    backgroundColor: `hsl(var(${m.accentVar}) / 0.15)`,
                    boxShadow: `inset 0 0 0 1px hsl(var(${m.accentVar}))`,
                  }
                : undefined
            }
          >
            <div className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: `hsl(var(${m.accentVar}))` }}
              />
              <span className="font-display text-xs font-bold uppercase tracking-wider">
                {m.label}
              </span>
              {m.ageGated && (
                <span className="rounded-sm border border-border px-1 py-px text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  13+
                </span>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground">{m.short}</span>
          </button>
        );
      })}
    </div>
  );
};
