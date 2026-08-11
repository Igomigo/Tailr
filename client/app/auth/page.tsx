"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { Logo } from "@/components/logo";
import { useAuth } from "@/hooks/use-auth";

/** Redirects anyone already signed in, so the form is never shown needlessly. */
function AuthScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading } = useAuth();

  const mode = params.get("mode") === "signup" ? "signup" : "login";

  useEffect(() => {
    if (!loading && user) router.replace("/chat");
  }, [loading, user, router]);

  return (
    <main className="relative flex min-h-dvh flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-144 opacity-[0.055]"
        style={{
          background:
            "radial-gradient(60rem 26rem at 50% -6rem, var(--color-accent), transparent 70%)",
        }}
      />

      <header className="relative z-10 px-6 py-5 sm:px-8">
        <Logo />
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center px-5 pb-20">
        <AuthForm initialMode={mode} />
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthScreen />
    </Suspense>
  );
}
