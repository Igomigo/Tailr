"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar/sidebar";
import { MessageList } from "./message-list";
import { EmptyState } from "./empty-state";
import { MessageInput } from "@/components/message-input";
import { Logo } from "@/components/logo";
import { useChat } from "@/hooks/use-chat";
import { useSessions } from "@/hooks/use-sessions";
import { transition } from "@/lib/motion";

/**
 * The chat screen.
 *
 * A conversation with no messages shows the input centred; sending the first
 * message moves it to the foot of the screen and reveals the transcript above.
 */
export function ChatView({ chatId }: { chatId?: string }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const { sessions, refresh } = useSessions();

  const { messages, streamingText, status, error, send } = useChat({
    chatId,
    onSessionCreated: (id) => {
      // Replace rather than push, so Back returns to where the user came from
      // instead of an empty conversation they already left.
      router.replace(`/chat/${id}`);
      void refresh();
    },
  });

  const started = messages.length > 0;
  const busy = status !== "idle";

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--color-canvas)]">
      <Sidebar
        sessions={sessions}
        activeId={chatId}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <main className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 px-4 md:hidden">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            className="rounded-[var(--radius-sm)] p-2 text-ink-muted transition-colors hover:bg-white/[0.06] hover:text-ink"
          >
            <Menu size={19} strokeWidth={1.75} />
          </button>
          <Logo href="/chat" />
        </header>

        <AnimatePresence mode="wait" initial={false}>
          {started ? (
            <motion.div
              key="conversation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={transition.base}
              className="flex min-h-0 flex-1 flex-col"
            >
              <MessageList
                messages={messages}
                streamingText={streamingText}
                status={status}
              />

              <div className="shrink-0 px-5 pb-5 sm:px-6">
                <div className="mx-auto w-full max-w-[46rem]">
                  <MessageInput
                    onSubmit={send}
                    disabled={busy}
                    placeholder="Reply, or ask for a change…"
                  />
                  {error && (
                    <p className="mt-2.5 text-center text-micro text-[var(--color-danger)]">
                      {error}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <EmptyState key="empty" onSubmit={send} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
