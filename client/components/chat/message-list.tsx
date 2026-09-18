"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowDown } from "lucide-react";
import { GlassSurface } from "@/components/ui/glass-surface";
import { UserMessage } from "./user-message";
import { AssistantMessage } from "./assistant-message";
import { ThinkingIndicator } from "./thinking-indicator";
import { useTypewriter } from "@/hooks/use-typewriter";
import type { ChatStatus } from "@/hooks/use-chat";
import type { ChatMessage } from "@/lib/types";

interface MessageListProps {
  messages: ChatMessage[];
  streamingText: string;
  status: ChatStatus;
}

/** Distance from the bottom within which autoscroll stays engaged. */
const STICK_THRESHOLD_PX = 120;

/**
 * The scrolling conversation.
 *
 * Follows new content only while the user is already near the bottom, so
 * scrolling up to reread an earlier draft is not fought by autoscroll.
 */
export function MessageList({
  messages,
  streamingText,
  status,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const reducedMotion = useReducedMotion();

  const visibleText = useTypewriter(streamingText);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !stickToBottom.current) return;
    container.scrollTop = container.scrollHeight;
  }, [messages, visibleText, status]);

  const handleScroll = (): void => {
    const container = containerRef.current;
    if (!container) return;
    const distance =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const nearBottom = distance < STICK_THRESHOLD_PX;
    stickToBottom.current = nearBottom;
    setShowJumpToBottom(!nearBottom);
  };

  const scrollToBottom = (): void => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  };

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={containerRef}
        data-chat-scroll
        onScroll={handleScroll}
        className="h-full overflow-y-auto overscroll-contain"
      >
        <div className="mx-auto flex w-full max-w-[46rem] flex-col gap-7 px-5 pb-10 pt-8 sm:px-6">
          {messages.map((message) =>
            message.role === "user" ? (
              <UserMessage
                key={message.clientMessageId ?? message._id}
                content={message.content ?? ""}
                attachments={message.attachments}
              />
            ) : (
              <AssistantMessage
                key={message._id}
                content={message.content ?? ""}
                documentUrl={message.documentUrl}
              />
            ),
          )}

          {/* Gated on status rather than on the text itself: when the reply is
              persisted, status leaves "streaming" in the same render that adds
              the message, so the two can never appear at once. */}
          {status === "streaming" && visibleText && (
            <AssistantMessage content={visibleText} streaming />
          )}

          <AnimatePresence>
            {(status === "thinking" || status === "generating") && (
              <ThinkingIndicator status={status} />
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showJumpToBottom && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: reducedMotion ? 0 : 0.18 }}
            className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center"
          >
            <GlassSurface
              variant="clear"
              className="pointer-events-auto rounded-full"
            >
              <motion.button
                type="button"
                aria-label="Scroll to latest message"
                title="Scroll to latest message"
                onClick={scrollToBottom}
                initial={{ scale: 0.92 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.94 }}
                whileTap={{ scale: reducedMotion ? 1 : 0.95 }}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-white transition-colors duration-150 hover:bg-white/[0.08]"
              >
                <ArrowDown size={18} strokeWidth={2} aria-hidden="true" />
              </motion.button>
            </GlassSurface>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
