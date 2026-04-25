import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  AresSettings,
  DEFAULT_SETTINGS,
  applyCustomization,
  FontKey,
  BackgroundKey,
  ThemeKey,
  AccentKey,
} from "@/lib/customization";

interface Ctx {
  settings: AresSettings;
  loading: boolean;
  update: (patch: Partial<AresSettings>) => Promise<void>;
  reset: () => Promise<void>;
}

const SettingsContext = createContext<Ctx | undefined>(undefined);

const sanitize = (raw: any): AresSettings => ({
  font: (raw?.font as FontKey) || DEFAULT_SETTINGS.font,
  background: (raw?.background as BackgroundKey) || DEFAULT_SETTINGS.background,
  theme: (raw?.theme as ThemeKey) || DEFAULT_SETTINGS.theme,
  accent_color: (raw?.accent_color as AccentKey) || DEFAULT_SETTINGS.accent_color,
});

export const UserSettingsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AresSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Apply on every change
  useEffect(() => {
    applyCustomization(settings);
  }, [settings]);

  // Load settings when user changes
  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("user_settings")
        .select("font, background, theme, accent_color")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (data) {
        setSettings(sanitize(data));
      } else {
        // Create default row
        await supabase.from("user_settings").insert({
          user_id: user.id,
          ...DEFAULT_SETTINGS,
        });
        setSettings(DEFAULT_SETTINGS);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const update = useCallback(
    async (patch: Partial<AresSettings>) => {
      const next = { ...settings, ...patch };
      setSettings(next); // optimistic / instant
      if (!user) return;
      await supabase
        .from("user_settings")
        .upsert(
          { user_id: user.id, ...next },
          { onConflict: "user_id" },
        );
    },
    [settings, user],
  );

  const reset = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS);
    if (!user) return;
    await supabase
      .from("user_settings")
      .upsert(
        { user_id: user.id, ...DEFAULT_SETTINGS },
        { onConflict: "user_id" },
      );
  }, [user]);

  return (
    <SettingsContext.Provider value={{ settings, loading, update, reset }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useUserSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useUserSettings must be used within UserSettingsProvider");
  return ctx;
};
