"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

/**
 * Gates a page behind a session.
 *
 * The check runs in the browser because the session cookie belongs to the API's
 * origin, so the Next server cannot read it. Nothing is rendered until the
 * check resolves, which also avoids briefly showing a signed-out view.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="min-h-dvh bg-[var(--color-canvas)]" />;
  }

  return <>{children}</>;
}
