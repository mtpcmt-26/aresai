import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "ares.announcement.dismissed.v1";
const TARGET_URL = "https://app-remake-15.preview.static.emergentagent.com";

export function AnnouncementBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(STORAGE_KEY) !== "1");
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <a
      href={TARGET_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="relative block w-full border-b border-border bg-primary px-4 py-2 text-center text-primary-foreground transition-colors hover:bg-primary/90"
    >
      <span className="text-sm font-medium">Try the new Ares!</span>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
        onClick={handleDismiss}
        aria-label="Dismiss announcement"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </a>
  );
}
