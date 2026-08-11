import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
  loading?: boolean;
  children: ReactNode;
}

const VARIANTS = {
  primary:
    "bg-[var(--color-accent)] text-[#1a1205] hover:bg-[var(--color-accent-hover)]",
  ghost: "border border-white/12 text-ink hover:border-white/25 hover:bg-white/[0.05]",
} as const;

/** A button, with a spinner that replaces its label while an action runs. */
export function Button({
  variant = "primary",
  loading = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        flex items-center justify-center gap-2
        rounded-full px-5 py-2.5
        text-small font-medium
        transition-[background-color,border-color,transform,opacity] duration-150
        active:scale-[0.98]
        disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100
        ${VARIANTS[variant]} ${className}
      `}
      {...props}
    >
      {loading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}
