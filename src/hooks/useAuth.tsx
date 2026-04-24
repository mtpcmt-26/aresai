import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  ageConfirmed: boolean;
  refreshAgeConfirmed: () => Promise<void>;
  confirmAge: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  const fetchAgeConfirmed = async (uid: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("age_confirmed_13_plus")
      .eq("user_id", uid)
      .maybeSingle();
    setAgeConfirmed(Boolean(data?.age_confirmed_13_plus));
  };

  useEffect(() => {
    // Set up listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // Defer to avoid deadlock
        setTimeout(() => fetchAgeConfirmed(newSession.user.id), 0);
      } else {
        setAgeConfirmed(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchAgeConfirmed(s.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshAgeConfirmed = async () => {
    if (user) await fetchAgeConfirmed(user.id);
  };

  const confirmAge = async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({
        age_confirmed_13_plus: true,
        age_confirmed_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
    setAgeConfirmed(true);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, ageConfirmed, refreshAgeConfirmed, confirmAge, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
