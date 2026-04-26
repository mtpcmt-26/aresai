import { Check, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MODELS, ModelOption, getModel } from "@/lib/models";

interface Props {
  value: string;
  onChange: (id: string) => void;
}

export const ModelSelector = ({ value, onChange }: Props) => {
  const current = getModel(value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 rounded-sm border border-border px-2 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Select model"
        >
          <Sparkles className="h-3 w-3" />
          <span className="max-w-[140px] truncate">{current.label}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Model
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {MODELS.map((m: ModelOption) => {
          const selected = m.id === value;
          return (
            <DropdownMenuItem
              key={m.id}
              onSelect={() => onChange(m.id)}
              className="flex flex-col items-start gap-0.5 py-2"
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-sm font-medium">{m.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-sm border border-border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    {m.skillLabel}
                  </span>
                  {selected && <Check className="h-3.5 w-3.5" />}
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground">{m.description}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
