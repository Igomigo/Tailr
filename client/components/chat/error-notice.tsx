import { motion } from "motion/react";
import { AlertCircle, RotateCw } from "lucide-react";
import { transition } from "@/lib/motion";

interface ErrorNoticeProps {
  message: string;
  onRetry?: () => void;
}

/**
 * A failed turn, shown in place of the reply that did not arrive.
 *
 * Sits in the conversation rather than in a toast, so it stays visible while
 * the user reads it and is clearly attached to the message that failed. It is
 * not persisted: refreshing clears it.
 */
export function ErrorNotice({ message, onRetry }: ErrorNoticeProps) {
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition.base}
      className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-danger)]/25 bg-[var(--color-danger)]/[0.07] px-4 py-3.5"
    >
      <AlertCircle
        size={17}
        strokeWidth={1.75}
        className="mt-0.5 shrink-0 text-[var(--color-danger)]"
      />

      <div className="min-w-0 flex-1">
        <p className="text-small text-ink">{message}</p>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 flex items-center gap-1.5 text-micro text-ink-muted transition-colors duration-150 hover:text-ink"
          >
            <RotateCw size={12} strokeWidth={2} />
            Try again
          </button>
        )}
      </div>
    </motion.div>
  );
}
