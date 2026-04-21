import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AgeGateDialog = ({ open, onConfirm, onCancel }: Props) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-wide">
            0-Filter Mode
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            This mode is unfiltered. Brutally honest. May include mild-to-moderate profanity.
            Restricted to users 13 or older. Confirm your age to continue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCancel}>
            Under 13 — go back
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            I am 13 or older
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
