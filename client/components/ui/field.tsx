import { forwardRef, type InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

/** A labelled text input with inline validation messaging. */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, id, ...props },
  ref,
) {
  const inputId = id ?? `field-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-small text-ink-muted">
        {label}
      </label>

      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className="
          w-full rounded-[var(--radius-md)]
          border border-white/12 bg-white/[0.04]
          px-3.5 py-2.5 text-body text-ink
          transition-[border-color,background-color] duration-200
          placeholder:text-ink-faint
          focus:border-white/25 focus:bg-white/[0.06] focus:outline-none
          aria-[invalid=true]:border-[var(--color-danger)]/50
          disabled:opacity-50
        "
        {...props}
      />

      {error && (
        <p id={`${inputId}-error`} className="text-micro text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
});
