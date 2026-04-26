import { MODES, ModeId, getMode } from "@/lib/modes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  current: ModeId;
  onSelect: (id: ModeId) => void;
}

export const ModeSelector = ({ current, onSelect }: Props) => {
  const active = getMode(current);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="group flex w-full items-center justify-between gap-3 rounded-sm border border-border bg-card px-3 py-2 text-left transition-colors hover:border-foreground/40 sm:w-auto sm:min-w-[280px]"
          style={{
            boxShadow: `inset 0 0 0 1px hsl(var(${active.accentVar}) / 0.6)`,
          }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: `hsl(var(${active.accentVar}))` }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display text-xs font-bold uppercase tracking-wider">
                  {active.label}
                </span>
                {active.ageGated && (
                  <span className="rounded-sm border border-border px-1 py-px text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    13+
                  </span>
                )}
              </div>
              <span className="block truncate text-[11px] text-muted-foreground">
                {active.short}
              </span>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[280px] rounded-sm"
      >
        {MODES.map((m) => {
          const isActive = m.id === current;
          return (
            <DropdownMenuItem
              key={m.id}
              onSelect={() => onSelect(m.id)}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-sm px-2.5 py-2",
                isActive && "bg-secondary",
              )}
            >
              <div className="flex w-full items-center gap-2">
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
              <span className="pl-3.5 text-[11px] text-muted-foreground">
                {m.description}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
