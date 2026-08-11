import { motion } from "motion/react";
import type { ChatStatus } from "@/hooks/use-chat";

/** Generating a PDF takes several seconds, so it is named rather than implied. */
const LABELS: Partial<Record<ChatStatus, string>> = {
  generating: "Building your resume",
};

/**
 * Shown while the assistant is working.
 *
 * The dots pulse in opacity rather than bouncing: bouncing reads as a toy,
 * while a slow fade reads as something thinking.
 */
export function ThinkingIndicator({ status }: { status: ChatStatus }) {
  const label = LABELS[status];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-2.5"
    >
      <span className="flex items-center gap-1">
        {[0, 1, 2].map((index) => (
          <motion.span
            key={index}
            className="h-1.5 w-1.5 rounded-full bg-ink-faint"
            animate={{ opacity: [0.25, 1, 0.25] }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.18,
            }}
          />
        ))}
      </span>

      {label && <span className="text-small text-ink-faint">{label}</span>}
    </motion.div>
  );
}
