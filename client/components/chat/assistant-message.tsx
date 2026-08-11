import { motion } from "motion/react";
import { Markdown } from "./markdown";
import { DocumentCard } from "./document-card";
import { transition } from "@/lib/motion";

interface AssistantMessageProps {
  content: string;
  documentUrl?: string | null;
  /** Draws a cursor after the text while the reply is still arriving. */
  streaming?: boolean;
}

/**
 * A reply from the assistant.
 *
 * Rendered plainly on the canvas rather than in a bubble: these replies are
 * often full resume drafts, and a bubble would box in content that needs room
 * to read as a document.
 */
export function AssistantMessage({
  content,
  documentUrl,
  streaming = false,
}: AssistantMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition.base}
      className="max-w-none"
    >
      <div className="relative">
        <Markdown>{content}</Markdown>
        {streaming && (
          <span
            aria-hidden
            className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.18em] animate-pulse bg-[var(--color-accent)]"
          />
        )}
      </div>

      {documentUrl && <DocumentCard url={documentUrl} />}
    </motion.div>
  );
}
