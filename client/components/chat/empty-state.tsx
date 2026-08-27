import { motion } from "motion/react";
import { MessageInput } from "@/components/message-input";
import { TemplateGallery } from "@/components/template-gallery";
import { ErrorNotice } from "./error-notice";
import { rise, stagger } from "@/lib/motion";

/**
 * The starting view of a new conversation.
 *
 * The input sits centred here and moves to the foot of the screen once the
 * first message is sent. Because both positions render the same component with
 * the same layout id, that move is a single continuous motion rather than a
 * swap.
 */
export function EmptyState({
  onSubmit,
  error,
  onRetry,
}: {
  onSubmit: (message: string, files: File[]) => void;
  error?: string | null;
  onRetry?: () => void;
}) {
  return (
    <motion.div
      variants={stagger(0.07)}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      className="mx-auto flex w-full max-w-[44rem] flex-1 flex-col justify-center px-5 pb-10 sm:px-6"
    >
      <motion.h1
        variants={rise}
        className="text-center text-[2rem] font-medium leading-tight tracking-[-0.02em] text-ink sm:text-display"
      >
        Let’s tailor your resume.
      </motion.h1>

      <motion.p
        variants={rise}
        className="mx-auto mt-3.5 max-w-md text-center text-ink-muted"
      >
        Paste the job description. Attach your current resume if you have one.
      </motion.p>

      <motion.div variants={rise} className="mt-8">
        <MessageInput
          autoFocus
          onSubmit={onSubmit}
          narrowPlaceholder="Paste a job description…"
        />
        {error && (
          <div className="mt-3">
            <ErrorNotice message={error} onRetry={onRetry} />
          </div>
        )}
      </motion.div>

      <motion.div variants={rise} className="mt-14">
        <TemplateGallery />
      </motion.div>
    </motion.div>
  );
}
