// Integration-managed gate for authenticated routes.
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // ensure session exists before allowing access
    const { data } = await supabase.auth.getSession();
    const session = data?.session ?? null;
    if (!session || !session.user) {
      const next = typeof window !== "undefined" ? window.location.pathname + window.location.search : undefined;
      throw redirect({ to: "/auth", search: next ? ({ next } as any) : undefined });
    }
    return { user: session.user };
  },
  component: () => <Outlet />,
});
