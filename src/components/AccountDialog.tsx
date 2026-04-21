import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AccountDialog = ({ open, onOpenChange }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-sm border-border">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-[0.18em]">
            Account
          </DialogTitle>
          <DialogDescription>
            Account features are coming soon.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-sm border border-border bg-muted">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Sign in to sync conversations across devices.
          </p>
          <p className="text-xs text-muted-foreground/70">
            Conversations are currently stored locally on this device.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
