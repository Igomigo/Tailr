import { motion } from "motion/react";
import { transition } from "@/lib/motion";

/**
 * A message from the user.
 *
 * Given a bubble and aligned right, in contrast to assistant replies which sit
 * plainly on the canvas. The asymmetry keeps long resume drafts readable while
 * still marking the user's turns clearly.
 */
export function UserMessage({ content }: { content: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition.base}
      className="flex justify-end"
    >
      <div className="max-w-[85%] rounded-[20px] rounded-br-lg bg-white/[0.07] px-4 py-3 text-body text-ink sm:max-w-[75%]">
        <p className="whitespace-pre-wrap break-words">{content}</p>
      </div>
    </motion.div>
  );
}
