import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ares-api`;

function generateKey(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(40);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `ares_live_${out}`;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const ApiKeysDialog = ({ open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [freshKey, setFreshKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, last_used_at, revoked_at, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error("Could not load API keys.");
    setKeys((data as ApiKeyRow[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (open) {
      setFreshKey(null);
      load();
    }
  }, [open, load]);

  const createKey = async () => {
    if (!user) return;
    setCreating(true);
    const key = generateKey();
    const hash = await sha256Hex(key);
    const { error } = await supabase.from("api_keys").insert({
      user_id: user.id,
      name: name.trim() || "API key",
      key_prefix: key.slice(0, 14),
      key_hash: hash,
    });
    setCreating(false);
    if (error) {
      toast.error("Could not create key.");
      return;
    }
    setFreshKey(key);
    setName("");
    load();
  };

  const revoke = async (id: string) => {
    const { error } = await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error("Could not revoke key.");
    else load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("api_keys").delete().eq("id", id);
    if (error) toast.error("Could not delete key.");
    else load();
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied.`);
  };

  const curlExample = `curl -X POST ${ENDPOINT} \\
  -H "Authorization: Bearer ${freshKey ?? "ares_live_YOUR_KEY"}" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"Explain quantum tunneling","mode":"short"}'`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-sm border-border sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-[0.18em]">
            Ares API keys
          </DialogTitle>
          <DialogDescription>
            Create a key, then call Ares from any app. Keys are shown once — store them safely.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Key name (e.g. my-project)"
            className="rounded-sm"
          />
          <Button onClick={createKey} disabled={creating} className="gap-2 rounded-sm">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create
          </Button>
        </div>

        {freshKey && (
          <div className="rounded-sm border border-primary/40 bg-primary/5 p-3">
            <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
              Copy this now — it won't be shown again
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded-sm bg-muted px-2 py-1 text-xs">
                {freshKey}
              </code>
              <Button size="icon" variant="outline" onClick={() => copy(freshKey, "Key")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && keys.length === 0 && (
            <p className="text-sm text-muted-foreground">No keys yet.</p>
          )}
          {keys.map((k) => (
            <div
              key={k.id}
              className="flex items-center justify-between gap-3 rounded-sm border border-border p-3"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 truncate text-sm">
                  <KeyRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {k.name}
                  {k.revoked_at && (
                    <span className="text-xs uppercase tracking-wider text-destructive">
                      revoked
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {k.key_prefix}••••••••  ·  {k.last_used_at ? `last used ${new Date(k.last_used_at).toLocaleDateString()}` : "never used"}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                {!k.revoked_at && (
                  <Button size="sm" variant="outline" onClick={() => revoke(k.id)}>
                    Revoke
                  </Button>
                )}
                <Button size="icon" variant="ghost" onClick={() => remove(k.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 rounded-sm border border-border p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Endpoint</p>
            <Button size="sm" variant="ghost" className="gap-1" onClick={() => copy(ENDPOINT, "Endpoint")}>
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          </div>
          <code className="block break-all text-xs">{ENDPOINT}</code>
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Example</p>
            <Button size="sm" variant="ghost" className="gap-1" onClick={() => copy(curlExample, "Example")}>
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          </div>
          <pre className="overflow-x-auto rounded-sm bg-muted p-2 text-[11px] leading-relaxed">
{curlExample}
          </pre>
          <p className="text-xs text-muted-foreground">
            Body: <code>prompt</code> or <code>messages</code>, optional <code>mode</code>{" "}
            (normal, 0-filter, people-pleaser, political, short) and <code>model</code>. Response:{" "}
            <code>{`{ reply, mode, model }`}</code>.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
