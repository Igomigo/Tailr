"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

/**
 * A labelled text input with inline validation messaging.
 *
 * Password fields gain a reveal toggle, since typing a long password blind is
 * the most common reason a sign-in attempt fails.
 */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, id, type = "text", ...props },
  ref,
) {
  const [revealed, setRevealed] = useState(false);

  const inputId = id ?? `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const isPassword = type === "password";
  const inputType = isPassword && revealed ? "text" : type;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-small text-ink-muted">
        {label}
      </label>

      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={inputType}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`
            w-full rounded-[var(--radius-md)]
            border border-white/12 bg-white/[0.04]
            py-2.5 pl-3.5 text-body text-ink
            transition-[border-color,background-color] duration-200
            placeholder:text-ink-faint
            focus:border-white/25 focus:bg-white/[0.06] focus:outline-none
            aria-[invalid=true]:border-[var(--color-danger)]/50
            disabled:opacity-50
            ${isPassword ? "pr-11" : "pr-3.5"}
          `}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            // Excluded from the tab order so it never sits between the password
            // field and the submit button.
            tabIndex={-1}
            aria-label={revealed ? "Hide password" : "Show password"}
            onClick={() => setRevealed(!revealed)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-faint transition-colors duration-150 hover:text-ink"
          >
            {revealed ? (
              <EyeOff size={16} strokeWidth={1.75} />
            ) : (
              <Eye size={16} strokeWidth={1.75} />
            )}
          </button>
        )}
      </div>

      {error && (
        <p
          id={`${inputId}-error`}
          className="text-micro text-[var(--color-danger)]"
        >
          {error}
        </p>
      )}
    </div>
  );
});
