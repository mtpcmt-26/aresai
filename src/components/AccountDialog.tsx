import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User, LogOut, KeyRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useState } from "react";
import { ApiKeysDialog } from "@/components/ApiKeysDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AccountDialog = ({ open, onOpenChange }: Props) => {
  const { user, signOut } = useAuth();
  const [keysOpen, setKeysOpen] = useState(false);


  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-sm border-border">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-[0.18em]">
            Account
          </DialogTitle>
          <DialogDescription>
            Manage your session.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-sm border border-border bg-muted">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            {user?.email ?? "Not signed in"}
          </p>
          {user && (
            <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
