import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "@tanstack/react-router";

type AppRole = "citizen" | "authority" | "admin";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  isAuthority: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Helper to sync roles
    const syncRoles = (userId: string | undefined) => {
      if (!userId) {
        setRoles([]);
        return;
      }
      void (async () => {
        try {
          const { data } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId);
          if (mounted) setRoles((data ?? []).map((r) => r.role as AppRole));
        } catch {
          if (mounted) setRoles([]);
        }
      })();
    };

    // Listen for auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      syncRoles(newSession?.user?.id);
      setLoading(false);

      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        try {
          router.invalidate();
        } catch (e) {
          /* ignore */
        }
      }
    });

    // Initial session fetch
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        const currentSession = data?.session ?? null;
        setSession(currentSession);
        syncRoles(currentSession?.user?.id);
      })
      .catch(() => {
        if (mounted) setSession(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      try {
        sub.subscription.unsubscribe();
      } catch (e) {
        /* ignore */
      }
    };
  }, [router]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setSession(null);
      setRoles([]);
      try {
        router.navigate({ to: "/" });
      } catch (e) {
        /* ignore */
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        roles,
        loading,
        signOut,
        isAuthority: roles.includes("authority") || roles.includes("admin"),
        isAdmin: roles.includes("admin"),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
