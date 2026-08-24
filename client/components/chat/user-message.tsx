"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { AttachmentChip } from "./attachment-chip";
import { transition } from "@/lib/motion";
import type { Attachment } from "@/lib/types";

interface UserMessageProps {
  content: string;
  attachments?: Attachment[];
}

/**
 * Characters shown before a message is collapsed.
 *
 * Pasted job descriptions run to thousands of characters, and showing one in
 * full pushes the assistant's reply off the screen.
 */
const COLLAPSE_THRESHOLD = 480;

/** Lines shown while collapsed, whichever limit is reached first. */
const COLLAPSED_LINE_CLAMP = 8;

/**
 * A message from the user.
 *
 * Given a bubble and aligned right, in contrast to assistant replies which sit
 * plainly on the canvas. The asymmetry keeps long resume drafts readable while
 * still marking the user's turns clearly.
 */
export function UserMessage({ content, attachments }: UserMessageProps) {
  const [expanded, setExpanded] = useState(false);

  const trimmed = content.trim();
  const isLong = trimmed.length > COLLAPSE_THRESHOLD;
  const collapsed = isLong && !expanded;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition.base}
      className="flex justify-end"
    >
      <div className="flex max-w-[85%] flex-col items-end gap-2 sm:max-w-[75%]">
        {Boolean(attachments?.length) && (
          <div className="flex flex-col gap-2">
            {attachments!.map((attachment) => (
              <AttachmentChip key={attachment.fileId} attachment={attachment} />
            ))}
          </div>
        )}

        {/* A file may be sent with no message, in which case there is no
            bubble to draw. */}
        {trimmed && (
          <div className="rounded-[20px] rounded-br-lg bg-white/[0.07] px-4 py-3 text-body text-ink">
            <p
              className="whitespace-pre-wrap break-words"
              style={
                collapsed
                  ? {
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: COLLAPSED_LINE_CLAMP,
                      overflow: "hidden",
                    }
                  : undefined
              }
            >
              {trimmed}
            </p>

            {isLong && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="mt-1.5 text-micro text-ink-faint transition-colors duration-150 hover:text-ink"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
