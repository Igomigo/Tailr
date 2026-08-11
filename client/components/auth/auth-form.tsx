"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { transition } from "@/lib/motion";

type Mode = "login" | "signup";

const COPY = {
  login: {
    heading: "Welcome back",
    subheading: "Sign in to pick up where you left off.",
    action: "Sign in",
    switchPrompt: "New here?",
    switchAction: "Create an account",
  },
  signup: {
    heading: "Create your account",
    subheading: "It takes a moment, and your resumes are saved for next time.",
    action: "Create account",
    switchPrompt: "Already have an account?",
    switchAction: "Sign in",
  },
} as const;

/**
 * Sign in and sign up.
 *
 * One form for both, since they differ only by a name field: switching modes
 * keeps whatever has already been typed rather than resetting the form.
 */
export function AuthForm({ initialMode = "login" }: { initialMode?: Mode }) {
  const router = useRouter();
  const { login, signup } = useAuth();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const copy = COPY[mode];

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === "signup") {
        await signup(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      router.replace("/chat");
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition.base}
      className="w-full max-w-sm"
    >
      <h1 className="text-title font-semibold text-ink">{copy.heading}</h1>
      <p className="mt-1.5 text-small text-ink-muted">{copy.subheading}</p>

      <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
        {mode === "signup" && (
          <Field
            label="Name"
            type="text"
            autoComplete="name"
            placeholder="Alex Morgan"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        )}

        <Field
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <Field
          label="Password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder={mode === "signup" ? "At least 8 characters" : ""}
          required
          minLength={mode === "signup" ? 8 : undefined}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error && (
          <p role="alert" className="text-small text-[var(--color-danger)]">
            {error}
          </p>
        )}

        <Button type="submit" loading={submitting} className="mt-1 w-full">
          {copy.action}
        </Button>
      </form>

      <p className="mt-6 text-center text-small text-ink-muted">
        {copy.switchPrompt}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
          }}
          className="text-ink underline underline-offset-2 transition-opacity hover:opacity-70"
        >
          {copy.switchAction}
        </button>
      </p>
    </motion.div>
  );
}
