import { motion } from "motion/react";
import { Info } from "lucide-react";
import { transition } from "@/lib/motion";

/**
 * A neutral note about how the assistant handled something.
 *
 * Distinct from an error: nothing went wrong, but the user should know what
 * happened so they can act on it if it matters to them.
 */
export function Notice({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition.base}
      className="flex items-start gap-3 rounded-[var(--radius-md)] border border-white/10 bg-white/[0.04] px-4 py-3"
    >
      <Info
        size={16}
        strokeWidth={1.75}
        className="mt-0.5 shrink-0 text-ink-faint"
      />
      <p className="text-small text-ink-muted">{message}</p>
    </motion.div>
  );
}
