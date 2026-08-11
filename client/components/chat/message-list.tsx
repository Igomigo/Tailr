"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence } from "motion/react";
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
    stickToBottom.current = distance < STICK_THRESHOLD_PX;
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto overscroll-contain"
    >
      <div className="mx-auto flex w-full max-w-[46rem] flex-col gap-7 px-5 pb-10 pt-8 sm:px-6">
        {messages.map((message) =>
          message.role === "user" ? (
            <UserMessage key={message._id} content={message.content ?? ""} />
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
  );
}
