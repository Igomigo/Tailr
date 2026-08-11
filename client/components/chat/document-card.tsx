import { motion } from "motion/react";
import { ArrowDownToLine, FileText } from "lucide-react";
import { transition } from "@/lib/motion";

/**
 * The download card shown when a resume has been generated.
 *
 * This is the payoff of the whole conversation, so it is the one surface that
 * carries the accent colour as a fill rather than a detail.
 */
export function DocumentCard({ url }: { url: string }) {
  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...transition.base, delay: 0.1 }}
      className="
        group mt-4 flex items-center gap-3.5
        rounded-[var(--radius-lg)] border border-white/12
        bg-white/[0.04] p-4
        transition-[background-color,border-color] duration-200
        hover:border-white/20 hover:bg-white/[0.07]
      "
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent-quiet)] text-[var(--color-accent)]">
        <FileText size={19} strokeWidth={1.75} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-small font-medium text-ink">
          Your resume is ready
        </span>
        <span className="block text-micro text-ink-faint">
          PDF, ready to send
        </span>
      </span>

      <span className="shrink-0 text-ink-faint transition-[color,transform] duration-200 group-hover:translate-y-0.5 group-hover:text-ink">
        <ArrowDownToLine size={17} strokeWidth={1.75} />
      </span>
    </motion.a>
  );
}
